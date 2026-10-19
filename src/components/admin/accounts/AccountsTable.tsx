import React from 'react';
import { Building2, Lock, LockOpen, Pencil, Timer, Truck } from 'lucide-react';
import { iconButtonClass, thClass } from '../common/styles';
import { ACCOUNT_STATUS_META, ROLE_META, displayStatus } from './accountMeta';
import { useNow } from '../../../hooks/useNow';
import { formatCountdown, maskPhone } from '../../../utils/incidentFormat';
import type { InternalAccountListItem } from '../../../types/internalAccount';

interface AccountsTableProps {
  accounts: InternalAccountListItem[];
  loading: boolean;
  pendingId: string | null;
  onEdit: (account: InternalAccountListItem) => void;
  onLock: (account: InternalAccountListItem) => void;
  onUnlock: (account: InternalAccountListItem) => void;
  onQuickUnlock: (account: InternalAccountListItem) => void;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

export const AccountsTable: React.FC<AccountsTableProps> = ({
  accounts,
  loading,
  pendingId,
  onEdit,
  onLock,
  onUnlock,
  onQuickUnlock,
}) => {
  const now = useNow(1000);

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
            <th className={thClass}>Trạm / xe liên quan</th>
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
            const status = displayStatus(account, now);
            const statusMeta = ACCOUNT_STATUS_META[status];
            const role = ROLE_META[account.role];
            const pending = pendingId === account.id;

            return (
              <tr key={account.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{account.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{account.email}</td>
                <td className="px-4 py-3 font-mono-data text-slate-600 whitespace-nowrap">{maskPhone(account.phoneNumber)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${role.badgeClass}`}>
                    {role.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {account.headOfStation && (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      Trưởng trạm {account.headOfStation.name}
                    </span>
                  )}
                  {account.assignedVehicle && (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      Xe <span className="font-mono-data">{account.assignedVehicle.plate}</span>
                      {account.assignedVehicle.busy && (
                        <span className="text-[10px] font-bold text-orange-600">· đang làm nhiệm vụ</span>
                      )}
                    </span>
                  )}
                  {!account.headOfStation && !account.assignedVehicle && <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${statusMeta.badgeClass}`}
                  >
                    {statusMeta.label}
                  </span>
                  {status === 'failed_login' && account.lock.kind === 'failed_login' && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-mono-data text-amber-700">
                      <Timer className="w-3 h-3" />
                      Còn {formatCountdown(new Date(account.lock.until).getTime() - now)}
                    </div>
                  )}
                  {status === 'admin' && account.lock.kind === 'admin' && (
                    <div className="mt-1 text-[11px] text-slate-500 max-w-[220px]" title={account.lock.reason}>
                      <span className="line-clamp-1">{account.lock.reason}</span>
                      <span className="font-mono-data text-slate-400">{formatDateTime(account.lock.lockedAt)}</span>
                    </div>
                  )}
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
                    {status === 'failed_login' && (
                      <button
                        onClick={() => onQuickUnlock(account)}
                        disabled={pending}
                        className="px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold whitespace-nowrap disabled:opacity-50"
                        title="Mở khóa tài khoản bị khóa tạm do sai mật khẩu 5 lần (không cần lý do)"
                      >
                        {pending ? 'Đang mở...' : 'Mở khóa nhanh'}
                      </button>
                    )}
                    {status === 'admin' ? (
                      <button
                        onClick={() => onUnlock(account)}
                        className={iconButtonClass}
                        aria-label="Mở khóa tài khoản"
                        title="Mở khóa tài khoản"
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
