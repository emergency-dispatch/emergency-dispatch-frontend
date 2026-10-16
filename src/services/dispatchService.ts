import { API_CONFIG } from '../config/api';
import type { ApiResponse } from '../types/auth';

// TODO(backend): chưa có Vehicle/Dispatch API — giao/nhả xe đang xử lý cục bộ.
// Mock mode mô phỏng xung đột đồng thời (RowVersion → HTTP 409): lần đầu giao xe
// trong danh sách dưới đây sẽ thất bại như thể điều phối viên khác vừa giao xe đó trước.
const MOCK_CONFLICT_VEHICLE_IDS = new Set(['veh-10']);

const respond = <T>(data: T, success = true, message = 'OK'): Promise<ApiResponse<T>> =>
  new Promise((resolve) => setTimeout(() => resolve({ success, message, data }), 300));

export const dispatchService = {
  async assignVehicle(incidentId: string, vehicleId: string): Promise<ApiResponse<{ conflict: boolean } | null>> {
    if (API_CONFIG.USE_MOCK_INCIDENTS && MOCK_CONFLICT_VEHICLE_IDS.has(vehicleId)) {
      MOCK_CONFLICT_VEHICLE_IDS.delete(vehicleId);
      return respond({ conflict: true }, false, 'Xe vừa được điều phối viên khác giao cho sự cố khác.');
    }
    return respond({ conflict: false }, true, `Đã giao xe ${vehicleId} cho sự cố ${incidentId}.`);
  },

  async releaseVehicle(vehicleId: string): Promise<ApiResponse<null>> {
    return respond(null, true, `Đã nhả xe ${vehicleId}.`);
  },
};
