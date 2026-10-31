import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { BlockedNumbersTable } from '../../components/admin/blocked/BlockedNumbersTable';
import {
  BLOCK_DURATIONS,
  BLOCK_STATUSES,
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
import { Trans, useTranslation } from '../../i18n';

const PAGE_SIZE = 10;

const BlockedNumbersPage: React.FC = () => {
  const { t } = useTranslation();
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
            placeholder={t('admin.users.blocked.searchPlaceholder')}
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as BlockedNumberStatus | '');
            setPageIndex(1);
          }}
          aria-label={t('admin.common.filterByStatus')}
          className={`${inputClass} sm:w-44`}
        >
          <option value="">{t('admin.common.allStatuses')}</option>
          {BLOCK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`admin.users.blocked.status.${s}`)}
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
        {t('admin.users.blocked.note')}
      </p>

      {unblocking && (
        <ReasonModal
          title={t('admin.users.blocked.unblock.title', { phone: unblocking.maskedPhone })}
          confirmLabel={t('admin.users.blocked.unblock.confirm')}
          reasonLabel={t('admin.users.blocked.unblock.reasonLabel')}
          placeholder={t('admin.users.blocked.unblock.placeholder')}
          onCancel={() => setUnblocking(null)}
          onConfirm={async (reason) => {
            await blockedNumberService.unblock(unblocking.id, reason);
            setNotice({ kind: 'success', message: t('admin.users.blocked.unblock.done', { phone: unblocking.maskedPhone }) });
            setUnblocking(null);
            query.reload();
          }}
        >
          <p className="text-xs">
            {t('admin.users.blocked.unblock.summary', {
              duration: t(`admin.users.blocked.duration.${unblocking.duration}`).toLowerCase(),
              expiry: formatExpiry(unblocking.expiresAt),
            })}
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
  const { t } = useTranslation();
  const [duration, setDuration] = useState<BlockDurationDto | ''>('');
  // Xem trước hạn mới (tính từ lúc mở hộp thoại); backend tính lại khi lưu.
  const [openedAt] = useState(() => new Date());
  const nextExpiry = duration ? extendedExpiry(duration, openedAt) : undefined;
  const valid = nextExpiry !== undefined && isLaterExpiry(nextExpiry, item.expiresAt);

  return (
    <ReasonModal
      title={t('admin.users.blocked.extend.title', { phone: item.maskedPhone })}
      confirmLabel={t('admin.users.blocked.extend.confirm')}
      reasonLabel={t('admin.users.blocked.extend.reasonLabel')}
      placeholder={t('admin.users.blocked.extend.placeholder')}
      extraValid={valid}
      onCancel={onCancel}
      onConfirm={async (reason) => {
        if (!duration) return;
        const updated = await blockedNumberService.extend(item.id, duration, reason);
        onDone(t('admin.users.blocked.extend.done', { phone: item.maskedPhone, expiry: formatExpiry(updated.expiresAt) }));
      }}
    >
      <p className="text-xs">
        <Trans
          i18nKey="admin.users.blocked.extend.current"
          values={{
            duration: t(`admin.users.blocked.duration.${item.duration}`),
            expiry: formatExpiry(item.expiresAt),
            expired: item.status === 'Expired' ? t('admin.users.blocked.extend.expiredSuffix') : '',
          }}
          components={{ b: <span className="font-semibold" /> }}
        />
      </p>
      <div className="space-y-1.5">
        <span className={labelClass}>{t('admin.users.blocked.extend.newDuration')}</span>
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
                title={
                  allowed
                    ? t('admin.users.blocked.extend.expiresOn', { date: formatExpiry(candidate) })
                    : t('admin.users.blocked.extend.mustBeLater')
                }
                className={`py-2 rounded-lg border text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  duration === d ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
              >
                {t(`admin.users.blocked.duration.${d}`)}
              </button>
            );
          })}
        </div>
        {nextExpiry !== undefined && (
          <p className="text-[11px] text-slate-500">
            <Trans
              i18nKey="admin.users.blocked.extend.newExpiry"
              values={{ expiry: formatExpiry(nextExpiry) }}
              components={{ b: <span className="font-semibold" /> }}
            />
          </p>
        )}
      </div>
    </ReasonModal>
  );
};

export default BlockedNumbersPage;
