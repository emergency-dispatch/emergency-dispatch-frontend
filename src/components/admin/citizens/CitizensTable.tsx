import React from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { iconButtonClass, thClass } from '../common/styles';
import { AccountStatusCell } from '../accounts/AccountStatusCell';
import { canUnlockUser } from '../accounts/accountMeta';
import { maskPhone } from '../../../utils/incidentFormat';
import { UserStatus, type UserResponseDto } from '../../../types/auth';
import { dateLocale, useTranslation } from '../../../i18n';

interface CitizensTableProps {
  citizens: UserResponseDto[];
  loading: boolean;
  onLock: (citizen: UserResponseDto) => void;
  onUnlock: (citizen: UserResponseDto) => void;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(dateLocale());

export const CitizensTable: React.FC<CitizensTableProps> = ({ citizens, loading, onLock, onUnlock }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
        loading ? 'opacity-60' : ''
      }`}
    >
      <table className="w-full text-sm min-w-[860px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className={thClass}>{t('admin.users.table.fullName')}</th>
            <th className={thClass}>{t('admin.users.table.email')}</th>
            <th className={thClass}>{t('admin.users.table.phone')}</th>
            <th className={thClass}>{t('admin.users.table.registeredAt')}</th>
            <th className={thClass}>{t('admin.common.status')}</th>
            <th className={`${thClass} text-right`}>{t('admin.common.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {citizens.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                {loading ? t('admin.common.loading') : t('admin.users.table.empty')}
              </td>
            </tr>
          )}
          {citizens.map((c) => {
            const canUnlock = canUnlockUser(c);
            const unlockLabel = c.status === UserStatus.Inactive ? t('admin.users.citizens.activate') : t('admin.users.citizens.unlock');
            return (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{c.fullName}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.email}
                  {!c.isEmailVerified && (
                    <span className="ml-1.5 text-[10px] font-bold text-amber-600 whitespace-nowrap">{t('admin.users.unverified')}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono-data text-slate-600 whitespace-nowrap">
                  {c.phoneNumber ? maskPhone(c.phoneNumber) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono-data whitespace-nowrap">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3">
                  <AccountStatusCell user={c} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    {canUnlock ? (
                      <button
                        onClick={() => onUnlock(c)}
                        className={iconButtonClass}
                        aria-label={unlockLabel}
                        title={unlockLabel}
                      >
                        <LockOpen className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onLock(c)}
                        className={iconButtonClass}
                        aria-label={t('admin.users.table.lock')}
                        title={t('admin.users.table.lock')}
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
