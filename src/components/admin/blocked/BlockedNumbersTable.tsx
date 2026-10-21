import React from 'react';
import { CalendarPlus, ShieldOff } from 'lucide-react';
import { LockableButton } from '../common/ui';
import { iconButtonClass, thClass } from '../common/styles';
import { BLOCK_DURATION_LABEL, BLOCK_STATUS_META, formatExpiry } from './blockedMeta';
import type { BlockedNumberListItem } from '../../../types/blockedNumber';

interface BlockedNumbersTableProps {
  items: BlockedNumberListItem[];
  loading: boolean;
  onUnblock: (item: BlockedNumberListItem) => void;
  onExtend: (item: BlockedNumberListItem) => void;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

export const BlockedNumbersTable: React.FC<BlockedNumbersTableProps> = ({ items, loading, onUnblock, onExtend }) => (
  <div
    className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
      loading ? 'opacity-60' : ''
    }`}
  >
    <table className="w-full text-sm min-w-[1100px]">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-left">
          <th className={thClass}>SĐT</th>
          <th className={thClass}>Thời hạn</th>
          <th className={thClass}>Ngày chặn</th>
          <th className={thClass}>Hết hạn</th>
          <th className={thClass}>Người chặn</th>
          <th className={thClass}>Sự cố</th>
          <th className={thClass}>Lý do</th>
          <th className={thClass}>Trạng thái</th>
          <th className={`${thClass} text-right`}>Hành động</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.length === 0 && (
          <tr>
            <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">
              {loading ? 'Đang tải...' : 'Không có số nào phù hợp.'}
            </td>
          </tr>
        )}
        {items.map((b) => {
          const status = BLOCK_STATUS_META[b.status];
          const active = b.status === 'active';
          const extendLocked = !active
            ? 'Chỉ gia hạn được số đang còn hiệu lực.'
            : b.expiresAt === null
              ? 'Số này đã bị chặn vĩnh viễn.'
              : null;
          return (
            <tr key={b.id} className={active ? 'hover:bg-slate-50' : 'bg-slate-50/60 text-slate-500'}>
              <td className="px-4 py-3 font-mono-data font-semibold text-slate-800 whitespace-nowrap">{b.maskedPhone}</td>
              <td className="px-4 py-3 whitespace-nowrap">{BLOCK_DURATION_LABEL[b.duration]}</td>
              <td className="px-4 py-3 font-mono-data text-slate-500 whitespace-nowrap">{formatDate(b.blockedAt)}</td>
              <td className="px-4 py-3 font-mono-data whitespace-nowrap">
                {formatExpiry(b.expiresAt)}
                {b.lastExtendedAt && <div className="text-[10px] text-slate-400">gia hạn {formatDate(b.lastExtendedAt)}</div>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{b.blockedByName}</td>
              <td className="px-4 py-3 font-mono-data text-slate-600 whitespace-nowrap">{b.incidentId}</td>
              <td className="px-4 py-3 text-xs max-w-[240px]">
                <span className="line-clamp-2" title={b.reason}>
                  {b.reason}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${status.badgeClass}`}
                >
                  {status.label}
                </span>
                {b.status === 'removed' && b.removedAt && (
                  <div className="mt-1 text-[10px] text-slate-400 max-w-[180px]" title={b.removeReason ?? undefined}>
                    {b.removedByName} · {formatDate(b.removedAt)}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  <LockableButton
                    onClick={() => onExtend(b)}
                    className={iconButtonClass}
                    aria-label="Gia hạn"
                    title="Gia hạn"
                    lockedReason={extendLocked}
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                  </LockableButton>
                  <LockableButton
                    onClick={() => onUnblock(b)}
                    className={iconButtonClass}
                    aria-label="Gỡ chặn"
                    title="Gỡ chặn"
                    lockedReason={active ? null : 'Số này không còn bị chặn.'}
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
