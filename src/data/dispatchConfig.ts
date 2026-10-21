import type { DispatchAlgorithm } from '../types/vehicle';
import type { SeverityLevel } from '../types/incident';

// Đội cứu hộ có 120 giây để Chấp nhận/Từ chối, quá hạn tự trả về trung tâm (FR-RS-01).
export const CREW_ACK_TIMEOUT_MS = 120 * 1000;

// Xe vào trạng thái hồi sức 5 phút sau khi nộp báo cáo (BR-27).
export const VEHICLE_RECOVERY_MS = 5 * 60 * 1000;

export const MAX_SEARCH_RADIUS_KM = 30;

// Tự mở rộng bán kính tìm xe khi không còn xe phù hợp (FR-OP-04).
export const SEARCH_RADII_KM = [10, 15, 22.5, 30];

// Cấp 3 được điều đồng thời tối đa 5 xe; Cấp 1–2 điều 1 xe.
export const MAX_VEHICLES_BY_LEVEL: Record<SeverityLevel, number> = { 1: 1, 2: 1, 3: 5 };

// Tổ làm việc của trạm: dưới MIN người thì cảnh báo "thiếu người" khi giao xe; không vượt quá MAX người.
export const MIN_TEAM_SIZE = 2;
export const MAX_TEAM_SIZE = 6;

// Load-Aware: Cost = 0.5 × Khoảng cách + 0.3 × Tải trạm + 0.2 × Nhiệm vụ đang chạy (các thành phần chuẩn hóa 0–1).
export const LOAD_AWARE_WEIGHTS = { distance: 0.5, stationLoad: 0.3, activeMissions: 0.2 };

export const DISPATCH_ALGORITHM_META: Record<DispatchAlgorithm, { label: string; description: string }> = {
  nearest: { label: 'Gần nhất', description: 'Nearest-Available — xếp theo khoảng cách' },
  load_aware: { label: 'Cân bằng tải', description: 'Load-Aware — cân nhắc khoảng cách, tải trạm và nhiệm vụ đang chạy' },
};
