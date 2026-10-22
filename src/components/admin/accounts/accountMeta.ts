import { UserRole, UserStatus, type UserResponseDto } from '../../../types/auth';
import type { AdminUserDto, InternalRole } from '../../../types/internalAccount';

export const INTERNAL_ROLES: InternalRole[] = [UserRole.Operator, UserRole.RescueStaff];

export const ROLE_META: Record<InternalRole, { label: string; description: string; badgeClass: string }> = {
  [UserRole.Operator]: {
    label: 'Điều phối viên',
    description: 'Duyệt sự cố, điều phối xe tại Command Center.',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [UserRole.RescueStaff]: {
    label: 'Đội cứu hộ',
    description: 'Nhận nhiệm vụ trên Staff App. Trưởng trạm xếp vào tổ ở màn Trạm & Tổ.',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

export const ACCOUNT_STATUSES: UserStatus[] = [UserStatus.Active, UserStatus.Inactive, UserStatus.Suspended];

export const ACCOUNT_STATUS_META: Record<UserStatus, { label: string; badgeClass: string }> = {
  [UserStatus.Active]: { label: 'Hoạt động', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  [UserStatus.Inactive]: { label: 'Chưa kích hoạt', badgeClass: 'bg-slate-100 text-slate-600 border-slate-300' },
  [UserStatus.Suspended]: { label: 'Bị khóa', badgeClass: 'bg-red-50 text-red-700 border-red-200' },
};

/** Khóa tạm do đăng nhập sai còn hiệu lực → thời điểm hết khóa, ngược lại null. */
export function tempLockoutEnd(user: UserResponseDto, now = Date.now()): string | null {
  const end = (user as AdminUserDto).lockoutEndUtc;
  return end && new Date(end).getTime() > now ? end : null;
}

/** Mở khóa được: bị Admin khóa, chưa kích hoạt, hoặc đang khóa tạm do đăng nhập sai. */
export const canUnlockUser = (user: UserResponseDto) =>
  user.status === UserStatus.Suspended || user.status === UserStatus.Inactive || !!tempLockoutEnd(user);
