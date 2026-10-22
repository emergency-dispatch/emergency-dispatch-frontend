import React from 'react';
import { ACCOUNT_STATUS_META, tempLockoutEnd } from './accountMeta';
import { UserStatus, type UserResponseDto } from '../../../types/auth';
import type { AdminUserDto } from '../../../types/internalAccount';

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/** Badge trạng thái + lý do khóa (Admin khóa) hoặc hạn khóa tạm (đăng nhập sai 5 lần). */
export const AccountStatusCell: React.FC<{ user: UserResponseDto }> = ({ user }) => {
  const meta = ACCOUNT_STATUS_META[user.status];
  const lockReason = (user as AdminUserDto).lockReason;
  const lockoutEnd = tempLockoutEnd(user);

  return (
    <div className="space-y-1">
      <span
        className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${meta.badgeClass}`}
      >
        {meta.label}
      </span>
      {lockoutEnd && (
        <div className="text-[10px] font-semibold text-amber-700 whitespace-nowrap">
          Khóa tạm (sai mật khẩu) đến {formatTime(lockoutEnd)}
        </div>
      )}
      {user.status === UserStatus.Suspended && lockReason && (
        <div className="text-[10px] text-slate-500 max-w-[200px] line-clamp-2" title={lockReason}>
          {lockReason}
        </div>
      )}
    </div>
  );
};
