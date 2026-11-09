import type { BackendIncidentStatus, BackendSeverityLevel } from './incident';

// Mirror EmergencyDispatch.Application.DTOs.Escalation (enum trả về dạng chuỗi).
// Ngưỡng chờ và mở rộng bán kính là cấu hình chung (/api/settings/escalation). Quy tắc chỉ quyết định cấp sự cố
// nào bị leo thang và ai nhận cảnh báo; backend trả kèm ngưỡng chung đang áp dụng (effective*, chỉ đọc).

/** Cấp tối thiểu một quy tắc áp dụng (backend Range 1–3). */
export type EscalationSeverity = Extract<BackendSeverityLevel, 'Level1' | 'Level2' | 'Level3'>;

export const ESCALATION_SEVERITIES: EscalationSeverity[] = ['Level3', 'Level2', 'Level1'];

/** Vai trò có thể nhận cảnh báo leo thang (NotifyRoles). */
export type EscalationNotifyRole = 'Admin' | 'Operator' | 'RescueStaff';

export const ESCALATION_NOTIFY_ROLES: EscalationNotifyRole[] = ['Operator', 'Admin', 'RescueStaff'];

export interface EscalationRuleDto {
  id: string;
  minSeverityLevel: EscalationSeverity;
  /** Chuỗi JSON, VD "[\"Admin\",\"Operator\"]". */
  notifyRoles: string;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
  // Ngưỡng chung đang áp dụng (chép từ /api/settings/escalation lúc đọc) — chỉ đọc, không gửi lên.
  effectiveDayThresholdMinutes: number;
  effectiveNightThresholdMinutes: number;
  /** "HH:mm". */
  effectiveNightStart: string;
  effectiveNightEnd: string;
  effectiveRadiusMultiplier: number;
  effectiveMaxRadiusKm: number;
}

/** Body của POST /api/escalation/rules và PUT /api/escalation/rules/{id}. */
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
