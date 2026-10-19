// Immutable Audit Trail (NFR toàn vẹn dữ liệu) — chỉ thêm, không sửa/xóa.
export type AuditAction =
  | 'station_deleted'
  | 'vehicle_status_changed'
  | 'vehicle_deleted'
  | 'account_locked'
  | 'account_unlocked';

export type AuditTargetType = 'station' | 'vehicle' | 'account';

/** Mirror dự kiến của IncidentAuditTrail / AuditLogDto (backend chưa có). */
export interface AuditTrailEntry {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel: string;
  incidentId: string | null;
  detail: string;
}
