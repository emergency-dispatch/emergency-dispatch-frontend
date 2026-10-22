import { apiClient, unwrapApi } from '../apiClient';
import type { ApiResponse } from '../../types/auth';
import type { PaginatedResultDto } from '../../types/incident';
import type { StationResponseDto, StationUpsertDto } from '../../types/station';
import { normalizeText, paginate, type PageParams } from './listUtils';

export type StationStatusFilter = 'active' | 'inactive';

export interface StationListParams extends PageParams {
  search?: string;
  status?: StationStatusFilter;
}

// Hotline nội khu: số ngắn (114, 115) hoặc số cố định/di động tối đa 11 chữ số.
export const HOTLINE_PATTERN = /^\d{3,11}$/;

export const stationAdminService = {
  /** GET /api/stations trả cả danh sách (không phân trang, không tìm kiếm) → lọc và phân trang phía client. */
  async list(params: StationListParams = {}): Promise<PaginatedResultDto<StationResponseDto>> {
    const stations = await unwrapApi(apiClient.get<ApiResponse<StationResponseDto[]>>('/stations'));
    const q = normalizeText(params.search ?? '');
    const items = stations
      .filter((s) => !params.status || s.isActive === (params.status === 'active'))
      .filter((s) => !q || normalizeText(`${s.name} ${s.address} ${s.phoneNumber ?? ''}`).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return paginate(items, params);
  },

  /** Chi tiết trạm kèm danh sách xe và nhân sự trực thuộc. */
  async getById(id: string): Promise<StationResponseDto> {
    return unwrapApi(apiClient.get<ApiResponse<StationResponseDto>>(`/stations/${id}`));
  },

  async create(input: StationUpsertDto): Promise<StationResponseDto> {
    return unwrapApi(apiClient.post<ApiResponse<StationResponseDto>>('/stations', input));
  },

  async update(id: string, input: StationUpsertDto): Promise<StationResponseDto> {
    return unwrapApi(apiClient.put<ApiResponse<StationResponseDto>>(`/stations/${id}`, input));
  },

  /**
   * Gán nhân sự vào trạm (stationId) hoặc gỡ khỏi trạm (null). Không gửi tên tổ: chuyển sang trạm khác thì
   * backend tự gỡ người đó khỏi tổ của trạm cũ, gỡ khỏi trạm thì gỡ luôn khỏi tổ. Chia tổ do Operator làm ở Trạm & Tổ.
   */
  async assignStaff(userId: string, stationId: string | null): Promise<void> {
    await unwrapApi(apiClient.put<ApiResponse<unknown>>(`/users/${userId}/assign-station-team`, { stationId }));
  },

  /**
   * Xóa mềm trạm. Backend chặn (400) khi còn xe đang làm nhiệm vụ; xe còn lại chuyển Ngừng hoạt động,
   * nhân sự bị gỡ khỏi trạm và các tổ của trạm bị xóa.
   */
  async remove(id: string): Promise<void> {
    await unwrapApi(apiClient.delete<ApiResponse<null>>(`/stations/${id}`));
  },
};
