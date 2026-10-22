// Mirror EmergencyDispatch.Application.DTOs.Incident.AuditTrailEntryDto (enum trả về dạng chuỗi).
// Immutable Audit Trail: backend chỉ ghi nhật ký gắn với sự cố — không có bản ghi khóa tài khoản,
// sửa trạm/xe hay đổi cấu hình.

export type AuditAction =
  | 'Created'
  | 'AiAnalyzed'
  | 'Verified'
  | 'SeverityOverridden'
  | 'Dispatched'
  | 'AssignmentAccepted'
  | 'AssignmentRejected'
  | 'StatusChanged'
  | 'Escalated'
  | 'DeEscalated'
  | 'Cancelled'
  | 'Completed'
  | 'Closed'
  | 'ReDispatched'
  | 'PhoneRevealed'
  | 'ReporterBlocked';

export const AUDIT_ACTIONS: AuditAction[] = [
  'Created',
  'AiAnalyzed',
  'Verified',
  'SeverityOverridden',
  'Dispatched',
  'ReDispatched',
  'AssignmentAccepted',
  'AssignmentRejected',
  'StatusChanged',
  'Escalated',
  'DeEscalated',
  'Cancelled',
  'Completed',
  'Closed',
  'PhoneRevealed',
  'ReporterBlocked',
];

export interface AuditTrailEntryDto {
  id: string;
  incidentId: string;
  incidentTitle: string | null;
  actorId: string | null;
  /** Tên người thao tác; tác vụ nền thì là tên vai trò (VD "AI Worker"). */
  actorName: string | null;
  /** Chuỗi tự do: "Operator", "Admin", "RescueStaff", "Citizen", "AI_Worker", "System"… */
  actorRole: string | null;
  action: AuditAction;
  description: string | null;
  /** JSON trạng thái trước / sau thao tác (có thể null). */
  oldStateJson: string | null;
  newStateJson: string | null;
  timestamp: string;
}
