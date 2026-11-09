import { apiClient, unwrapApi } from './apiClient';
import type { ApiResponse } from '../types/auth';
import type { EquipmentDto, EquipmentInput, EquipmentStatus } from '../types/equipment';

// Thiết bị cứu hộ (§25): /api/equipment. Operator chỉ thấy / sửa thiết bị trạm mình (trạm khác → 403).
// Backend không phát sự kiện realtime cho thiết bị → màn hình tự tải lại sau thao tác / khi quay lại tab.
export const equipmentService = {
  /** Bỏ trống `stationId` → backend tự lọc theo trạm của Operator. */
  async list(params: { stationId?: string } = {}): Promise<EquipmentDto[]> {
    return unwrapApi(apiClient.get<ApiResponse<EquipmentDto[]>>('/equipment', { params }));
  },

  async create(input: EquipmentInput): Promise<EquipmentDto> {
    return unwrapApi(apiClient.post<ApiResponse<EquipmentDto>>('/equipment', input));
  },

  async update(id: string, input: EquipmentInput): Promise<EquipmentDto> {
    return unwrapApi(apiClient.put<ApiResponse<EquipmentDto>>(`/equipment/${id}`, input));
  },

  /** Maintenance bắt buộc `note` ≥ 5 ký tự; về Available thì backend xóa ghi chú cũ. */
  async setStatus(id: string, status: EquipmentStatus, note?: string): Promise<EquipmentDto> {
    return unwrapApi(apiClient.put<ApiResponse<EquipmentDto>>(`/equipment/${id}/status`, { status, note: note || null }));
  },

  /** Xóa mềm. */
  async remove(id: string): Promise<void> {
    await unwrapApi(apiClient.delete<ApiResponse<boolean>>(`/equipment/${id}`));
  },
};
