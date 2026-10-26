import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, FileText, Loader2, Search, X } from 'lucide-react';
import { IncidentReportDrawer } from '../../components/admin/reports/IncidentReportDrawer';
import {
  REPORT_SEVERITIES,
  cancellationLabel,
  formatDateTime,
  formatMinutes,
  severityMeta,
} from '../../components/admin/reports/reportMeta';
import { DateRangeFilter, YMD_PATTERN } from '../../components/admin/common/DateRangeFilter';
import { Notice, Pagination, type NoticeState } from '../../components/admin/common/ui';
import { inputClass, labelClass, thClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery } from '../../components/admin/common/hooks';
import { reportAdminService } from '../../services/admin/reportAdminService';
import { stationAdminService } from '../../services/admin/stationAdminService';
import { getApiErrorMessage } from '../../services/apiClient';
import type { BackendSeverityLevel } from '../../types/incident';
import type { ClosedIncidentFilter, IncidentHistoryItemDto, IncidentReportFilter, ReportFormat } from '../../types/report';
import { useTranslation } from '../../i18n';

const PAGE_SIZE = 20;
const STATUSES = [
  { value: 'All', labelKey: 'closedAll' },
  { value: 'Completed', labelKey: 'completed' },
  { value: 'Cancelled', labelKey: 'cancelled' },
] as const satisfies readonly { value: ClosedIncidentFilter; labelKey: string }[];

const StatCard: React.FC<{ label: string; value: React.ReactNode; hint?: string; tone?: string }> = ({
  label,
  value,
  hint,
  tone = 'text-slate-900',
}) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
    <p className="text-[10px] font-mono-data uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`text-2xl font-black mt-0.5 ${tone}`}>{value}</p>
    {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
  </div>
);

