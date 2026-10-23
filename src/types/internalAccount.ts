import { UserRole, type UserResponseDto } from './auth';

// Tài khoản nội bộ Admin quản lý: chỉ Operator và RescueStaff (Admin không tạo được Admin khác).
export type InternalRole = UserRole.Operator | UserRole.RescueStaff;

/**
 * Body của POST /api/users (CreateUserDto) — Admin đặt mật khẩu ban đầu.
 * Không gửi trạm: gán người vào trạm làm ở tab Trạm cứu hộ (PUT /api/users/{id}/assign-station-team).
 */
export interface CreateInternalAccountDto {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: InternalRole;
}

/**
 * Trường khóa backend trả thêm trong UserResponseDto. Khai báo riêng cho Admin vì types/auth.ts dùng chung mọi vai trò.
 */
export interface AdminUserDto extends UserResponseDto {
  /** Lý do Admin khóa (khi status = Suspended). */
  lockReason?: string | null;
  lockedAt?: string | null;
  /** Khóa tạm sau 5 lần đăng nhập sai — chỉ có giá trị khi còn hiệu lực. */
  lockoutEndUtc?: string | null;
}

/** Các trường Admin sửa được qua PUT /api/users/{id} (email không đổi được). */
export type InternalAccountInput = Pick<CreateInternalAccountDto, 'fullName' | 'phoneNumber' | 'role'>;
