import { SEVERITY_LEVEL_META } from '../../../data/incidentMock';
import type { BackendIncidentStatus, BackendSeverityLevel } from '../../../types/incident';
import type { EscalationNotifyRole, EscalationSeverity } from '../../../types/escalation';

const LEVEL_NUMBER: Record<EscalationSeverity, 1 | 2 | 3> = { Level1: 1, Level2: 2, Level3: 3 };

/** Nhãn + màu cấp độ, dùng lại thang Cấp 1–3 của Operator. */
export const escalationSeverityMeta = (level: EscalationSeverity) => SEVERITY_LEVEL_META[LEVEL_NUMBER[level]];

/** Nhãn ngắn của cấp sự cố trong nhật ký (backend có thể còn dữ liệu Unclassified/Level4–5 cũ). */
export function severityLabel(level: BackendSeverityLevel): string {
  if (level === 'Unclassified') return 'Chưa phân loại';
  const n = Number(level.replace('Level', ''));
  return `Cấp ${Math.min(n, 3)}`;
}

export const NOTIFY_ROLE_LABEL: Record<EscalationNotifyRole, string> = {
  Operator: 'Điều phối viên',
  Admin: 'Quản trị viên',
  RescueStaff: 'Đội cứu hộ',
};

export const INCIDENT_STATUS_LABEL: Record<BackendIncidentStatus, string> = {
  Pending: 'Chờ xử lý',
  AiProcessing: 'AI đang phân tích',
  AiProcessed: 'Chờ thẩm định',
  Verified: 'Đã duyệt',
  Dispatched: 'Đã điều xe',
  InProgress: 'Đang xử lý',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
  Escalated: 'Leo thang',
};
