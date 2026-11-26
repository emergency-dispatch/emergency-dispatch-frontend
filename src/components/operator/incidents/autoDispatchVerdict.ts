import type { AutoDispatchSettings } from '../../../services/liveMapService';
import type { AutoDispatchNotEligibleReason, Incident } from '../../../types/incident';

/**
 * Vì sao ca tới tay Operator thay vì được AI tự điều phối:
 * - lý do không đủ điều kiện: backend lưu từ §35 (`autoDispatchNotEligible`), ca cũ thì FE tự suy (`AutoDispatchIneligibleReason`);
 * - `belowThreshold`: độ tin cậy đo thật nhưng thấp hơn ngưỡng Admin đặt;
 * - `operatorHandling`: ca đang bị Operator giữ (khóa mềm) lúc AI chấm → AI không chen vào;
 * - `ensemble*` (§42): chế độ 3 AI bỏ phiếu không đủ đồng thuận / model CNN không chạy được / ca không có ảnh;
 * - `other`: mã lý do FE chưa biết → hiện câu của backend;
 * - `skipped`: AI đã thử nhưng bỏ qua (nghi trùng / hết tổ / giao lỗi) — câu cụ thể ở `autoDispatch.note`;
 * - `undecided`: AI phân tích xong, trông đủ điều kiện nhưng quá lâu chưa thấy kết quả (cài đặt FE cũ, lỗi giữa chừng…).
 */
export type HandoverReason = AutoDispatchNotEligibleReason | 'skipped' | 'undecided';

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
 * Thanh bên không theo dõi lúc ca bắt đầu "đang điều phối" → tính từ lúc tiếp nhận: AI đủ điều kiện mà quá
 * hạn này vẫn chưa có kết quả thì coi như chuyển cho người. Backend chờ AI tối đa ~2 phút rồi điều phối trong vài giây.
 */
export const AUTO_DISPATCH_GRACE_FROM_CREATED_MS = 3 * 60_000;

/** Phán quyết theo thời điểm tiếp nhận (dùng cho danh sách — không có mốc "bắt đầu điều phối"). */
export function autoDispatchVerdictAt(
  incident: Incident,
  settings: AutoDispatchSettings | null,
  now: number
): AutoDispatchVerdict {
  return autoDispatchVerdict(incident, settings, {
    transferred: false,
    decidingExpired: now - new Date(incident.createdAt).getTime() > AUTO_DISPATCH_GRACE_FROM_CREATED_MS,
  });
}

/** Ca chờ duyệt cần Operator (không còn chờ AI). */
export const needsOperator = (verdict: AutoDispatchVerdict) =>
  verdict.phase === 'manual' || verdict.phase === 'handover';

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
  // §35: backend đã chấm và lưu lý do → tin backend (đúng cả khóa mềm lúc AI chấm, ngưỡng lúc đó).
  if (incident.autoDispatchNotEligible) return { phase: 'handover', reason: incident.autoDispatchNotEligible };
  // Ca chưa có lý do lưu (ca cũ / backend chưa chấm xong) → tự suy như trước.
  if (incident.autoDispatchIneligible) return { phase: 'handover', reason: incident.autoDispatchIneligible };
  if (incident.confidenceScore < settings.minConfidence * 100) return { phase: 'handover', reason: 'belowThreshold' };
  // Xét khóa sau cùng (backend xét trước phần độ tin cậy): khóa có thể được đặt sau khi AI đã bỏ qua vì lý do khác.
  if (incident.lock) return { phase: 'handover', reason: 'operatorHandling' };
  if (options.decidingExpired) return { phase: 'handover', reason: 'undecided' };
  return { phase: 'deciding' };
}
