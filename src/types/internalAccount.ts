import { UserRole } from './auth';

// Tài khoản nội bộ Admin quản lý: chỉ Operator và RescueStaff (Admin không tạo được Admin khác).
export type InternalRole = UserRole.Operator | UserRole.RescueStaff;

/**
 * Trạng thái khóa:
 * - failed_login: hệ thống tự khóa 15 phút do sai mật khẩu 5 lần (mở nhanh không cần lý do).
 * - admin: Admin khóa thủ công, bắt buộc lý do.
 */
export type AccountLock =
  | { kind: 'none' }
  | { kind: 'failed_login'; until: string }
  | { kind: 'admin'; reason: string; lockedAt: string; lockedByName: string };

export type AccountStatus = AccountLock['kind'];

/** Mirror dự kiến của UserDto rút gọn cho màn quản trị (backend chưa có). */
export interface InternalAccount {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: InternalRole;
  lock: AccountLock;
}

/** Dòng trong danh sách: kèm trạm liên quan để hiển thị và cảnh báo khi khóa. */
export interface InternalAccountListItem extends InternalAccount {
  /** Operator: trạm đang làm trưởng (chỉ trạm chưa xóa). */
  headOfStation: { id: string; name: string } | null;
}

export interface InternalAccountInput {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: InternalRole;
}
