import React, { useState } from 'react';
import { Info, Search } from 'lucide-react';
import { CitizensTable } from '../../components/admin/citizens/CitizensTable';
import { ReasonModal } from '../../components/admin/common/ReasonModal';
import { Notice, Pagination, type NoticeState } from '../../components/admin/common/ui';
import { inputClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery } from '../../components/admin/common/hooks';
import { citizenAdminService } from '../../services/admin/citizenAdminService';
import type { CitizenListItem, CitizenStatus } from '../../types/adminCitizen';

const PAGE_SIZE = 10;
const STATUSES: CitizenStatus[] = ['none', 'admin'];
const STATUS_LABEL: Record<CitizenStatus, string> = { none: 'Hoạt động', admin: 'Bị khóa' };

const CitizensPage: React.FC = () => {
  const initial = useInitialQueryParams();
  const [search, setSearch] = useState(() => initial.text('search'));
  const [status, setStatus] = useState<CitizenStatus | ''>(() => initial.oneOf('status', STATUSES));
  const [sortByFalseReports, setSortByFalseReports] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const params = {
    search: debouncedSearch,
    status: status || undefined,
    sort: sortByFalseReports ? ('false_reports_desc' as const) : undefined,
    pageIndex,
    pageSize: PAGE_SIZE,
  };
  const query = useServiceQuery(() => citizenAdminService.list(params), JSON.stringify(params));

  const [target, setTarget] = useState<{ citizen: CitizenListItem; mode: 'lock' | 'unlock' } | null>(null);
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
            placeholder="Tìm theo họ tên hoặc 3 số cuối SĐT..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as CitizenStatus | '');
            setPageIndex(1);
          }}
          aria-label="Lọc theo trạng thái"
          className={`${inputClass} sm:w-44`}
        >
          <option value="">Tất cả trạng thái</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}

      <CitizensTable
        citizens={query.data?.items ?? []}
        loading={query.loading}
        sortByFalseReports={sortByFalseReports}
        onToggleSort={() => {
          setSortByFalseReports((v) => !v);
          setPageIndex(1);
        }}
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
        Admin chỉ xem và khóa/mở khóa tài khoản Citizen. Không xem được SĐT đầy đủ, hồ sơ y tế hay danh bạ khẩn cấp.
      </p>

      {target && (
        <ReasonModal
          title={
            target.mode === 'lock'
              ? `Khóa tài khoản ${target.citizen.fullName}?`
              : `Mở khóa tài khoản ${target.citizen.fullName}?`
          }
          confirmLabel={target.mode === 'lock' ? 'Khóa tài khoản' : 'Mở khóa'}
          reasonLabel={target.mode === 'lock' ? 'Lý do khóa' : 'Lý do mở khóa'}
          placeholder={target.mode === 'lock' ? 'VD: Báo khống nhiều lần, đổi số để tránh bị chặn...' : 'VD: Đã xác minh, cho phép sử dụng lại...'}
          onCancel={() => setTarget(null)}
          onConfirm={async (reason) => {
            const { citizen, mode } = target;
            if (mode === 'lock') await citizenAdminService.lock(citizen.id, reason);
            else await citizenAdminService.unlock(citizen.id, reason);
            setNotice({ kind: 'success', message: `Đã ${mode === 'lock' ? 'khóa' : 'mở khóa'} tài khoản ${citizen.fullName}.` });
            setTarget(null);
            query.reload();
          }}
        >
          {target.mode === 'lock' ? (
            <>
              <div className="flex gap-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-xs">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Khóa chỉ chặn đăng nhập và báo sự cố mới. Sự cố đang xử lý của người này vẫn tiếp tục.</p>
              </div>
              <p className="text-xs">
                {target.citizen.maskedPhone} · {target.citizen.reportedIncidentCount} sự cố đã báo ·{' '}
                {target.citizen.falseReportCount} ca báo khống
              </p>
            </>
          ) : (
            target.citizen.lock.kind === 'admin' && (
              <p className="text-xs">
                Lý do khóa trước đó: <span className="italic">{target.citizen.lock.reason}</span>
              </p>
            )
          )}
        </ReasonModal>
      )}
    </div>
  );
};

export default CitizensPage;
