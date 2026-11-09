import React, { useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Inbox,
  Loader2,
  MapPin,
  Search,
} from 'lucide-react';
import { INCIDENT_CATEGORY_META, SEVERITY_LEVEL_COLOR } from '../../../data/incidentMock';
import { formatDateTime, formatWaitDuration } from '../../../utils/incidentFormat';
import {
  COMPLETION_RANGES,
  progressOf,
  type CompletionRange,
  type CompletionRow,
  type CompletionTab,
} from './completionGroups';
import { useTranslation } from '../../../i18n';

/** Viên tổ trên dòng danh sách — tối đa 3 viên, còn lại gộp "+N". */
const MAX_PILLS = 3;

interface CompletionListProps {
  tab: CompletionTab;
  onTabChange: (tab: CompletionTab) => void;
  pendingCount: number;
  rows: CompletionRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  range: CompletionRange;
  onRangeChange: (range: CompletionRange) => void;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  now: number;
}

export const CompletionList: React.FC<CompletionListProps> = ({
  tab,
  onTabChange,
  pendingCount,
  rows,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
  search,
  onSearchChange,
  range,
  onRangeChange,
  page,
  totalPages,
  totalCount,
  onPageChange,
  now,
}) => {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);

  // ↑ ↓ chuyển giữa các sự cố khi đang đứng trên một dòng.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('[data-row-id]') ?? [])];
    const current = buttons.findIndex((b) => b === document.activeElement);
    if (current < 0) return;
    e.preventDefault();
    const next = buttons[Math.max(0, Math.min(buttons.length - 1, current + (e.key === 'ArrowDown' ? 1 : -1)))];
    next.focus();
    onSelect(next.dataset.rowId!);
  };

  const emptyText = search.trim()
    ? t('incidents.completion.emptySearch')
    : tab === 'pending'
      ? t('incidents.completion.emptyPending')
      : t('incidents.completion.emptyDone');

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="shrink-0 px-5 pt-4 pb-3 border-b border-slate-200 space-y-3">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
          <ClipboardCheck className="w-5 h-5 text-red-600" />
          {t('incidents.completion.title')}
        </h1>

        {/* Hai nhóm chính */}
        <div role="tablist" className="grid grid-cols-2 p-1 rounded-lg bg-slate-100">
          {(['pending', 'done'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => onTabChange(key)}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
                tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t(`incidents.completion.tabs.${key}`)}
              {key === 'pending' && pendingCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <label className="relative flex-1 min-w-0">
            <span className="sr-only">{t('incidents.completion.searchLabel')}</span>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('incidents.completion.searchPlaceholder')}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300"
            />
          </label>
          {tab === 'done' && (
            <select
              value={range}
              onChange={(e) => onRangeChange(e.target.value as CompletionRange)}
              aria-label={t('incidents.completion.range.label')}
              className="shrink-0 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300"
            >
              {COMPLETION_RANGES.map((r) => (
                <option key={r} value={r}>
                  {t(`incidents.completion.range.${r}`)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="shrink-0 mx-4 mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
            {t('incidents.completion.retry')}
          </button>
        </div>
      )}

      <div ref={listRef} onKeyDown={handleKeyDown} className="flex-1 overflow-y-auto min-h-0">
        {loading && rows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-300">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm text-slate-500">{t('incidents.completion.loading')}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center text-slate-300">
            <Inbox className="w-8 h-8" />
            <p className="text-sm text-slate-500">{emptyText}</p>
          </div>
        ) : (
          rows.map((row) => (
            <CompletionListRow
              key={row.incident.id}
              row={row}
              isSelected={row.incident.id === selectedId}
              onClick={() => onSelect(row.incident.id)}
              now={now}
            />
          ))
        )}
      </div>

      {/* Phân trang (chỉ nhóm Đã hoàn tất — lấy từ API) */}
      {tab === 'done' && totalCount > 0 && (
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-2.5 border-t border-slate-200 text-xs text-slate-500">
          <span className="font-mono-data">{t('incidents.completion.count', { count: totalCount })}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1 || loading}
                aria-label={t('common.previousPage')}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 font-mono-data tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages || loading}
                aria-label={t('common.nextPage')}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CompletionListRow: React.FC<{ row: CompletionRow; isSelected: boolean; onClick: () => void; now: number }> = ({
  row,
  isSelected,
  onClick,
  now,
}) => {
  const { t } = useTranslation();
  const { incident, groups, completedAt } = row;
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const progress = groups ? progressOf(groups) : null;
  const pills = groups?.slice(0, MAX_PILLS) ?? [];
  const extra = (groups?.length ?? 0) - pills.length;

  return (
    <button
      type="button"
      data-row-id={incident.id}
      onClick={onClick}
      aria-current={isSelected ? 'true' : undefined}
      className={`relative w-full text-left pl-5 pr-4 py-3 border-b border-slate-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 ${
        isSelected ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'
      }`}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: SEVERITY_LEVEL_COLOR[incident.severity] }}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900 truncate">{incident.title}</p>
        <span
          className="shrink-0 text-[11px] font-mono-data text-slate-400 whitespace-nowrap"
          title={formatDateTime(completedAt ?? incident.createdAt)}
        >
          {completedAt
            ? formatDateTime(completedAt)
            : formatWaitDuration(now - new Date(incident.createdAt).getTime())}
        </span>
      </div>
      <div className="flex items-center gap-2.5 mt-1 text-[11px] min-w-0">
        <span className="inline-flex items-center gap-1 font-semibold shrink-0" style={{ color: category.color }}>
          <CategoryIcon className="w-3 h-3" />
          {t(`enums.category.${incident.category}`)}
        </span>
        <span className="inline-flex items-center gap-1 text-slate-500 min-w-0">
          <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
          <span className="truncate">{incident.area}</span>
        </span>
      </div>

      {groups && groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2" aria-label={progress ? t('incidents.completion.progress', { ...progress }) : undefined}>
          {pills.map((g) => {
            const done = g.state === 'submitted';
            const label = g.teamName ?? g.assignments.map((a) => a.rescueUnit?.plateNumber ?? '—').join(', ');
            return (
              <span
                key={g.key}
                className={`inline-flex items-center gap-1 max-w-[11rem] px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${
                  done ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}
              >
                {done ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <Clock3 className="w-3 h-3 shrink-0" />}
                <span className="truncate">{label}</span>
              </span>
            );
          })}
          {extra > 0 && <span className="text-[10px] font-semibold text-slate-500">+{extra}</span>}
        </div>
      )}
    </button>
  );
};
