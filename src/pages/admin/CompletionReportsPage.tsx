import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Search, X } from 'lucide-react';
import { CompletionReportDrawer } from '../../components/admin/completion/CompletionReportDrawer';
import { CompletionReportsTable } from '../../components/admin/completion/CompletionReportsTable';
import { DateRangeFilter, YMD_PATTERN } from '../../components/admin/common/DateRangeFilter';
import { Notice, Pagination } from '../../components/admin/common/ui';
import { inputClass, labelClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery } from '../../components/admin/common/hooks';
import { completionReportAdminService } from '../../services/admin/completionReportAdminService';
import { stationAdminService } from '../../services/admin/stationAdminService';
import { typeCatalogService } from '../../services/typeCatalogService';
import type { CompletionReportFilter, CompletionReportHistoryItemDto } from '../../types/report';
import { useTranslation } from '../../i18n';

const PAGE_SIZE = 20;

/**
 * §36: lịch sử báo cáo nghiệm thu toàn hệ thống (biên bản tổ ký tại hiện trường). Mở từ nav "Giám sát" hoặc từ drawer
 * Báo cáo sự cố (`?incident=<id>&code=<SC-…>` → chỉ báo cáo của sự cố đó). Chỉ đọc.
 */
const CompletionReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initial = useInitialQueryParams();
  const dateParam = (key: string) => (YMD_PATTERN.test(initial.text(key)) ? initial.text(key) : '');

  const [fromDate, setFromDate] = useState(() => dateParam('from'));
  const [toDate, setToDate] = useState(() => dateParam('to'));
  const [stationId, setStationId] = useState(() => initial.text('station'));
  const [teamId, setTeamId] = useState(() => initial.text('team'));
  const [incident, setIncident] = useState(() =>
    initial.text('incident') ? { id: initial.text('incident'), code: initial.text('code') } : null
  );
  const [search, setSearch] = useState(() => initial.text('search'));
  const debouncedSearch = useDebouncedValue(search.trim());
  const [pageIndex, setPageIndex] = useState(1);
  const [selected, setSelected] = useState<CompletionReportHistoryItemDto | null>(null);

  const filter: CompletionReportFilter = {
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    stationId: stationId || undefined,
    teamId: stationId && teamId ? teamId : undefined,
    incidentId: incident?.id,
    search: debouncedSearch || undefined,
  };
  const list = useServiceQuery(
    () => completionReportAdminService.list(filter, { pageIndex, pageSize: PAGE_SIZE }),
    `${JSON.stringify(filter)}#${pageIndex}`
  );
  const stations = useServiceQuery(() => stationAdminService.list({ pageIndex: 1, pageSize: 500 }), 'completion-stations');
  // Tổ chỉ lọc được trong một trạm (GET /stations/{id}/teams).
  const teams = useServiceQuery(
    () => (stationId ? completionReportAdminService.listTeams(stationId) : Promise.resolve([])),
    `completion-teams:${stationId}`
  );
  const unitTypes = useServiceQuery(() => typeCatalogService.listUnitTypes(true), 'completion-unit-types');

  const withPageReset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPageIndex(1);
    };

  const hasFilter = !!(fromDate || toDate || stationId || teamId || incident || search);
  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setStationId('');
    setTeamId('');
    setIncident(null);
    setSearch('');
    setPageIndex(1);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>{t('admin.monitoring.completion.search')}</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => withPageReset(setSearch)(e.target.value)}
                placeholder={t('admin.monitoring.completion.searchPlaceholder')}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>{t('admin.monitoring.completion.station')}</label>
            <select
              value={stationId}
              onChange={(e) => {
                setStationId(e.target.value);
                setTeamId('');
                setPageIndex(1);
              }}
              className={inputClass}
            >
              <option value="">{t('admin.monitoring.completion.allStations')}</option>
              {(stations.data?.items ?? []).map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>{t('admin.monitoring.completion.team')}</label>
            <select
              value={teamId}
              onChange={(e) => withPageReset(setTeamId)(e.target.value)}
              disabled={!stationId}
              title={stationId ? undefined : t('admin.monitoring.completion.teamNeedsStation')}
              className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
            >
              <option value="">
                {stationId ? t('admin.monitoring.completion.allTeams') : t('admin.monitoring.completion.teamNeedsStation')}
              </option>
              {(teams.data ?? []).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
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

        {incident && (
          <div className="flex items-center">
            <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full border border-red-200 bg-red-50 text-xs font-semibold text-red-700">
              {t('admin.monitoring.completion.incidentFilter', { code: incident.code || `${incident.id.slice(0, 8)}…` })}
              <button
                type="button"
                onClick={() => withPageReset(setIncident)(null)}
                aria-label={t('admin.monitoring.completion.clearIncident')}
                title={t('admin.monitoring.completion.clearIncident')}
                className="p-0.5 rounded-full hover:bg-red-100"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-slate-500">
        <p className="flex items-center gap-1.5">
          <ClipboardCheck className="w-3.5 h-3.5" />
          {t('admin.monitoring.completion.note')}
        </p>
        {list.data && (
          <p className="sm:ml-auto font-semibold text-slate-700">
            {t('admin.monitoring.completion.total', { count: list.data.totalCount })}
          </p>
        )}
      </div>

      {list.error && <Notice notice={{ kind: 'error', message: list.error }} />}

      <CompletionReportsTable
        items={list.data?.items ?? []}
        loading={list.loading}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
      />

      {list.data && (
        <Pagination
          pageIndex={list.data.pageIndex}
          totalPages={list.data.totalPages}
          totalCount={list.data.totalCount}
          onChange={setPageIndex}
        />
      )}

      {selected && (
        <CompletionReportDrawer
          report={selected}
          unitTypes={unitTypes.data ?? null}
          onClose={() => setSelected(null)}
          onOpenIncident={(r) => navigate(`/admin/reports?search=${encodeURIComponent(r.incidentCode || r.incidentTitle)}`)}
          onOpenAudit={(r) => navigate(`/admin/audit-trail?incident=${encodeURIComponent(r.incidentCode || r.incidentId)}`)}
        />
      )}
    </div>
  );
};

export default CompletionReportsPage;
