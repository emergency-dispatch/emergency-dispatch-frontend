import React from 'react';
import { CalendarPlus, ShieldOff } from 'lucide-react';
import { LockableButton } from '../common/ui';
import { iconButtonClass, thClass } from '../common/styles';
import { BLOCK_STATUS_META, formatExpiry } from './blockedMeta';
import type { BlockedNumberDto } from '../../../types/blockedNumber';
import { dateLocale, useTranslation } from '../../../i18n';

interface BlockedNumbersTableProps {
  items: BlockedNumberDto[];
  loading: boolean;
  onUnblock: (item: BlockedNumberDto) => void;
  onExtend: (item: BlockedNumberDto) => void;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(dateLocale());

export const BlockedNumbersTable: React.FC<BlockedNumbersTableProps> = ({ items, loading, onUnblock, onExtend }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${loading ? 'opacity-60' : ''
        }`}
    >
      <table className="w-full text-sm min-w-[1100px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className={thClass}>{t('admin.users.blocked.table.phone')}</th>
            <th className={thClass}>{t('admin.users.blocked.table.duration')}</th>
            <th className={thClass}>{t('admin.users.blocked.table.blockedAt')}</th>
            <th className={thClass}>{t('admin.users.blocked.table.expiresAt')}</th>
            <th className={thClass}>{t('admin.users.blocked.table.blockedBy')}</th>
            <th className={thClass}>{t('admin.users.blocked.table.incident')}</th>
            <th className={thClass}>{t('admin.users.blocked.table.reason')}</th>
            <th className={thClass}>{t('admin.common.status')}</th>
            <th className={`${thClass} text-right`}>{t('admin.common.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">
                {loading ? t('admin.common.loading') : t('admin.users.blocked.table.empty')}
              </td>
            </tr>
          )}
          {items.map((b) => {
            const status = BLOCK_STATUS_META[b.status];
            const active = b.status === 'Active';
            const extendLocked =
              b.status === 'Removed'
                ? t('admin.users.blocked.table.extendLockedRemoved')
                : b.expiresAt === null
                  ? t('admin.users.blocked.table.extendLockedPermanent')
                  : null;
            return (
              <tr key={b.id} className={active ? 'hover:bg-slate-50' : 'bg-slate-50/60 text-slate-500'}>
                <td className="px-4 py-3 font-mono-data font-semibold text-slate-800 whitespace-nowrap">{b.maskedPhone}</td>
                <td className="px-4 py-3 whitespace-nowrap">{t(`admin.users.blocked.duration.${b.duration}`)}</td>
                <td className="px-4 py-3 font-mono-data text-slate-500 whitespace-nowrap">{formatDate(b.blockedAt)}</td>
                <td className="px-4 py-3 font-mono-data whitespace-nowrap">
                  {formatExpiry(b.expiresAt)}
                  {b.lastExtendedAt && <div className="text-[10px] text-slate-400">{t('admin.users.blocked.table.extendedAt', { date: formatDate(b.lastExtendedAt) })}</div>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{b.blockedByName ?? '—'}</td>
                <td className="px-4 py-3 font-mono-data text-slate-600 whitespace-nowrap" title={b.incidentId ?? undefined}>
                  {b.incidentId ? b.incidentId.slice(0, 8) : '—'}
                </td>
                <td className="px-4 py-3 text-xs max-w-[240px]">
                  <span className="line-clamp-2" title={b.reason}>
                    {b.reason}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${status.badgeClass}`}
                  >
                    {t(`admin.users.blocked.status.${b.status}`)}
                  </span>
                  {b.status === 'Removed' && b.removedAt && (
                    <div className="mt-1 text-[10px] text-slate-400 max-w-[180px]" title={b.removeReason ?? undefined}>
                      {b.removedByName ?? '—'} · {formatDate(b.removedAt)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <LockableButton
                      onClick={() => onExtend(b)}
                      className={iconButtonClass}
                      aria-label={t('admin.users.blocked.table.extend')}
                      title={t('admin.users.blocked.table.extend')}
                      lockedReason={extendLocked}
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </LockableButton>
                    <LockableButton
                      onClick={() => onUnblock(b)}
                      className={iconButtonClass}
                      aria-label={t('admin.users.blocked.table.unblock')}
                      title={t('admin.users.blocked.table.unblock')}
                      lockedReason={active ? null : t('admin.users.blocked.table.notBlocked')}
                    >
                      <ShieldOff className="w-3.5 h-3.5" />
                    </LockableButton>
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
