import { UserRole } from './auth';

// Tài khoản nội bộ Admin quản lý: chỉ Operator và RescueStaff (Admin không tạo được Admin khác).
export type InternalRole = UserRole.Operator | UserRole.RescueStaff;

/** Mirror dự kiến của UserDto rút gọn cho màn quản trị (backend chưa có). */
export interface InternalAccount {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: InternalRole;
  isLocked: boolean;
}
