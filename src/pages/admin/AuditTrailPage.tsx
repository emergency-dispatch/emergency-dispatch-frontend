import React, { useState } from 'react';
import { Lock, Search, X } from 'lucide-react';
import { AuditDetailDrawer } from '../../components/admin/audit/AuditDetailDrawer';
import { AuditTrailTable } from '../../components/admin/audit/AuditTrailTable';
import {
  ACTOR_ROLE_LABEL,
  AUDIT_ACTION_LABEL,
  AUDIT_GROUPS,
  AUDIT_GROUP_META,
  toYmd,
} from '../../components/admin/audit/auditMeta';
import { Notice, Pagination } from '../../components/admin/common/ui';
import { inputClass, labelClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery } from '../../components/admin/common/hooks';
import { auditTrailService } from '../../services/admin/auditTrailService';
import { AUDIT_ACTION_GROUP, type AuditAction, type AuditActionGroup, type AuditTrailEntry } from '../../types/auditTrail';

const PAGE_SIZE = 20;
const ALL_ACTIONS = Object.keys(AUDIT_ACTION_LABEL) as AuditAction[];
const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const daysAgoYmd = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toYmd(d);
};

const QUICK_RANGES: { label: string; days: number }[] = [
  { label: 'Hôm nay', days: 0 },
  { label: '7 ngày', days: 6 },
  { label: '30 ngày', days: 29 },
];

const AuditTrailPage: React.FC = () => {
  const initial = useInitialQueryParams();
  const dateParam = (key: string) => (YMD_PATTERN.test(initial.text(key)) ? initial.text(key) : '');

  const [incidentId, setIncidentId] = useState(() => initial.text('incident'));
  const [actorId, setActorId] = useState(() => initial.text('actor'));
  const [group, setGroup] = useState<AuditActionGroup | ''>(() => initial.oneOf('group', AUDIT_GROUPS));
  const [action, setAction] = useState<AuditAction | ''>(() => initial.oneOf('action', ALL_ACTIONS));
  const [fromDate, setFromDate] = useState(() => dateParam('from'));
  const [toDate, setToDate] = useState(() => dateParam('to'));
  const [pageIndex, setPageIndex] = useState(1);
  const debouncedIncident = useDebouncedValue(incidentId);
  const [selected, setSelected] = useState<AuditTrailEntry | null>(null);

  const filter = {
    incidentId: debouncedIncident || undefined,
    actorId: actorId || undefined,
    group: group || undefined,
    action: action || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };
  const query = useServiceQuery(
    () => auditTrailService.list(filter, { pageIndex, pageSize: PAGE_SIZE }),
    JSON.stringify({ filter, pageIndex })
  );
  const actors = useServiceQuery(() => auditTrailService.listActors(), 'audit-actors');

  // Loại hành động chỉ liệt kê trong nhóm đang chọn.
  const actionOptions = group ? ALL_ACTIONS.filter((a) => AUDIT_ACTION_GROUP[a] === group) : ALL_ACTIONS;

  const withPageReset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPageIndex(1);
    };

  const activeQuick = QUICK_RANGES.find((r) => fromDate === daysAgoYmd(r.days) && toDate === daysAgoYmd(0));
  const hasFilter = !!(incidentId || actorId || group || action || fromDate || toDate);

  const clearFilters = () => {
    setIncidentId('');
    setActorId('');
    setGroup('');
    setAction('');
    setFromDate('');
    setToDate('');
    setPageIndex(1);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>Mã sự cố</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={incidentId}
                onChange={(e) => withPageReset(setIncidentId)(e.target.value)}
                placeholder="VD: inc-2041"
                className={`${inputClass} pl-9 font-mono-data`}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Người thao tác</label>
            <select value={actorId} onChange={(e) => withPageReset(setActorId)(e.target.value)} className={inputClass}>
              <option value="">Tất cả</option>
              {(actors.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({ACTOR_ROLE_LABEL[a.role]})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Nhóm hành động</label>
            <select
              value={group}
              onChange={(e) => {
                const next = e.target.value as AuditActionGroup | '';
                withPageReset(setGroup)(next);
                if (next && action && AUDIT_ACTION_GROUP[action] !== next) setAction('');
              }}
              className={inputClass}
            >
              <option value="">Tất cả nhóm</option>
              {AUDIT_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {AUDIT_GROUP_META[g].label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Loại hành động</label>
            <select
              value={action}
              onChange={(e) => withPageReset(setAction)(e.target.value as AuditAction | '')}
              className={inputClass}
            >
              <option value="">Tất cả loại</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {AUDIT_ACTION_LABEL[a]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="space-y-1.5">
            <span className={labelClass}>Khoảng ngày</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => withPageReset(setFromDate)(e.target.value)}
                aria-label="Từ ngày"
                className={`${inputClass} sm:w-40`}
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => withPageReset(setToDate)(e.target.value)}
                aria-label="Đến ngày"
                className={`${inputClass} sm:w-40`}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => {
                  setFromDate(daysAgoYmd(r.days));
                  setToDate(daysAgoYmd(0));
                  setPageIndex(1);
                }}
                className={`px-3 py-2.5 rounded-lg border text-xs font-bold transition-colors ${
                  activeQuick === r ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
              >
                {r.label}
              </button>
            ))}
            {hasFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-3.5 h-3.5" />
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Lock className="w-3.5 h-3.5" />
        Nhật ký chỉ đọc, không thể sửa hoặc xóa.
      </p>

      {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}

      <AuditTrailTable
        entries={query.data?.items ?? []}
        loading={query.loading}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
      />

      {query.data && (
        <Pagination
          pageIndex={query.data.pageIndex}
          totalPages={query.data.totalPages}
          totalCount={query.data.totalCount}
          onChange={setPageIndex}
        />
      )}

      {selected && <AuditDetailDrawer entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default AuditTrailPage;
