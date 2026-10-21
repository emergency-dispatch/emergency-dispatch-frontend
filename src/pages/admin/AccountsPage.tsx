import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { AccountFormDrawer } from '../../components/admin/accounts/AccountFormDrawer';
import { AccountsTable } from '../../components/admin/accounts/AccountsTable';
import { AccountActionDialog } from '../../components/admin/accounts/AccountActionDialog';
import { ACCOUNT_STATUSES, ACCOUNT_STATUS_META, INTERNAL_ROLES, ROLE_META } from '../../components/admin/accounts/accountMeta';
import { Notice, Pagination, type NoticeState } from '../../components/admin/common/ui';
import { inputClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery } from '../../components/admin/common/hooks';
import { accountAdminService } from '../../services/admin/accountAdminService';
import type { UserResponseDto, UserStatus } from '../../types/auth';
import type { InternalRole } from '../../types/internalAccount';

const PAGE_SIZE = 10;

const DONE_MESSAGE = {
  lock: (name: string) => `Đã khóa tài khoản ${name}.`,
  unlock: (name: string) => `Đã mở khóa tài khoản ${name}.`,
  delete: (name: string) => `Đã xóa tài khoản ${name}.`,
};

const AccountsPage: React.FC = () => {
  const initial = useInitialQueryParams();
  const [search, setSearch] = useState(() => initial.text('search'));
  const [role, setRole] = useState<InternalRole | ''>(() => initial.oneOf('role', INTERNAL_ROLES));
  const [status, setStatus] = useState<UserStatus | ''>(() => initial.oneOf('status', ACCOUNT_STATUSES));
  const [pageIndex, setPageIndex] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const params = {
    search: debouncedSearch,
    role: role || undefined,
    status: status || undefined,
    pageIndex,
    pageSize: PAGE_SIZE,
  };
  const query = useServiceQuery(() => accountAdminService.listAccounts(params), JSON.stringify(params));

  const [formAccount, setFormAccount] = useState<UserResponseDto | 'new' | null>(null);
  const [actionTarget, setActionTarget] = useState<{
    account: UserResponseDto;
    mode: 'lock' | 'unlock' | 'delete';
  } | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const withPageReset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPageIndex(1);
    };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 lg:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => withPageReset(setSearch)(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:flex">
          <select
            value={role}
            onChange={(e) => withPageReset(setRole)(e.target.value as InternalRole | '')}
            aria-label="Lọc theo vai trò"
            className={`${inputClass} lg:w-44`}
          >
            <option value="">Tất cả vai trò</option>
            {INTERNAL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_META[r].label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => withPageReset(setStatus)(e.target.value as UserStatus | '')}
            aria-label="Lọc theo trạng thái"
            className={`${inputClass} lg:w-44`}
          >
            <option value="">Tất cả trạng thái</option>
            {ACCOUNT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ACCOUNT_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setFormAccount('new')}
          className="lg:ml-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/25 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Tạo tài khoản
        </button>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}

      <AccountsTable
        accounts={query.data?.items ?? []}
        loading={query.loading}
        onEdit={setFormAccount}
        onLock={(account) => setActionTarget({ account, mode: 'lock' })}
        onUnlock={(account) => setActionTarget({ account, mode: 'unlock' })}
        onDelete={(account) => setActionTarget({ account, mode: 'delete' })}
      />

      {query.data && (
        <Pagination
          pageIndex={query.data.pageIndex}
          totalPages={query.data.totalPages}
          totalCount={query.data.totalCount}
          onChange={setPageIndex}
        />
      )}

      {formAccount && (
        <AccountFormDrawer
          initialAccount={formAccount === 'new' ? null : formAccount}
          onClose={() => setFormAccount(null)}
          onSaved={(saved) => {
            setNotice({
              kind: 'success',
              message:
                formAccount === 'new'
                  ? `Đã tạo tài khoản ${saved.fullName}. Gửi email và mật khẩu ban đầu cho nhân sự để đăng nhập.`
                  : `Đã cập nhật tài khoản ${saved.fullName}.`,
            });
            setFormAccount(null);
            query.reload();
          }}
        />
      )}

      {actionTarget && (
        <AccountActionDialog
          account={actionTarget.account}
          mode={actionTarget.mode}
          onCancel={() => setActionTarget(null)}
          onDone={() => {
            setNotice({ kind: 'success', message: DONE_MESSAGE[actionTarget.mode](actionTarget.account.fullName) });
            setActionTarget(null);
            query.reload();
          }}
        />
      )}
    </div>
  );
};

export default AccountsPage;
