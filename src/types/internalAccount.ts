import { UserRole } from './auth';

// Tài khoản nội bộ Admin quản lý: chỉ Operator và RescueStaff (Admin không tạo được Admin khác).
export type InternalRole = UserRole.Operator | UserRole.RescueStaff;

/** Body của POST /api/users (CreateUserDto) — Admin đặt mật khẩu ban đầu. */
export interface CreateInternalAccountDto {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: InternalRole;
  stationId: string | null;
}

/** Các trường Admin sửa được qua PUT /api/users/{id} (email không đổi được). */
export type InternalAccountInput = Pick<CreateInternalAccountDto, 'fullName' | 'phoneNumber' | 'role' | 'stationId'>;
