import React from 'react';
import { ArrowRightLeft, Building2, Lock, LockOpen, Pencil, Trash2 } from 'lucide-react';
import { iconButtonClass, thClass } from '../common/styles';
import { AccountStatusCell } from './AccountStatusCell';
import { ROLE_META, canUnlockUser } from './accountMeta';
import { maskPhone } from '../../../utils/incidentFormat';
import { UserRole, UserStatus, type UserResponseDto } from '../../../types/auth';

interface AccountsTableProps {
  accounts: UserResponseDto[];
  loading: boolean;
  onEdit: (account: UserResponseDto) => void;
  onLock: (account: UserResponseDto) => void;
  onUnlock: (account: UserResponseDto) => void;
  onDelete: (account: UserResponseDto) => void;
  /** Điều chuyển đội cứu hộ sang trạm khác (Operator thuộc trạm qua ô "Operator phụ trách" của trạm). */
  onTransfer: (account: UserResponseDto) => void;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

export const AccountsTable: React.FC<AccountsTableProps> = ({
  accounts,
  loading,
  onEdit,
  onLock,
  onUnlock,
  onDelete,
  onTransfer,
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
        loading ? 'opacity-60' : ''
      }`}
    >
      <table className="w-full text-sm min-w-[980px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className={thClass}>Họ tên</th>
            <th className={thClass}>Email</th>
            <th className={thClass}>SĐT</th>
            <th className={thClass}>Vai trò</th>
            <th className={thClass}>Trạm công tác</th>
            <th className={thClass}>Trạng thái</th>
            <th className={`${thClass} text-right`}>Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {accounts.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                {loading ? 'Đang tải...' : 'Không có tài khoản nào phù hợp.'}
              </td>
            </tr>
          )}
          {accounts.map((account) => {
            const role = ROLE_META[account.role as UserRole.Operator | UserRole.RescueStaff];
            const inactive = account.status === UserStatus.Inactive;
            const unlockLabel = inactive ? 'Kích hoạt tài khoản' : 'Mở khóa tài khoản';

            return (
              <tr key={account.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-semibold text-slate-900">{account.fullName}</div>
                  <div className="text-[11px] text-slate-400 font-mono-data">Tạo {formatDate(account.createdAt)}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {account.email}
                  {!account.isEmailVerified && (
                    <span className="ml-1.5 text-[10px] font-bold text-amber-600 whitespace-nowrap">· chưa xác thực</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono-data text-slate-600 whitespace-nowrap">
                  {account.phoneNumber ? maskPhone(account.phoneNumber) : '—'}
                </td>
                <td className="px-4 py-3">
                  {role && (
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${role.badgeClass}`}
                    >
                      {role.label}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {account.stationName ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {account.stationName}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <AccountStatusCell user={account} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onEdit(account)}
                      className={iconButtonClass}
                      aria-label="Sửa tài khoản"
                      title="Sửa tài khoản"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {account.role === UserRole.RescueStaff && (
                      <button
                        onClick={() => onTransfer(account)}
                        className={iconButtonClass}
                        aria-label="Chuyển trạm"
                        title="Chuyển trạm"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canUnlockUser(account) ? (
                      <button
                        onClick={() => onUnlock(account)}
                        className={iconButtonClass}
                        aria-label={unlockLabel}
                        title={unlockLabel}
                      >
                        <LockOpen className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onLock(account)}
                        className={iconButtonClass}
                        aria-label="Khóa tài khoản"
                        title="Khóa tài khoản"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(account)}
                      className={iconButtonClass}
                      aria-label="Xóa tài khoản"
                      title="Xóa tài khoản"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
