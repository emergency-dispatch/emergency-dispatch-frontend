import type { AutoDispatchSettings } from '../../../services/liveMapService';
import type { AutoDispatchIneligibleReason, Incident } from '../../../types/incident';

/**
 * Vì sao ca tới tay Operator thay vì được AI tự điều phối:
 * - lý do không đủ điều kiện (mirror backend, xem `AutoDispatchIneligibleReason`);
 * - `belowThreshold`: độ tin cậy đo thật nhưng thấp hơn ngưỡng Admin đặt;
 * - `operatorHandling`: ca đang bị Operator giữ (khóa mềm) lúc AI chấm → AI không chen vào;
 * - `skipped`: AI đã thử nhưng bỏ qua (nghi trùng / hết tổ / giao lỗi) — câu cụ thể ở `autoDispatch.note`;
 * - `undecided`: AI phân tích xong, trông đủ điều kiện nhưng quá lâu chưa thấy kết quả (cài đặt FE cũ, lỗi giữa chừng…).
 */
export type HandoverReason = AutoDispatchIneligibleReason | 'belowThreshold' | 'operatorHandling' | 'skipped' | 'undecided';

export type AutoDispatchVerdict =
  /** Tự điều phối đang tắt / chưa tải được cài đặt / ca chuyển trạm → Operator thẩm định như luồng cũ. */
  | { phase: 'manual' }
  /** AI chưa trả kết quả. */
  | { phase: 'analyzing' }
  /** AI xong, đủ điều kiện → backend đang điều phối (thường vài giây), chờ ReceiveAutoDispatched. */
  | { phase: 'deciding' }
  /** AI chuyển cho Operator. */
  | { phase: 'handover'; reason: HandoverReason };

/** Quá thời gian này ở `deciding` mà chưa có kết quả → coi như chuyển cho Operator (`undecided`). */
export const AUTO_DISPATCH_DECIDING_TIMEOUT_MS = 20_000;

/**
 * §31.E: giai đoạn AI tự điều phối của một tin báo mới — popup quyết định chặn màn hình (cần người) hay chỉ báo nhẹ
 * (AI đang làm). Backend chỉ chấm một lần ngay sau khi AI phân tích, nên giữ ca trong lúc AI chạy = AI bỏ qua ca đó.
 */
export function autoDispatchVerdict(
  incident: Incident,
  settings: AutoDispatchSettings | null,
  options: { transferred: boolean; decidingExpired: boolean }
): AutoDispatchVerdict {
  // Ca chuyển trạm / Operator tự tạo: AI đã chấm (hoặc không áp dụng) từ trước → người xử lý.
  if (!settings?.enabled || options.transferred || incident.source !== 'CitizenApp') return { phase: 'manual' };
  if (incident.autoDispatch?.state === 'Skipped') return { phase: 'handover', reason: 'skipped' };
  if (incident.aiPending) return { phase: 'analyzing' };
  if (incident.autoDispatchIneligible) return { phase: 'handover', reason: incident.autoDispatchIneligible };
  if (incident.confidenceScore < settings.minConfidence * 100) return { phase: 'handover', reason: 'belowThreshold' };
  // Xét khóa sau cùng (backend xét trước phần độ tin cậy): khóa có thể được đặt sau khi AI đã bỏ qua vì lý do khác.
  if (incident.lock) return { phase: 'handover', reason: 'operatorHandling' };
  if (options.decidingExpired) return { phase: 'handover', reason: 'undecided' };
  return { phase: 'deciding' };
}