/** Báo cáo / lịch sử sự cố đã đóng: thẻ số liệu, bảng phân trang, xuất CSV / PDF theo cùng bộ lọc. */
const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initial = useInitialQueryParams();
  const dateParam = (key: string) => (YMD_PATTERN.test(initial.text(key)) ? initial.text(key) : '');

  const [fromDate, setFromDate] = useState(() => dateParam('from'));
  const [toDate, setToDate] = useState(() => dateParam('to'));
  const [stationId, setStationId] = useState(() => initial.text('station'));
  const [status, setStatus] = useState<ClosedIncidentFilter>(
    () => initial.oneOf('status', ['Completed', 'Cancelled'] as const) || 'All'
  );
  const [severity, setSeverity] = useState<BackendSeverityLevel | ''>(() => initial.oneOf('severity', REPORT_SEVERITIES));
  const [search, setSearch] = useState(() => initial.text('search'));
  const debouncedSearch = useDebouncedValue(search.trim());
  const [pageIndex, setPageIndex] = useState(1);
  const [selected, setSelected] = useState<IncidentHistoryItemDto | null>(null);
  const [exporting, setExporting] = useState<ReportFormat | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const filter: IncidentReportFilter = {
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    stationId: stationId || undefined,
    status,
    severity: severity || undefined,
    search: debouncedSearch || undefined,
  };
  const filterKey = JSON.stringify(filter);
  const list = useServiceQuery(
    () => reportAdminService.listIncidents(filter, { pageIndex, pageSize: PAGE_SIZE }),
    `${filterKey}#${pageIndex}`
  );
  const summary = useServiceQuery(() => reportAdminService.getSummary(filter), filterKey);
  const stations = useServiceQuery(() => stationAdminService.list({ pageIndex: 1, pageSize: 500 }), 'report-stations');

  const withPageReset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPageIndex(1);
    };

  const hasFilter = !!(fromDate || toDate || stationId || status !== 'All' || severity || search);
  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setStationId('');
    setStatus('All');
    setSeverity('');
    setSearch('');
    setPageIndex(1);
  };

  const handleExport = async (format: ReportFormat) => {
    setExporting(format);
    setNotice(null);
    try {
      const name = await reportAdminService.exportIncidents(filter, format);
      setNotice({ kind: 'success', message: t('admin.monitoring.reports.downloaded', { name }) });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err, t('admin.monitoring.reports.exportFailed')) });
    } finally {
      setExporting(null);
    }
  };

  const s = summary.data;
  const total = list.data?.totalCount ?? 0;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5 lg:col-span-1">
            <label className={labelClass}>{t('admin.monitoring.reports.search')}</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => withPageReset(setSearch)(e.target.value)}
                placeholder={t('admin.monitoring.reports.searchPlaceholder')}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>{t('admin.monitoring.reports.station')}</label>
            <select value={stationId} onChange={(e) => withPageReset(setStationId)(e.target.value)} className={inputClass}>
              <option value="">{t('admin.monitoring.reports.allStations')}</option>
              {(stations.data?.items ?? []).map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>{t('admin.monitoring.reports.result')}</label>
            <select
              value={status}
              onChange={(e) => withPageReset(setStatus)(e.target.value as ClosedIncidentFilter)}
              className={inputClass}
            >
              {STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {t(`admin.monitoring.reports.${st.labelKey}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>{t('admin.monitoring.reports.severity')}</label>
            <select
              value={severity}
              onChange={(e) => withPageReset(setSeverity)(e.target.value as BackendSeverityLevel | '')}
              className={inputClass}
            >
              <option value="">{t('admin.monitoring.reports.allSeverities')}</option>
              {REPORT_SEVERITIES.map((lv) => (
                <option key={lv} value={lv}>
                  {severityMeta(lv).label}
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label={t('admin.monitoring.reports.statClosed')} value={s?.total ?? '—'} />
        <StatCard label={t('admin.monitoring.reports.completed')} value={s?.completed ?? '—'} tone="text-emerald-700" />
        <StatCard label={t('admin.monitoring.reports.cancelled')} value={s?.cancelled ?? '—'} tone="text-slate-600" />
        <StatCard
          label={t('admin.monitoring.reports.statAvgResponse')}
          value={s ? formatMinutes(s.avgResponseMinutes) : '—'}
          hint={t('admin.monitoring.reports.statAvgResponseHint')}
        />
        <StatCard
          label={t('admin.monitoring.reports.statAvgResolution')}
          value={s ? formatMinutes(s.avgResolutionMinutes) : '—'}
          hint={t('admin.monitoring.reports.statAvgResolutionHint')}
        />
      </div>
      {s && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">{t('admin.monitoring.reports.bySeverity')}</span>
          {REPORT_SEVERITIES.filter((lv) => (s.bySeverity[lv] ?? 0) > 0).map((lv) => {
            const meta = severityMeta(lv);
            return (
              <span key={lv} className={`px-2 py-0.5 rounded-md border font-bold ${meta.badgeClass}`}>
                {meta.label}: {s.bySeverity[lv]}
              </span>
            );
          })}
          {REPORT_SEVERITIES.every((lv) => !s.bySeverity[lv]) && <span className="text-slate-400">—</span>}
        </div>
      )}
      {summary.error && <Notice notice={{ kind: 'error', message: summary.error }} />}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-xs text-slate-500">
          {t('admin.monitoring.reports.exportNote')}
        </p>
        <div className="sm:ml-auto flex gap-2">
          {(
            [
              ['Csv', t('admin.monitoring.reports.exportCsv'), FileSpreadsheet],
              ['Pdf', t('admin.monitoring.reports.exportPdf'), FileText],
            ] as const
          ).map(([format, label, Icon]) => (
            <button
              key={format}
              type="button"
              onClick={() => handleExport(format)}
              disabled={!!exporting || total === 0}
              title={total === 0 ? t('admin.monitoring.reports.nothingToExport') : undefined}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === format ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {list.error && <Notice notice={{ kind: 'error', message: list.error }} />}

      <div
        className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
          list.loading ? 'opacity-60' : ''
        }`}
      >
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className={thClass}>{t('admin.monitoring.reports.table.reportedAt')}</th>
              <th className={thClass}>{t('admin.monitoring.reports.table.incident')}</th>
              <th className={thClass}>{t('admin.monitoring.reports.severity')}</th>
              <th className={thClass}>{t('admin.monitoring.reports.result')}</th>
              <th className={thClass}>{t('admin.monitoring.reports.table.stationsUnits')}</th>
              <th className={`${thClass} text-right`}>{t('admin.monitoring.reports.table.response')}</th>
              <th className={`${thClass} text-right`}>{t('admin.monitoring.reports.table.resolution')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(list.data?.items.length ?? 0) === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                  {list.loading ? t('admin.common.loading') : t('admin.monitoring.reports.table.empty')}
                </td>
              </tr>
            )}
            {(list.data?.items ?? []).map((item) => {
              const sev = severityMeta(item.severity);
              return (
                <tr
                  key={item.id}
                  onClick={() => setSelected(item)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      setSelected(item);
                    }
                  }}
                  tabIndex={0}
                  className={`cursor-pointer focus:outline-none focus:bg-red-50/50 ${
                    selected?.id === item.id ? 'bg-red-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-4 py-3 font-mono-data text-xs text-slate-600 whitespace-nowrap">
                    {formatDateTime(item.reportedAt)}
                  </td>
                  <td className="px-4 py-3 max-w-[300px]">
                    <div className="font-semibold text-slate-900 truncate">{item.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">{item.locationAddress}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap ${sev.badgeClass}`}>
                      {sev.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {item.status === 'Completed' ? (
                      <span className="font-semibold text-emerald-700">{t('admin.monitoring.reports.completed')}</span>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-600">{t('admin.monitoring.reports.cancelled')}</span>
                        {item.cancellationReason && (
                          <div className="text-[11px] text-slate-500">{cancellationLabel(item.cancellationReason)}</div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">
                    <div className="truncate">{item.stations.join(', ') || '—'}</div>
                    {item.units.length > 0 && (
                      <div className="text-[11px] text-slate-500 font-mono-data truncate">{item.units.join(', ')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700 text-right whitespace-nowrap">
                    {formatMinutes(item.responseMinutes)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700 text-right whitespace-nowrap">
                    {formatMinutes(item.resolutionMinutes)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {list.data && (
        <Pagination
          pageIndex={list.data.pageIndex}
          totalPages={list.data.totalPages}
          totalCount={list.data.totalCount}
          onChange={setPageIndex}
        />
      )}

      {selected && (
        <IncidentReportDrawer
          item={selected}
          onClose={() => setSelected(null)}
          onOpenAudit={(id) => navigate(`/admin/audit-trail?incident=${id}`)}
        />
      )}
    </div>
  );
};

export default ReportsPage;
