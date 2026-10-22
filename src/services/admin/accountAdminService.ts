import { apiClient, unwrapApi } from '../apiClient';
import { UserRole, UserStatus, type ApiResponse, type UserResponseDto } from '../../types/auth';
import type { PaginatedResultDto } from '../../types/incident';
import type { CreateInternalAccountDto, InternalAccountInput, InternalRole } from '../../types/internalAccount';
import { paginate, type PageParams } from './listUtils';

export interface AccountListParams extends PageParams {
  role?: InternalRole;
  status?: UserStatus;
  search?: string;
}

const INTERNAL_ROLE_SET = new Set<UserRole>([UserRole.Operator, UserRole.RescueStaff]);
// Backend giới hạn pageSize tối đa 100.
const MAX_PAGE_SIZE = 100;

type UserQuery = { pageIndex: number; pageSize: number; search?: string; role?: UserRole; status?: UserStatus };

const getUsersPage = (params: UserQuery) =>
  unwrapApi(apiClient.get<ApiResponse<PaginatedResultDto<UserResponseDto>>>('/users', { params }));

/** Gom hết các trang (lọc `role` của backend chỉ nhận 1 giá trị nên phải lọc Operator + RescueStaff phía client). */
async function getAllUsers(params: Omit<UserQuery, 'pageIndex' | 'pageSize'>): Promise<UserResponseDto[]> {
  const first = await getUsersPage({ ...params, pageIndex: 1, pageSize: MAX_PAGE_SIZE });
  const rest = await Promise.all(
    // Không có kết quả → backend trả totalPages = 0.
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      getUsersPage({ ...params, pageIndex: i + 2, pageSize: MAX_PAGE_SIZE })
    )
  );
  return [first, ...rest].flatMap((p) => p.items);
}

const getUser = (id: string) => unwrapApi(apiClient.get<ApiResponse<UserResponseDto>>(`/users/${id}`));

/**
 * PUT /api/users/{id} ghi đè cả SĐT và trạm (gửi thiếu là bị xóa) → luôn đọc bản mới nhất rồi gửi lại
 * đầy đủ, chỉ thay các trường cần đổi.
 */
type UserChanges = Partial<Pick<UserResponseDto, 'fullName' | 'phoneNumber' | 'role' | 'status'>> & {
  stationId?: string | null;
};

async function putUser(id: string, changes: UserChanges) {
  const current = await getUser(id);
  const next = { ...current, ...changes };
  return unwrapApi(
    apiClient.put<ApiResponse<UserResponseDto>>(`/users/${id}`, {
      fullName: next.fullName,
      phoneNumber: next.phoneNumber || null,
      role: next.role,
      status: next.status,
      stationId: next.stationId || null,
    })
  );
}

export const accountAdminService = {
  /** Chỉ Operator và RescueStaff — Admin và Citizen không nằm trong màn này. */
  async listAccounts(params: AccountListParams = {}): Promise<PaginatedResultDto<UserResponseDto>> {
    const search = params.search?.trim() || undefined;
    const pageIndex = params.pageIndex ?? 1;
    const pageSize = params.pageSize ?? 10;

    // Lọc theo 1 vai trò → phân trang thẳng ở backend.
    if (params.role) {
      return getUsersPage({ pageIndex, pageSize, search, role: params.role, status: params.status });
    }
    const users = await getAllUsers({ search, status: params.status });
    return paginate(
      users.filter((u) => INTERNAL_ROLE_SET.has(u.role)),
      { pageIndex, pageSize }
    );
  },

  /** Số tài khoản theo vai trò (đọc totalCount, không tải danh sách). */
  async countByRole(role: UserRole): Promise<number> {
    const page = await getUsersPage({ pageIndex: 1, pageSize: 1, role });
    return page.totalCount;
  },

  /** Admin đặt mật khẩu ban đầu; backend không gửi email đặt mật khẩu. */
  async create(input: CreateInternalAccountDto): Promise<UserResponseDto> {
    return unwrapApi(
      apiClient.post<ApiResponse<UserResponseDto>>('/users', {
        ...input,
        phoneNumber: input.phoneNumber || null,
        stationId: input.stationId || null,
      })
    );
  },

  /** Email không đổi được qua API. */
  async update(id: string, input: InternalAccountInput): Promise<UserResponseDto> {
    return putUser(id, input);
  },

  /**
   * Khóa thủ công kèm lý do (backend bắt buộc ≥ 5 ký tự): đặt Suspended, lưu lý do và thu hồi mọi phiên đăng nhập.
   */
  async lock(id: string, reason: string): Promise<UserResponseDto> {
    return unwrapApi(apiClient.post<ApiResponse<UserResponseDto>>(`/users/${id}/lock`, { reason: reason.trim() }));
  },

  /** Mở khóa: về Active, gỡ cả khóa Admin lẫn khóa tạm do đăng nhập sai. Cũng dùng để kích hoạt tài khoản Inactive. */
  async unlock(id: string): Promise<UserResponseDto> {
    return unwrapApi(apiClient.post<ApiResponse<UserResponseDto>>(`/users/${id}/unlock`));
  },

  /** Xóa mềm tài khoản. */
  async remove(id: string): Promise<void> {
    await unwrapApi(apiClient.delete<ApiResponse<null>>(`/users/${id}`));
  },
};
