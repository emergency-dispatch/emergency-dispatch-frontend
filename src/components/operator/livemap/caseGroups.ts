import type { Incident } from '../../../types/incident';

export type CaseGroup = 'attention' | 'active' | 'completed';

/** Lý do một ca cần Operator xử lý ngay (thứ tự = mức ưu tiên hiển thị). */
export type AttentionReason =
  | { kind: 'rejected'; plate: string; timeout: boolean }
  | { kind: 'field_request'; count: number }
  | { kind: 'no_vehicle' }
  | { kind: 'escalated' };

interface CaseContext {
  escalatedIds: Set<string>;
  /** Số yêu cầu hiện trường đang mở theo sự cố. */
  fieldRequestCounts: Map<string, number>;
}

/**
 * Live Map chỉ còn việc sau khi giao xe lần đầu (giao xe lần đầu đã ở Hàng đợi) → danh sách xếp theo việc cần làm:
 * đội từ chối / không phản hồi, đội xin chi viện, đã duyệt mà chưa có xe ("Để sau" / giao lỗi), leo thang.
 */
export function getAttentionReason(incident: Incident, ctx: CaseContext): AttentionReason | null {
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

export function getCaseGroup(incident: Incident, ctx: CaseContext): CaseGroup {
  if (incident.status === 'completed') return 'completed';
  return getAttentionReason(incident, ctx) ? 'attention' : 'active';
}

export function countAttentionCases(incidents: Incident[], ctx: CaseContext): number {
  return incidents.filter((i) => getAttentionReason(i, ctx) !== null).length;
}
