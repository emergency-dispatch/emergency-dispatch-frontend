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

// ---------------------------------------------------------------------------
// Chỉ còn mock Trạm & Tổ của Operator dùng (data/staffAccountSeed.ts).
// TODO(backend): bỏ khi màn Trạm & Tổ chuyển sang /api/users/station/{id}.
// ---------------------------------------------------------------------------

export type AccountLock =
  | { kind: 'none' }
  | { kind: 'failed_login'; until: string }
  | { kind: 'admin'; reason: string; lockedAt: string; lockedByName: string };

export interface InternalAccount {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: InternalRole;
  lock: AccountLock;
}
