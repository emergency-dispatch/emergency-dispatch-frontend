import { apiClient, unwrapApi } from '../apiClient';
import { UserRole, type ApiResponse, type UserResponseDto, type UserStatus } from '../../types/auth';
import type { PaginatedResultDto } from '../../types/incident';
import { accountAdminService } from './accountAdminService';
import type { PageParams } from './listUtils';

export interface CitizenListParams extends PageParams {
  status?: UserStatus;
  /** Họ tên, email hoặc một phần SĐT (backend tìm "chứa"). */
  search?: string;
}

// Admin chỉ xem + khóa/mở khóa Citizen. Không tạo, sửa hồ sơ, xóa, hay xem hồ sơ y tế / danh bạ ICE.
// Backend trả SĐT đầy đủ — UI luôn che số (Admin không có nút "Hiện số").
export const citizenAdminService = {
  async list(params: CitizenListParams = {}): Promise<PaginatedResultDto<UserResponseDto>> {
    return unwrapApi(
      apiClient.get<ApiResponse<PaginatedResultDto<UserResponseDto>>>('/users', {
        params: {
          role: UserRole.Citizen,
          status: params.status,
          search: params.search?.trim() || undefined,
          pageIndex: params.pageIndex ?? 1,
          pageSize: params.pageSize ?? 10,
        },
      })
    );
  },

  /** Khóa kèm lý do → chặn đăng nhập và báo sự cố mới, thu hồi phiên đăng nhập đang mở. */
  lock: (id: string, reason: string) => accountAdminService.lock(id, reason),

  /** Mở khóa / kích hoạt (gỡ cả khóa tạm do đăng nhập sai). */
  unlock: (id: string) => accountAdminService.unlock(id),
};
