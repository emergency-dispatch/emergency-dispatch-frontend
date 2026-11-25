import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/apiClient';
import { dispatchService } from '../services/dispatchService';
import type { RecommendedUnitResponseDto } from '../types/dispatch';
import type {
  DispatchAlgorithm,
  DispatchCandidate,
  DispatchFarTeam,
  DispatchShortage,
  DispatchSuggestion,
  DispatchTeamCandidate,
} from '../types/vehicle';
import i18n from '../i18n';

const BACKEND_ALGORITHM = { nearest: 'NearestAvailable', load_aware: 'LoadAware' } as const;

const toCandidate = (u: RecommendedUnitResponseDto): DispatchCandidate => ({
  teamId: u.stationTeamId,
  unitType: u.unitType,
  vehicleId: u.rescueUnitId,
  plate: u.plateNumber,
  lat: u.currentLat,
  lng: u.currentLng,
  stationId: u.stationId,
  // Quãng đường đường bộ (OSRM); thiếu thì dùng đường chim bay và coi là ước lượng.
  km: u.roadDistanceKm ?? u.distanceKm,
  etaMinutes: Math.max(1, Math.round(u.estimatedEtaMinutes)),
  cost: u.cost,
  stationLoad: u.stationLoad,
  isApproximate: !!u.isApproximate || u.roadDistanceKm == null,
  isSupportUnit: !!u.isSupportUnit,
  stationName: u.stationName,
});

/**
 * §34: backend trả mỗi dòng = (tổ, chức năng). Gom theo tổ, giữ thứ tự xếp hạng (tổ đứng ở vị trí dòng tốt nhất
 * của nó); một chức năng chỉ giữ dòng đầu tiên.
 */
function groupByTeam(rows: RecommendedUnitResponseDto[]): DispatchTeamCandidate[] {
  const teams = new Map<string, DispatchTeamCandidate>();
  for (const row of rows) {
    const candidate = toCandidate(row);
    const team = teams.get(row.stationTeamId);
    if (!team) {
      teams.set(row.stationTeamId, {
        teamId: row.stationTeamId,
        teamName: row.stationTeamName,
        staffCount: row.teamStaffCount,
        stationName: row.stationName,
        isSupportUnit: !!row.isSupportUnit,
        options: [candidate],
      });
    } else if (!team.options.some((o) => o.unitType === candidate.unitType)) {
      team.options.push(candidate);
    }
  }
  return [...teams.values()];
}

/** Bán kính dò các tổ đủ điều kiện nhưng ở xa (chỉ để báo Operator, không dùng để giao). */
const FAR_PROBE_KM = 500;

const toFarTeam = (u: RecommendedUnitResponseDto): DispatchFarTeam => ({
  teamId: u.stationTeamId,
  teamName: u.stationTeamName,
  stationName: u.stationName,
  unitType: u.unitType,
  vehicleId: u.rescueUnitId,
  plate: u.plateNumber,
  km: u.distanceKm,
});

/**
 * Backend dừng ở nấc bán kính đầu tiên có tổ, bất kể chức năng → chức năng khác ở nấc xa hơn bị bỏ sót. Nên: gọi
 * chung một lần, chức năng còn cần mà chưa có dòng nào thì gọi riêng (backend tự mở rộng bán kính cho chức năng đó,
 * giống AI tự điều phối). Vẫn thiếu → dò bán kính lớn để biết tổ nào đủ điều kiện nhưng ở quá xa.
 */
