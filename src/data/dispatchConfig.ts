import type { DispatchAlgorithm } from '../types/vehicle';
import type { Incident, SeverityLevel } from '../types/incident';
import type { DispatchPlanSeverity, DispatchPlanUnitDto, IncidentTypeDto } from '../types/typeCatalog';

// Không dùng: thời gian chờ tổ nhận lệnh do Admin cấu hình (escalation.acceptTimeoutMinutes, §52), backend tự rút lệnh.
export const CREW_ACK_TIMEOUT_MS = 120 * 1000;

// Xe vào trạng thái hồi sức 5 phút sau khi nộp báo cáo (BR-27).
export const VEHICLE_RECOVERY_MS = 5 * 60 * 1000;

export const MAX_SEARCH_RADIUS_KM = 30;

// Tự mở rộng bán kính tìm xe khi không còn xe phù hợp (FR-OP-04).
export const SEARCH_RADII_KM = [10, 15, 22.5, 30];

// Giới hạn cũ (loại sự cố chưa có kế hoạch điều xe): Cấp 3 tối đa 5 xe; Cấp 1–2 điều 1 xe.
// Có kế hoạch thì dùng dispatchVehicleLimit() bên dưới.
export const MAX_VEHICLES_BY_LEVEL: Record<SeverityLevel, number> = { 1: 1, 2: 1, 3: 5 };

const PLAN_SEVERITY: Record<SeverityLevel, DispatchPlanSeverity> = { 1: 'Level1', 2: 'Level2', 3: 'Level3' };
const PLAN_ORDER: DispatchPlanSeverity[] = ['Level1', 'Level2', 'Level3'];
/** Mã loại "Khác" chung: loại chi tiết nhóm Khác chưa có kế hoạch riêng dùng kế hoạch của loại này. */
const GENERIC_OTHER_TYPE_CODE = 'Other';

export interface DispatchVehicleLimit {
  /** Số xe tối đa không cần lý do (BR-14). */
  max: number;
  /** Các loại xe theo kế hoạch của mức đang áp dụng (theo thứ tự ưu tiên); rỗng = chưa có kế hoạch. */
  planUnits: DispatchPlanUnitDto[];
  /** Mức kế hoạch đang áp dụng (có thể là mức thấp hơn gần nhất); null = chưa có kế hoạch → giới hạn cũ. */
  planLevel: DispatchPlanSeverity | null;
}

/**
 * Số xe chuẩn theo kế hoạch điều xe của loại sự cố (§32, cùng quy tắc với DispatchService / DispatchScoring):
 * - kế hoạch của mã loại sự cố; loại nhóm Khác chưa có kế hoạch riêng → kế hoạch của loại "Khác" chung;
 * - mức chưa cấu hình → mức thấp hơn gần nhất đã cấu hình, không có thì mức thấp nhất đã cấu hình;
 * - Cấp 1–2: tổng kế hoạch (1–5); Cấp 3: luôn tối đa 5; chưa có kế hoạch → giới hạn cũ (1 / 1 / 5).
 */
export function dispatchVehicleLimit(
  incident: Pick<Incident, 'severity' | 'incidentTypeCode' | 'category' | 'needsEventType'>,
  incidentTypes: readonly IncidentTypeDto[] | null | undefined
): DispatchVehicleLimit {
  const { severity, incidentTypeCode } = incident;
  const fallback = { max: MAX_VEHICLES_BY_LEVEL[severity], planUnits: [], planLevel: null };
  if (!incidentTypeCode || !incidentTypes?.length) return fallback;

  const configuredLevels = (type: IncidentTypeDto | undefined) =>
    (type?.dispatchPlan ?? []).filter((l) => l.units.length > 0);
  let type = incidentTypes.find((t) => t.code === incidentTypeCode);
  // Backend (DispatchService.GetUnitRulesAsync) chỉ dùng kế hoạch "Khác" chung khi nhóm của sự cố là Other hoặc None.
  const otherOrUnclassified = incident.category === 'other' || incident.needsEventType;
  if (configuredLevels(type).length === 0 && incidentTypeCode !== GENERIC_OTHER_TYPE_CODE && otherOrUnclassified) {
    type = incidentTypes.find((t) => t.code === GENERIC_OTHER_TYPE_CODE);
  }
  const levels = configuredLevels(type);
  if (levels.length === 0) return fallback;

  const wanted = PLAN_ORDER.indexOf(PLAN_SEVERITY[severity]);
  const byOrder = [...levels].sort((a, b) => PLAN_ORDER.indexOf(a.severity) - PLAN_ORDER.indexOf(b.severity));
  const level = [...byOrder].reverse().find((l) => PLAN_ORDER.indexOf(l.severity) <= wanted) ?? byOrder[0];
  const planUnits = [...level.units].sort(
    (a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER)
  );
  const total = planUnits.reduce((sum, u) => sum + u.quantity, 0);
  const max = severity === 3 ? MAX_VEHICLES_BY_LEVEL[3] : Math.min(MAX_VEHICLES_BY_LEVEL[3], Math.max(1, total));
  return { max, planUnits, planLevel: level.severity };
}

// Tổ làm việc của trạm: dưới MIN người thì cảnh báo "thiếu người" khi giao xe; không vượt quá MAX người.
export const MIN_TEAM_SIZE = 2;
export const MAX_TEAM_SIZE = 6;

// Load-Aware: Cost = 0.5 × Khoảng cách + 0.3 × Tải trạm + 0.2 × Nhiệm vụ đang chạy (các thành phần chuẩn hóa 0–1).
export const LOAD_AWARE_WEIGHTS = { distance: 0.5, stationLoad: 0.3, activeMissions: 0.2 };

export const DISPATCH_ALGORITHM_META: Record<DispatchAlgorithm, { label: string; description: string }> = {
  nearest: { label: 'Gần nhất', description: 'Nearest-Available — xếp theo khoảng cách' },
  load_aware: { label: 'Cân bằng tải', description: 'Load-Aware — cân nhắc khoảng cách, tải trạm và nhiệm vụ đang chạy' },
};
