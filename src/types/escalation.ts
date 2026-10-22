import type { BackendIncidentStatus, BackendSeverityLevel } from './incident';

// Mirror EmergencyDispatch.Application.DTOs.Escalation (enum trả về dạng chuỗi).
// Ngưỡng chờ và mở rộng bán kính đọc từ /api/settings/escalation. Daemon chỉ dùng cấp tối thiểu của quy tắc
// (phạm vi sự cố bị leo thang); timeoutMinutes / expandRadiusPercent của quy tắc không còn được áp dụng.

/** Cấp tối thiểu một quy tắc áp dụng (backend Range 1–3). */
export type EscalationSeverity = Extract<BackendSeverityLevel, 'Level1' | 'Level2' | 'Level3'>;

export const ESCALATION_SEVERITIES: EscalationSeverity[] = ['Level3', 'Level2', 'Level1'];

/** Vai trò có thể nhận cảnh báo leo thang (NotifyRoles). */
export type EscalationNotifyRole = 'Admin' | 'Operator' | 'RescueStaff';

export const ESCALATION_NOTIFY_ROLES: EscalationNotifyRole[] = ['Operator', 'Admin', 'RescueStaff'];

export interface EscalationRuleDto {
  id: string;
  minSeverityLevel: EscalationSeverity;
  /** Không còn áp dụng — ngưỡng chờ lấy từ /api/settings/escalation. */
  timeoutMinutes: number;
  /** Chuỗi JSON, VD "[\"Admin\",\"Operator\"]". */
  notifyRoles: string;
  expandRadiusPercent: number;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * Body của POST /api/escalation/rules và PUT /api/escalation/rules/{id}.
 * Không gửi timeoutMinutes / expandRadiusPercent: tạo mới thì backend dùng mặc định, cập nhật thì giữ nguyên.
 */
export interface EscalationRuleInput {
  minSeverityLevel: EscalationSeverity;
  notifyRoles: EscalationNotifyRole[];
  isActive: boolean;
  description: string;
}

export interface EscalationLogDto {
  id: string;
  incidentId: string;
  incidentTitle: string | null;
  incidentSeverity: BackendSeverityLevel;
  incidentStatus: BackendIncidentStatus;
  escalationRuleId: string;
  escalationLevel: number;
  notifiedRoles: string | null;
  notifiedUserIds: string | null;
  actionTaken: string | null;
  triggerTime: string;
  resolvedAt: string | null;
  resolutionTimeMs: number | null;
}

/** Đọc NotifyRoles (chuỗi JSON) an toàn — dữ liệu hỏng thì trả mảng rỗng. */
export function parseNotifyRoles(value: string | null): EscalationNotifyRole[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((r): r is EscalationNotifyRole => ESCALATION_NOTIFY_ROLES.includes(r as EscalationNotifyRole))
      : [];
  } catch {
    return [];
  }
}
