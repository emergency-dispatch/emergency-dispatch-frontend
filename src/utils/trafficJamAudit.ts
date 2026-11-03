import type { TrafficJamDecision } from '../types/incident';

/**
 * Backend ghi thẩm định ùn tắc (PUT /incidents/{id}/traffic-jam-status) bằng AuditAction.StatusChanged, quyết định nằm
 * trong newStateJson.trafficJamStatus → tách ra để hiện "Xác nhận / Bác bỏ ùn tắc" thay vì "Đổi trạng thái".
 * Không phải bản ghi thẩm định ùn tắc → null.
 */
export function trafficJamAuditDecision(action: string, newStateJson: string | null | undefined): TrafficJamDecision | null {
  if (action !== 'StatusChanged' || !newStateJson) return null;
  try {
    const state: unknown = JSON.parse(newStateJson);
    const status = state && typeof state === 'object' ? (state as { trafficJamStatus?: unknown }).trafficJamStatus : null;
    return status === 'Confirmed' || status === 'Dismissed' ? status : null;
  } catch {
    return null;
  }
}
