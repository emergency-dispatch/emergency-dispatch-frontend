import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/apiClient';
import { dispatchService } from '../services/dispatchService';
import type { DispatchAlgorithm, DispatchSuggestion } from '../types/vehicle';
import i18n from '../i18n';

const BACKEND_ALGORITHM = { nearest: 'NearestAvailable', load_aware: 'LoadAware' } as const;

/**
 * Gợi ý xe cho một sự cố (FR-OP-04, `GET /dispatch/recommend`). Dùng chung cho Live Map và bước "Điều xe"
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
            candidates: res.data.map((u) => ({
              vehicleId: u.rescueUnitId,
              // Quãng đường đường bộ (OSRM); thiếu thì dùng đường chim bay và coi là ước lượng.
              km: u.roadDistanceKm ?? u.distanceKm,
              etaMinutes: Math.max(1, Math.round(u.estimatedEtaMinutes)),
              cost: u.cost,
              stationLoad: u.stationLoad,
              isApproximate: !!u.isApproximate || u.roadDistanceKm == null,
              isSupportUnit: !!u.isSupportUnit,
              stationName: u.stationName,
            })),
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
