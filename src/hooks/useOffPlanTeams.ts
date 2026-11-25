import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/apiClient';
import i18n from '../i18n';
import { loadTypeCandidates } from './useDispatchRecommendations';
import type { DispatchAlgorithm, DispatchTeamCandidate } from '../types/vehicle';

/**
 * Tổ trạm mình đủ điều kiện cho các chức năng NGOÀI kế hoạch (`unitTypes`), kèm khoảng cách / ETA do backend tính.
 * Chỉ tải khi Operator mở mục này.
 */
export function useOffPlanTeams(
  incidentId: string | null,
  enabled: boolean,
  algorithm: DispatchAlgorithm,
  unitTypes: readonly string[],
  stationId: string | null,
  refreshKey: string
) {
  const [state, setState] = useState<{ key: string; teams: DispatchTeamCandidate[]; loading: boolean; error: string | null }>({
    key: '',
    teams: [],
    loading: false,
    error: null,
  });
  const typesKey = [...unitTypes].sort().join(',');
  const key = `${incidentId}|${algorithm}|${typesKey}`;

  useEffect(() => {
    if (!enabled || !incidentId || !typesKey) return;
    let cancelled = false;
    // Đổi ca / cách xếp hạng → bỏ danh sách cũ; chỉ làm mới thì giữ lại trong lúc tải.
    setState((prev) => ({ key, teams: prev.key === key ? prev.teams : [], loading: true, error: null }));
    loadTypeCandidates(incidentId, algorithm, typesKey.split(','), stationId)
      .then((teams) => {
        if (!cancelled) setState({ key, teams, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            key,
            teams: [],
            loading: false,
            error: getApiErrorMessage(err, i18n.t('liveMap.recommend.loadFailed')),
          });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, incidentId, algorithm, typesKey, stationId, refreshKey, key]);

  return state.key === key ? state : { ...state, teams: [] };
}
