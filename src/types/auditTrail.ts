// Mirror EmergencyDispatch.Application.DTOs.Incident.AuditTrailEntryDto (enum trả về dạng chuỗi).
// Hai loại nhật ký chỉ đọc: thao tác trên sự cố (GET /api/audit-trail) và thao tác quản trị — trạm, xe, tài khoản,
// tổ, cấu hình… (GET /api/audit-trail/system, kiểu SystemAuditLogDto bên dưới).

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
  | 'ReporterBlocked'
  | 'TransferredStation'
  | 'OutOfServiceArea';

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
  'TransferredStation',
  'OutOfServiceArea',
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

/** SystemAuditAction của backend (BR-AD-06). */
export type SystemAuditAction =
  | 'Created'
  | 'Updated'
  | 'Deleted'
  | 'StatusChanged'
  | 'Locked'
  | 'Unlocked'
  | 'StationAssigned'
  | 'SettingsUpdated'
  | 'Unblocked'
  | 'BlockExtended'
  | 'Exported';

export const SYSTEM_AUDIT_ACTIONS: SystemAuditAction[] = [
  'Created',
  'Updated',
  'Deleted',
  'StatusChanged',
  'Locked',
  'Unlocked',
  'StationAssigned',
  'SettingsUpdated',
  'Unblocked',
  'BlockExtended',
  'Exported',
];

/** AuditEntityTypes của backend. */
export type SystemAuditEntityType =
  | 'Station'
  | 'RescueUnit'
  | 'User'
  | 'StationTeam'
  | 'Settings'
  | 'EscalationRule'
  | 'BlockedNumber'
  | 'Report';

export const SYSTEM_AUDIT_ENTITY_TYPES: SystemAuditEntityType[] = [
  'Station',
  'RescueUnit',
  'User',
  'StationTeam',
  'Settings',
  'EscalationRule',
  'BlockedNumber',
  'Report',
];

/** Mirror SystemAuditLogDto (GET /api/audit-trail/system). */
export interface SystemAuditLogDto {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: SystemAuditAction;
  entityType: SystemAuditEntityType;
  entityId: string | null;
  /** Tên đối tượng lúc ghi (VD biển số, tên trạm, email; cấu hình thì là khóa "dispatch" / "escalation"…). */
  entityName: string | null;
  description: string;
  /** JSON camelCase trạng thái trước / sau (có thể lồng object, enum dạng chuỗi); null nếu không có. */
  oldValueJson: string | null;
  newValueJson: string | null;
  ipAddress: string | null;
  timestamp: string;
}
