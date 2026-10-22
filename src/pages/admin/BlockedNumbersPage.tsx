import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { BlockedNumbersTable } from '../../components/admin/blocked/BlockedNumbersTable';
import {
  BLOCK_DURATIONS,
  BLOCK_DURATION_LABEL,
  BLOCK_STATUSES,
  BLOCK_STATUS_META,
  extendedExpiry,
  formatExpiry,
  isLaterExpiry,
} from '../../components/admin/blocked/blockedMeta';
import { ReasonModal } from '../../components/admin/common/ReasonModal';
import { Notice, Pagination, type NoticeState } from '../../components/admin/common/ui';
import { inputClass, labelClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery } from '../../components/admin/common/hooks';
import { blockedNumberService } from '../../services/admin/blockedNumberService';
import type { BlockDurationDto, BlockedNumberDto, BlockedNumberStatus } from '../../types/blockedNumber';

const PAGE_SIZE = 10;

const BlockedNumbersPage: React.FC = () => {
  const initial = useInitialQueryParams();
  const [search, setSearch] = useState(() => initial.text('search'));
  // Mặc định chỉ hiện số còn hiệu lực; "" = tất cả.
  const [status, setStatus] = useState<BlockedNumberStatus | ''>(() =>
    initial.text('status') === 'all' ? '' : initial.oneOf('status', BLOCK_STATUSES) || 'Active'
  );
  const [pageIndex, setPageIndex] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const params = { search: debouncedSearch, status: status || undefined, pageIndex, pageSize: PAGE_SIZE };
  const query = useServiceQuery(() => blockedNumberService.list(params), JSON.stringify(params));

  const [unblocking, setUnblocking] = useState<BlockedNumberDto | null>(null);
  const [extending, setExtending] = useState<BlockedNumberDto | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageIndex(1);
            }}
            placeholder="Số điện thoại hoặc lý do chặn..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as BlockedNumberStatus | '');
            setPageIndex(1);
          }}
          aria-label="Lọc theo trạng thái"
          className={`${inputClass} sm:w-44`}
        >
          <option value="">Tất cả trạng thái</option>
          {BLOCK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {BLOCK_STATUS_META[s].label}
            </option>
          ))}
        </select>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}

      <BlockedNumbersTable
        items={query.data?.items ?? []}
        loading={query.loading}
        onUnblock={setUnblocking}
        onExtend={setExtending}
      />

      {query.data && (
        <Pagination
          pageIndex={query.data.pageIndex}
          totalPages={query.data.totalPages}
          totalCount={query.data.totalCount}
          onChange={setPageIndex}
        />
      )}

      <p className="text-[11px] text-slate-500">
        Số bị chặn do Operator thêm khi hủy ca báo khống. Admin chỉ gỡ chặn hoặc gia hạn.
      </p>

      {unblocking && (
        <ReasonModal
          title={`Gỡ chặn số ${unblocking.maskedPhone}?`}
          confirmLabel="Gỡ chặn"
          reasonLabel="Lý do gỡ chặn"
          placeholder="VD: Xác minh lại, người báo không cố ý..."
          onCancel={() => setUnblocking(null)}
          onConfirm={async (reason) => {
            await blockedNumberService.unblock(unblocking.id, reason);
            setNotice({ kind: 'success', message: `Đã gỡ chặn số ${unblocking.maskedPhone}.` });
            setUnblocking(null);
            query.reload();
          }}
        >
          <p className="text-xs">
            Chặn {BLOCK_DURATION_LABEL[unblocking.duration].toLowerCase()}, hết hạn {formatExpiry(unblocking.expiresAt)}.
          </p>
        </ReasonModal>
      )}

      {extending && (
        <ExtendDialog
          item={extending}
          onCancel={() => setExtending(null)}
          onDone={(message) => {
            setNotice({ kind: 'success', message });
            setExtending(null);
            query.reload();
          }}
        />
      )}
    </div>
  );
};

const ExtendDialog: React.FC<{
  item: BlockedNumberDto;
  onCancel: () => void;
  onDone: (message: string) => void;
}> = ({ item, onCancel, onDone }) => {
  const [duration, setDuration] = useState<BlockDurationDto | ''>('');
  // Xem trước hạn mới (tính từ lúc mở hộp thoại); backend tính lại khi lưu.
  const [openedAt] = useState(() => new Date());
  const nextExpiry = duration ? extendedExpiry(duration, openedAt) : undefined;
  const valid = nextExpiry !== undefined && isLaterExpiry(nextExpiry, item.expiresAt);

  return (
    <ReasonModal
      title={`Gia hạn chặn số ${item.maskedPhone}`}
      confirmLabel="Gia hạn"
      reasonLabel="Lý do gia hạn"
      placeholder="VD: Tiếp tục báo khống sau khi bị chặn..."
      extraValid={valid}
      onCancel={onCancel}
      onConfirm={async (reason) => {
        if (!duration) return;
        const updated = await blockedNumberService.extend(item.id, duration, reason);
        onDone(`Đã gia hạn chặn số ${item.maskedPhone} tới ${formatExpiry(updated.expiresAt)}.`);
      }}
    >
      <p className="text-xs">
        Hiện tại: {BLOCK_DURATION_LABEL[item.duration]}, hết hạn <span className="font-semibold">{formatExpiry(item.expiresAt)}</span>
        {item.status === 'Expired' && ' (đã hết hạn)'}.
      </p>
      <div className="space-y-1.5">
        <span className={labelClass}>Thời hạn mới (tính từ hôm nay) *</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BLOCK_DURATIONS.map((d) => {
            const candidate = extendedExpiry(d, openedAt);
            const allowed = isLaterExpiry(candidate, item.expiresAt);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                disabled={!allowed}
                title={allowed ? `Hết hạn ${formatExpiry(candidate)}` : 'Hạn mới phải sau hạn hiện tại'}
                className={`py-2 rounded-lg border text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  duration === d ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
              >
                {BLOCK_DURATION_LABEL[d]}
              </button>
            );
          })}
        </div>
        {nextExpiry !== undefined && (
          <p className="text-[11px] text-slate-500">
            Hạn mới: <span className="font-semibold">{formatExpiry(nextExpiry)}</span>
          </p>
        )}
      </div>
    </ReasonModal>
  );
};

export default BlockedNumbersPage;
