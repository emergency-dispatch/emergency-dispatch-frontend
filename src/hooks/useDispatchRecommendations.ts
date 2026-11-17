import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/apiClient';
import { dispatchService } from '../services/dispatchService';
import type { RecommendedUnitResponseDto } from '../types/dispatch';
import type { DispatchAlgorithm, DispatchCandidate, DispatchSuggestion, DispatchTeamCandidate } from '../types/vehicle';
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

/**
 * Gợi ý tổ cho một sự cố (FR-OP-04, `GET /dispatch/recommend`). Dùng chung cho Live Map và bước "Điều xe"
 * của Hàng đợi. `refreshKey` đổi (VD xe vừa được giao, sự cố vừa leo thang) → tải lại gợi ý.
 */
export function useDispatchRecommendations(
  incidentId: string | null,
  enabled: boolean,
  algorithm: DispatchAlgorithm,
  refreshKey: string
) {
  const [state, setState] = useState<{ suggestion: DispatchSuggestion | null; loading: boolean; error: string | null }>({
    suggestion: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled || !incidentId) {
      setState({ suggestion: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    dispatchService
      .getRecommendations(incidentId, BACKEND_ALGORITHM[algorithm])
      .then((res) => {
        if (cancelled) return;
        if (!res.success) throw new Error(res.message);
        const first = res.data[0];
        setState({
          loading: false,
          error: null,
          suggestion: {
            radiusKm: first?.searchRadiusKm ?? 0,
            expanded: first?.radiusExpanded ?? false,
            teams: groupByTeam(res.data),
          },
        });
      })
      .catch((err) => {
        if (!cancelled)
          setState({ suggestion: null, loading: false, error: getApiErrorMessage(err, i18n.t('liveMap.recommend.loadFailed')) });
      });
    return () => {
      cancelled = true;
    };
  }, [incidentId, enabled, algorithm, refreshKey]);

  return state;
}
