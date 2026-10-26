import React, { useState } from 'react';
import { Lock, Search, X } from 'lucide-react';
import { DateRangeFilter, YMD_PATTERN } from '../common/DateRangeFilter';
import { AuditDetailDrawer } from './AuditDetailDrawer';
import { AuditTrailTable } from './AuditTrailTable';
import { auditActionMeta } from './auditMeta';
import { Notice, Pagination } from '../common/ui';
import { inputClass, labelClass } from '../common/styles';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery } from '../common/hooks';
import { GUID_PATTERN, auditTrailService } from '../../../services/admin/auditTrailService';
import { AUDIT_ACTIONS, type AuditAction, type AuditTrailEntryDto } from '../../../types/auditTrail';
import { useTranslation } from '../../../i18n';

const PAGE_SIZE = 20;

/** Nhật ký thao tác trên sự cố (thẩm định, điều xe, leo thang, hiện số, chặn số…). */
export const IncidentAuditTab: React.FC = () => {
  const { t } = useTranslation();
  const initial = useInitialQueryParams();
  const dateParam = (key: string) => (YMD_PATTERN.test(initial.text(key)) ? initial.text(key) : '');

  const [incidentId, setIncidentId] = useState(() => initial.text('incident'));
  const [action, setAction] = useState<AuditAction | ''>(() => initial.oneOf('action', AUDIT_ACTIONS));
  const [fromDate, setFromDate] = useState(() => dateParam('from'));
  const [toDate, setToDate] = useState(() => dateParam('to'));
  const [pageIndex, setPageIndex] = useState(1);
  const debouncedIncident = useDebouncedValue(incidentId.trim());
  const [selected, setSelected] = useState<AuditTrailEntryDto | null>(null);

  // Backend chỉ lọc theo mã sự cố đầy đủ → mã gõ dở thì chưa lọc, chỉ nhắc.
  const incidentValid = !debouncedIncident || GUID_PATTERN.test(debouncedIncident);
  const filter = {
    incidentId: incidentValid ? debouncedIncident || undefined : undefined,
    action: action || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };
  const query = useServiceQuery(
    () => auditTrailService.list(filter, { pageIndex, pageSize: PAGE_SIZE }),
    `incident:${JSON.stringify({ filter, pageIndex })}`
  );

  const withPageReset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPageIndex(1);
    };

  const hasFilter = !!(incidentId || action || fromDate || toDate);

  const clearFilters = () => {
    setIncidentId('');
    setAction('');
    setFromDate('');
    setToDate('');
    setPageIndex(1);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>{t('admin.monitoring.audit.incidentId')}</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={incidentId}
                onChange={(e) => withPageReset(setIncidentId)(e.target.value)}
                placeholder={t('admin.monitoring.audit.incidentIdPlaceholder')}
                className={`${inputClass} pl-9 font-mono-data ${incidentValid ? '' : 'border-amber-400'}`}
              />
            </div>
            {!incidentValid && (
              <p className="text-[11px] text-amber-700">{t('admin.monitoring.audit.incidentIdInvalid')}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>{t('admin.monitoring.audit.action')}</label>
            <select
              value={action}
              onChange={(e) => withPageReset(setAction)(e.target.value as AuditAction | '')}
              className={inputClass}
            >
              <option value="">{t('admin.monitoring.audit.allActions')}</option>
              {AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {auditActionMeta(a).label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onChange={(from, to) => {
            setFromDate(from);
            setToDate(to);
            setPageIndex(1);
          }}
        >
          {hasFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
              {t('admin.common.clearFilters')}
            </button>
          )}
        </DateRangeFilter>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Lock className="w-3.5 h-3.5" />
        {t('admin.monitoring.audit.incidentNote')}
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

      {selected && (
        <AuditDetailDrawer
          entry={selected}
          onClose={() => setSelected(null)}
          onFilterIncident={(id) => {
            setIncidentId(id);
            setPageIndex(1);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
};
