import React from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { iconButtonClass, thClass } from '../common/styles';
import { ACCOUNT_STATUS_META } from '../accounts/accountMeta';
import { maskPhone } from '../../../utils/incidentFormat';
import { UserStatus, type UserResponseDto } from '../../../types/auth';

interface CitizensTableProps {
  citizens: UserResponseDto[];
  loading: boolean;
  onLock: (citizen: UserResponseDto) => void;
  onUnlock: (citizen: UserResponseDto) => void;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

export const CitizensTable: React.FC<CitizensTableProps> = ({ citizens, loading, onLock, onUnlock }) => (
  <div
    className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
      loading ? 'opacity-60' : ''
    }`}
  >
    <table className="w-full text-sm min-w-[860px]">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-left">
          <th className={thClass}>Họ tên</th>
          <th className={thClass}>Email</th>
          <th className={thClass}>SĐT</th>
          <th className={thClass}>Ngày đăng ký</th>
          <th className={thClass}>Trạng thái</th>
          <th className={`${thClass} text-right`}>Hành động</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {citizens.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
              {loading ? 'Đang tải...' : 'Không có tài khoản nào phù hợp.'}
            </td>
          </tr>
        )}
        {citizens.map((c) => {
          const statusMeta = ACCOUNT_STATUS_META[c.status];
          const canUnlock = c.status === UserStatus.Suspended || c.status === UserStatus.Inactive;
          return (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{c.fullName}</td>
              <td className="px-4 py-3 text-slate-600">
                {c.email}
                {!c.isEmailVerified && (
                  <span className="ml-1.5 text-[10px] font-bold text-amber-600 whitespace-nowrap">· chưa xác thực</span>
                )}
              </td>
              <td className="px-4 py-3 font-mono-data text-slate-600 whitespace-nowrap">
                {c.phoneNumber ? maskPhone(c.phoneNumber) : '—'}
              </td>
              <td className="px-4 py-3 text-slate-500 font-mono-data whitespace-nowrap">{formatDate(c.createdAt)}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${statusMeta.badgeClass}`}
                >
                  {statusMeta.label}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  {canUnlock ? (
                    <button
                      onClick={() => onUnlock(c)}
                      className={iconButtonClass}
                      aria-label={c.status === UserStatus.Suspended ? 'Mở khóa' : 'Kích hoạt'}
                      title={c.status === UserStatus.Suspended ? 'Mở khóa' : 'Kích hoạt'}
                    >
                      <LockOpen className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => onLock(c)} className={iconButtonClass} aria-label="Khóa tài khoản" title="Khóa tài khoản">
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
