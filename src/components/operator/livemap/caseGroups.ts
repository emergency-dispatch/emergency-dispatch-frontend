import type { Incident } from '../../../types/incident';
import type { AutoDispatchVerdict, HandoverReason } from '../incidents/autoDispatchVerdict';

export type CaseGroup = 'attention' | 'active' | 'completed';

/** Lý do một ca cần Operator xử lý ngay (thứ tự = mức ưu tiên hiển thị). */
export type AttentionReason =
  /** Ca chờ người thẩm định; `handover` = vì sao AI chuyển (null = tự điều phối tắt / ca chuyển trạm). */
  | { kind: 'review'; handover: HandoverReason | null }
  | { kind: 'rejected'; plate: string; timeout: boolean }
  | { kind: 'field_request'; count: number }
  | { kind: 'no_vehicle' }
  | { kind: 'escalated' };

interface CaseContext {
  escalatedIds: Set<string>;
  /** Số yêu cầu hiện trường đang mở theo sự cố. */
  fieldRequestCounts: Map<string, number>;
  /** Giai đoạn AI của ca chờ duyệt (xem `usePendingTriage` / `autoDispatchVerdictAt`). */
  verdictOf: (incident: Incident) => AutoDispatchVerdict;
}

/**
 * Panel "Theo dõi ca" gồm mọi ca của trạm, xếp theo việc cần làm: ca AI chuyển cho người (thẩm định ở Hàng đợi), đội từ
 * chối / không phản hồi, đội xin chi viện, đã duyệt mà chưa có xe ("Để sau" / giao lỗi), leo thang.
 */
export function getAttentionReason(incident: Incident, ctx: CaseContext): AttentionReason | null {
  if (incident.status === 'pending') {
    const verdict = ctx.verdictOf(incident);
    if (verdict.phase === 'handover') return { kind: 'review', handover: verdict.reason };
    if (verdict.phase === 'manual') return { kind: 'review', handover: null };
    // AI đang làm thì để AI làm; đã có người giữ khóa thì AI sẽ bỏ qua ca này.
    return incident.lock ? { kind: 'review', handover: 'operatorHandling' } : null;
  }
  if (incident.status !== 'approved') return null;
  const notice = incident.responseNotices[0];
  if (notice) return { kind: 'rejected', plate: notice.plate, timeout: notice.kind !== 'rejected' };
  const requests = ctx.fieldRequestCounts.get(incident.id) ?? 0;
  if (requests > 0) return { kind: 'field_request', count: requests };
  const active = incident.assignedVehicleIds.length - incident.reportedVehicleIds.length;
  if (active <= 0 && incident.reportedVehicleIds.length === 0) return { kind: 'no_vehicle' };
  if (ctx.escalatedIds.has(incident.id)) return { kind: 'escalated' };
  return null;
}

/** `active` gồm cả ca AI đang phân tích / điều phối: thẻ không nhảy nhóm khi AI điều xong. */
export function getCaseGroup(incident: Incident, ctx: CaseContext): CaseGroup {
  if (incident.status === 'completed') return 'completed';
  return getAttentionReason(incident, ctx) ? 'attention' : 'active';
}

export function countAttentionCases(incidents: Incident[], ctx: CaseContext): number {
  return incidents.filter((i) => getAttentionReason(i, ctx) !== null).length;
}
