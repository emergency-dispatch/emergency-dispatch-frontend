import { apiClient, unwrapApi } from '../apiClient';
import type { ApiResponse } from '../../types/auth';
import type { PaginatedResultDto } from '../../types/incident';
import {
  ADMIN_SETTABLE_UNIT_STATUSES,
  ON_MISSION_UNIT_STATUSES,
  type CreateRescueUnitDto,
  type RescueUnitResponseDto,
  type RescueUnitStatus,
  type RescueUnitType,
} from '../../types/rescueUnit';
import { normalizeText, paginate, type PageParams } from './listUtils';

/** Một trạng thái, hoặc 'on_mission' = Đã điều động + Tại hiện trường. */
export type VehicleStatusFilter = RescueUnitStatus | 'on_mission';

export interface VehicleListParams extends PageParams {
  search?: string;
  stationId?: string;
  type?: RescueUnitType;
  status?: VehicleStatusFilter;
}

export interface VehicleEditInput {
  plateNumber: string;
  unitType: RescueUnitType;
  stationId: string;
}

const matchesStatus = (status: RescueUnitStatus, filter?: VehicleStatusFilter) =>
  !filter || (filter === 'on_mission' ? ON_MISSION_UNIT_STATUSES.includes(status) : status === filter);

/** Xe chỉ được đổi trạm / đặt bảo trì khi đang ở trạm (Sẵn sàng hoặc Bảo trì). */
export const isUnitAtStation = (status: RescueUnitStatus) => ADMIN_SETTABLE_UNIT_STATUSES.includes(status);

export const vehicleAdminService = {
  /** Toàn bộ xe chưa xóa (backend không phân trang). */
  async listAll(): Promise<RescueUnitResponseDto[]> {
    return unwrapApi(apiClient.get<ApiResponse<RescueUnitResponseDto[]>>('/rescue-units'));
  },

  /** Lọc và phân trang phía client. */
  async list(params: VehicleListParams = {}): Promise<PaginatedResultDto<RescueUnitResponseDto>> {
    const units = await vehicleAdminService.listAll();
    const q = normalizeText(params.search ?? '');
    const items = units
      .filter((u) => !params.stationId || u.stationId === params.stationId)
      .filter((u) => !params.type || u.unitType === params.type)
      .filter((u) => matchesStatus(u.status, params.status))
      .filter((u) => !q || normalizeText(`${u.plateNumber} ${u.stationName}`).includes(q))
      .sort((a, b) => a.stationName.localeCompare(b.stationName, 'vi') || a.plateNumber.localeCompare(b.plateNumber));
    return paginate(items, params);
  },

  async getById(id: string): Promise<RescueUnitResponseDto> {
    return unwrapApi(apiClient.get<ApiResponse<RescueUnitResponseDto>>(`/rescue-units/${id}`));
  },

  /** Xe mới luôn ở trạng thái Sẵn sàng, đặt tại tọa độ của trạm. */
  async create(input: CreateRescueUnitDto): Promise<RescueUnitResponseDto> {
    return unwrapApi(apiClient.post<ApiResponse<RescueUnitResponseDto>>('/rescue-units', input));
  },

  /**
   * PUT /api/rescue-units/{id} bắt buộc gửi cả trạng thái và không tự chặn đổi trạm khi xe đang làm nhiệm vụ.
   * Đọc lại trạng thái mới nhất ngay trước khi lưu để không ghi đè trạng thái do luồng điều phối vừa đặt.
   */
  async update(id: string, input: VehicleEditInput): Promise<RescueUnitResponseDto> {
    const current = await vehicleAdminService.getById(id);
    if (current.stationId !== input.stationId && !isUnitAtStation(current.status)) {
      throw new Error(`Xe ${current.plateNumber} đang làm nhiệm vụ, không thể đổi trạm trực thuộc.`);
    }
    return unwrapApi(
      apiClient.put<ApiResponse<RescueUnitResponseDto>>(`/rescue-units/${id}`, { ...input, status: current.status })
    );
  },

  /** Admin chỉ đổi Sẵn sàng ↔ Bảo trì; backend không tự chặn nên kiểm tra trạng thái hiện tại trước. */
  async setStatus(id: string, status: RescueUnitStatus): Promise<RescueUnitResponseDto> {
    if (!ADMIN_SETTABLE_UNIT_STATUSES.includes(status)) throw new Error('Admin chỉ đặt được Sẵn sàng hoặc Bảo trì.');
    const current = await vehicleAdminService.getById(id);
    if (!isUnitAtStation(current.status)) {
      throw new Error(`Xe ${current.plateNumber} đang làm nhiệm vụ, không thể đổi trạng thái.`);
    }
    return unwrapApi(apiClient.put<ApiResponse<RescueUnitResponseDto>>(`/rescue-units/${id}/status`, { status }));
  },

  /** Xóa mềm. Backend chặn (400) khi xe Đã điều động / Tại hiện trường. */
  async remove(id: string): Promise<void> {
    await unwrapApi(apiClient.delete<ApiResponse<null>>(`/rescue-units/${id}`));
  },
};
