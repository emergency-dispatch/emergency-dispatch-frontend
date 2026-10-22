import { ClipboardList, EyeOff, Siren, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { AuditAction } from '../../../types/auditTrail';

// Nhóm chỉ để tô màu / gắn icon — backend lọc theo từng hành động, không theo nhóm.
type AuditGroup = 'incident' | 'dispatch' | 'escalation' | 'privacy';

const GROUP_META: Record<AuditGroup, { icon: LucideIcon; badgeClass: string }> = {
  incident: { icon: Siren, badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  dispatch: { icon: ClipboardList, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  escalation: { icon: TriangleAlert, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  privacy: { icon: EyeOff, badgeClass: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const ACTION_META: Record<AuditAction, { label: string; group: AuditGroup }> = {
  Created: { label: 'Tạo sự cố', group: 'incident' },
  AiAnalyzed: { label: 'AI phân tích', group: 'incident' },
  Verified: { label: 'Xác nhận kết quả AI', group: 'incident' },
  SeverityOverridden: { label: 'Ghi đè cấp độ AI', group: 'incident' },
  StatusChanged: { label: 'Đổi trạng thái', group: 'incident' },
  Cancelled: { label: 'Hủy sự cố', group: 'incident' },
  Completed: { label: 'Hoàn thành', group: 'incident' },
  Closed: { label: 'Đóng sự cố', group: 'incident' },
  Dispatched: { label: 'Điều xe', group: 'dispatch' },
  ReDispatched: { label: 'Điều xe lại', group: 'dispatch' },
  AssignmentAccepted: { label: 'Đội nhận nhiệm vụ', group: 'dispatch' },
  AssignmentRejected: { label: 'Đội từ chối nhiệm vụ', group: 'dispatch' },
  Escalated: { label: 'Leo thang', group: 'escalation' },
  DeEscalated: { label: 'Hạ thang', group: 'escalation' },
  PhoneRevealed: { label: 'Bấm "Hiện số"', group: 'privacy' },
  ReporterBlocked: { label: 'Chặn số người báo', group: 'privacy' },
};

/** Nhãn + icon + màu của một hành động; hành động lạ (backend thêm sau) hiện nguyên tên. */
export function auditActionMeta(action: string): { label: string; icon: LucideIcon; badgeClass: string } {
  const meta = ACTION_META[action as AuditAction];
  const group = GROUP_META[meta?.group ?? 'incident'];
  return { label: meta?.label ?? action, ...group };
}

const ACTOR_ROLE_LABEL: Record<string, string> = {
  Admin: 'Quản trị viên',
  Operator: 'Điều phối viên',
  RescueStaff: 'Đội cứu hộ',
  Citizen: 'Người dân',
  AI_Worker: 'AI',
  System: 'Hệ thống',
};

export const actorRoleLabel = (role: string | null) => (role ? ACTOR_ROLE_LABEL[role] ?? role : '—');

const pad = (n: number) => String(n).padStart(2, '0');

/** dd/MM/yyyy HH:mm:ss theo giờ địa phương. */
export function formatAuditTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** yyyy-MM-dd theo giờ địa phương (giá trị của <input type="date">). */
export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface StateChange {
  field: string;
  from: string | null;
  to: string | null;
}

const formatValue = (value: unknown): string =>
  value === null || value === undefined ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);

function parseState(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : { value: parsed };
  } catch {
    return { value: json };
  }
}

/**
 * Ghép oldStateJson / newStateJson thành danh sách "trường: cũ → mới". Trường chỉ có ở một phía thì phía kia là null
 * (VD "Hiện số" chỉ ghi trạng thái mới).
 */
export function stateChanges(oldJson: string | null, newJson: string | null): StateChange[] {
  const before = parseState(oldJson);
  const after = parseState(newJson);
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return fields
    .map((field) => ({
      field,
      from: field in before ? formatValue(before[field]) : null,
      to: field in after ? formatValue(after[field]) : null,
    }))
    .filter((c) => c.from !== c.to);
}
