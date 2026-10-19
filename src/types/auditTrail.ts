import { UserRole } from './auth';

// Immutable Audit Trail (NFR toàn vẹn dữ liệu) — chỉ thêm, không sửa/xóa.
export type AuditAction =
  // Sự cố (Operator)
  | 'incident_status_changed'
  | 'ai_confirmed'
  | 'ai_overridden'
  | 'incident_cancelled_false_report'
  | 'phone_revealed'
  // Điều phối (Operator / đội cứu hộ)
  | 'vehicle_assigned'
  | 'vehicle_released'
  | 'handover_completed'
  // Số bị chặn
  | 'number_blocked'
  | 'number_unblocked'
  | 'number_block_extended'
  // Tài khoản
  | 'account_locked'
  | 'account_unlocked'
  // Đội xe & trạm
  | 'station_deleted'
  | 'vehicle_status_changed'
  | 'vehicle_station_changed'
  | 'vehicle_deleted'
  // Cấu hình
  | 'settings_changed';

export type AuditActionGroup = 'incident' | 'dispatch' | 'account' | 'fleet' | 'blocked_number' | 'settings';

/** Nhóm của từng loại hành động — dùng chung cho bộ lọc (service) và hiển thị (UI). */
export const AUDIT_ACTION_GROUP: Record<AuditAction, AuditActionGroup> = {
  incident_status_changed: 'incident',
  ai_confirmed: 'incident',
  ai_overridden: 'incident',
  incident_cancelled_false_report: 'incident',
  phone_revealed: 'incident',
  vehicle_assigned: 'dispatch',
  vehicle_released: 'dispatch',
  handover_completed: 'dispatch',
  number_blocked: 'blocked_number',
  number_unblocked: 'blocked_number',
  number_block_extended: 'blocked_number',
  account_locked: 'account',
  account_unlocked: 'account',
  station_deleted: 'fleet',
  vehicle_status_changed: 'fleet',
  vehicle_station_changed: 'fleet',
  vehicle_deleted: 'fleet',
  settings_changed: 'settings',
};

export type AuditTargetType =
  | 'incident'
  | 'station'
  | 'vehicle'
  | 'account'
  | 'citizen'
  | 'blocked_number'
  | 'settings';

/** Vai trò người thao tác; 'System' = tác vụ nền (VD Escalation Daemon). */
export type AuditActorRole = UserRole.Admin | UserRole.Operator | UserRole.RescueStaff | 'System';

export interface AuditChange {
  field: string;
  from: string;
  to: string;
}

/** Mirror dự kiến của IncidentAuditTrail / AuditLogDto (backend chưa có). */
export interface AuditTrailEntry {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: AuditActorRole;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  /** Tên trạm, biển số, tên người, SĐT đã che… (không bao giờ chứa SĐT gốc). */
  targetLabel: string;
  incidentId: string | null;
  /** Tóm tắt một dòng. */
  detail: string;
  /** Danh sách thay đổi cũ → mới (rỗng nếu không áp dụng). */
  changes: AuditChange[];
  reason: string | null;
}
