import { UserRole } from '../../../types/auth';
import type { AccountStatus, InternalAccount, InternalRole } from '../../../types/internalAccount';

export const INTERNAL_ROLES: InternalRole[] = [UserRole.Operator, UserRole.RescueStaff];

export const ROLE_META: Record<InternalRole, { label: string; description: string; badgeClass: string }> = {
  [UserRole.Operator]: {
    label: 'Điều phối viên',
    description: 'Duyệt sự cố, điều phối xe tại Command Center. Có thể được gán làm trưởng trạm.',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [UserRole.RescueStaff]: {
    label: 'Đội cứu hộ',
    description: 'Nhận nhiệm vụ trên Staff App. Có thể được gán làm nhân sự phụ trách xe.',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

export const ACCOUNT_STATUS_META: Record<AccountStatus, { label: string; badgeClass: string }> = {
  none: { label: 'Hoạt động', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed_login: { label: 'Khóa tạm (sai mật khẩu)', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  admin: { label: 'Bị Admin khóa', badgeClass: 'bg-red-50 text-red-700 border-red-200' },
};

export const ACCOUNT_STATUS_ORDER: AccountStatus[] = ['none', 'failed_login', 'admin'];

/** Khóa tạm 15 phút hết hạn ngay trên màn hình mà không cần tải lại danh sách. */
export function displayStatus(account: InternalAccount, now: number): AccountStatus {
  if (account.lock.kind === 'failed_login' && new Date(account.lock.until).getTime() <= now) return 'none';
  return account.lock.kind;
}
