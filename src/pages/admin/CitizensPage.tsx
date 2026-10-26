import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { AccountActionDialog } from '../../components/admin/accounts/AccountActionDialog';
import { ACCOUNT_STATUSES } from '../../components/admin/accounts/accountMeta';
import { CitizensTable } from '../../components/admin/citizens/CitizensTable';
import { Notice, Pagination, type NoticeState } from '../../components/admin/common/ui';
import { inputClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery } from '../../components/admin/common/hooks';
import { citizenAdminService } from '../../services/admin/citizenAdminService';
import type { UserResponseDto, UserStatus } from '../../types/auth';
import { useTranslation } from '../../i18n';

const PAGE_SIZE = 10;

const CitizensPage: React.FC = () => {
  const { t } = useTranslation();
  const initial = useInitialQueryParams();
  const [search, setSearch] = useState(() => initial.text('search'));
  const [status, setStatus] = useState<UserStatus | ''>(() => initial.oneOf('status', ACCOUNT_STATUSES));
  const [pageIndex, setPageIndex] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const params = { search: debouncedSearch, status: status || undefined, pageIndex, pageSize: PAGE_SIZE };
  const query = useServiceQuery(() => citizenAdminService.list(params), JSON.stringify(params));

  const [target, setTarget] = useState<{ citizen: UserResponseDto; mode: 'lock' | 'unlock' } | null>(null);
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
            placeholder={t('admin.users.citizens.searchPlaceholder')}
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as UserStatus | '');
            setPageIndex(1);
          }}
          aria-label={t('admin.common.filterByStatus')}
          className={`${inputClass} sm:w-44`}
        >
          <option value="">{t('admin.common.allStatuses')}</option>
          {ACCOUNT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`admin.users.accountStatus.${s}`)}
            </option>
          ))}
        </select>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}

      <CitizensTable
        citizens={query.data?.items ?? []}
        loading={query.loading}
        onLock={(citizen) => setTarget({ citizen, mode: 'lock' })}
        onUnlock={(citizen) => setTarget({ citizen, mode: 'unlock' })}
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
        {t('admin.users.citizens.note')}
      </p>

      {target && (
        <AccountActionDialog
          account={target.citizen}
          mode={target.mode}
          onCancel={() => setTarget(null)}
          onDone={() => {
            const { citizen, mode } = target;
            setNotice({ kind: 'success', message: t(`admin.users.done.${mode}`, { name: citizen.fullName }) });
            setTarget(null);
            query.reload();
          }}
        />
      )}
    </div>
  );
};

export default CitizensPage;
