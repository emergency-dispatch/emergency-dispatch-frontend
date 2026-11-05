import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/apiClient';
import { incidentService } from '../services/incidentService';
import type { IncidentSupplementDto } from '../types/incident';
import i18n from '../i18n';

interface SupplementsState {
  /** Sự cố mà `items` thuộc về — đổi sự cố thì không hiện nhầm danh sách cũ trong lúc tải. */
  forId: string | null;
  /** Lượt tải đã xong (sự cố + version + lần bấm thử lại); khác khóa hiện tại = đang tải. */
  forKey: string | null;
  items: IncidentSupplementDto[];
  error: string | null;
}

/**
 * §21.4: thông tin người báo bổ sung của một sự cố (kể cả từ báo cáo đã gom), mới nhất trước.
 * `version` đổi (ReceiveIncidentSupplement — `supplementVersions` của store) → tải lại.
 */
export function useIncidentSupplements(incidentId: string | null, version = 0) {
  const [state, setState] = useState<SupplementsState>({ forId: null, forKey: null, items: [], error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const key = incidentId ? `${incidentId}|${version}|${reloadKey}` : null;

  useEffect(() => {
    if (!incidentId || !key) return;
    let cancelled = false;
    incidentService
      .getSupplements(incidentId)
      .then((items) => {
        if (cancelled) return;
        const newestFirst = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setState({ forId: incidentId, forKey: key, items: newestFirst, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          forId: incidentId,
          forKey: key,
          items: [],
          error: getApiErrorMessage(err, i18n.t('incidents.supplements.loadFailed')),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [incidentId, key]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const sameIncident = !!incidentId && state.forId === incidentId;
  const loading = !!key && state.forKey !== key;

  return {
    // Đang tải lại cùng sự cố → giữ danh sách cũ cho khỏi nháy.
    items: sameIncident ? state.items : [],
    loading,
    error: sameIncident && !loading ? state.error : null,
    reload,
  };
}