async function loadSuggestion(
  incidentId: string,
  algorithm: DispatchAlgorithm,
  neededTypes: readonly string[]
): Promise<DispatchSuggestion> {
  const fetchRows = async (options?: { unitType?: string; maxDistanceKm?: number }) => {
    const res = await dispatchService.getRecommendations(incidentId, BACKEND_ALGORITHM[algorithm], options);
    if (!res.success) throw new Error(res.message);
    return res;
  };

  const first = await fetchRows();
  const missing = neededTypes.filter((type) => !first.data.some((u) => u.unitType === type));
  const perType = await Promise.all(
    missing.map(async (unitType) => {
      try {
        const res = await fetchRows({ unitType });
        return { unitType, rows: res.data, message: res.message, failed: false };
      } catch (err) {
        // Lỗi một chức năng không được làm mất danh sách chung đã có.
        const message = getApiErrorMessage(err, i18n.t('liveMap.recommend.loadFailed'));
        return { unitType, rows: [], message, failed: true };
      }
    })
  );
  // Các dòng gọi riêng ở nấc bán kính xa hơn → xếp sau danh sách chung, gần trước.
  const extra = perType
    .flatMap((p) => p.rows)
    .sort((a, b) => a.searchRadiusKm - b.searchRadiusKm);
  const rows = [...first.data, ...extra];

  const lacking: Array<{ unitType: string | null; message: string; failed: boolean }> = perType
    .filter((p) => p.rows.length === 0)
    .map(({ unitType, message, failed }) => ({ unitType, message, failed }));
  if (rows.length === 0 && lacking.length === 0) lacking.push({ unitType: null, message: first.message, failed: false });

  const shortages = await Promise.all(
    lacking.map(async ({ unitType, message, failed }): Promise<DispatchShortage> => {
      // Chưa biết bán kính thường có tổ hay không → không được kết luận tổ nào "quá xa".
      if (failed) return { unitType, message, farTeams: null };
      // Phần dò chỉ để giải thích: lỗi thì bỏ qua, không làm hỏng danh sách gợi ý.
      const farTeams = await fetchRows({ unitType: unitType ?? undefined, maxDistanceKm: FAR_PROBE_KM })
        .then((res) => res.data.map(toFarTeam).sort((a, b) => a.km - b.km))
        .catch(() => null);
      return { unitType, message, farTeams };
    })
  );

  return {
    radiusKm: rows.reduce((max, u) => Math.max(max, u.searchRadiusKm), 0),
    expanded: rows.some((u) => u.radiusExpanded),
    teams: groupByTeam(rows),
    shortages,
  };
}

/** Tổ của một trạm đủ điều kiện theo từng chức năng chỉ định (backend tự mở rộng bán kính cho mỗi chức năng). */
export async function loadTypeCandidates(
  incidentId: string,
  algorithm: DispatchAlgorithm,
  unitTypes: readonly string[],
  stationId: string | null
): Promise<DispatchTeamCandidate[]> {
  const rows = await Promise.all(
    unitTypes.map(async (unitType) => {
      const res = await dispatchService.getRecommendations(incidentId, BACKEND_ALGORITHM[algorithm], { unitType });
      if (!res.success) throw new Error(res.message);
      return res.data;
    })
  );
  return groupByTeam(rows.flat().filter((u) => u.stationId === stationId));
}

/**
 * Gợi ý tổ cho một sự cố (FR-OP-04, `GET /dispatch/recommend`). `refreshKey` đổi (VD xe vừa được giao, sự cố vừa leo
 * thang, xe vừa Sẵn sàng trở lại) → tải lại gợi ý. `neededTypes` = các mã loại xe sự cố còn cần (kế hoạch điều xe).
 */
export function useDispatchRecommendations(
  incidentId: string | null,
  enabled: boolean,
  algorithm: DispatchAlgorithm,
  refreshKey: string,
  neededTypes: readonly string[] = []
) {
  const [state, setState] = useState<{
    incidentId: string | null;
    suggestion: DispatchSuggestion | null;
    loading: boolean;
    error: string | null;
  }>({ incidentId: null, suggestion: null, loading: false, error: null });
  const neededKey = neededTypes.join(',');

  useEffect(() => {
    if (!enabled || !incidentId) {
      setState({ incidentId: null, suggestion: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    // Đổi sang ca khác → bỏ danh sách của ca cũ; cùng ca thì giữ danh sách trong lúc tải lại.
    setState((prev) => ({
      incidentId,
      suggestion: prev.incidentId === incidentId ? prev.suggestion : null,
      loading: true,
      error: null,
    }));
    loadSuggestion(incidentId, algorithm, neededKey ? neededKey.split(',') : [])
      .then((suggestion) => {
        if (!cancelled) setState({ incidentId, loading: false, error: null, suggestion });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            incidentId,
            suggestion: null,
            loading: false,
            error: getApiErrorMessage(err, i18n.t('liveMap.recommend.loadFailed')),
          });
      });
    return () => {
      cancelled = true;
    };
  }, [incidentId, enabled, algorithm, refreshKey, neededKey]);

  return state;
}
