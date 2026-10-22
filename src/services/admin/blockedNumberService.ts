import { apiClient, unwrapApi } from '../apiClient';
import type { ApiResponse } from '../../types/auth';
import type { PaginatedResultDto } from '../../types/incident';
import type { BlockDurationDto, BlockedNumberDto, BlockedNumberStatus } from '../../types/blockedNumber';
import type { PageParams } from './listUtils';

export interface BlockedNumberListParams extends PageParams {
  status?: BlockedNumberStatus;
  /** Backend tìm theo chữ số có trong SĐT, hoặc theo nội dung lý do chặn. */
  search?: string;
}

// Số bị chặn do Operator thêm khi hủy ca báo khống (POST /api/incidents/{id}/block-reporter).
// Admin chỉ xem, gỡ chặn, gia hạn.
export const blockedNumberService = {
  async list(params: BlockedNumberListParams = {}): Promise<PaginatedResultDto<BlockedNumberDto>> {
    return unwrapApi(
      apiClient.get<ApiResponse<PaginatedResultDto<BlockedNumberDto>>>('/blocked-numbers', {
        params: {
          status: params.status,
          search: params.search?.trim() || undefined,
          pageIndex: params.pageIndex ?? 1,
          pageSize: params.pageSize ?? 10,
        },
      })
    );
  },

  /** Chỉ số còn hiệu lực. Backend bắt buộc lý do ≥ 5 ký tự. */
  async unblock(id: string, reason: string): Promise<BlockedNumberDto> {
    return unwrapApi(
      apiClient.post<ApiResponse<BlockedNumberDto>>(`/blocked-numbers/${id}/unblock`, { reason: reason.trim() })
    );
  },

  /** Thời hạn mới tính lại từ bây giờ. Không gia hạn được bản ghi đã gỡ. Backend nối lý do vào lý do chặn. */
  async extend(id: string, duration: BlockDurationDto, reason: string): Promise<BlockedNumberDto> {
    return unwrapApi(
      apiClient.post<ApiResponse<BlockedNumberDto>>(`/blocked-numbers/${id}/extend`, { duration, reason: reason.trim() })
    );
  },
};
