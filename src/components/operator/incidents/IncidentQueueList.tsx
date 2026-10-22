import React, { useMemo } from 'react';
import { AlertTriangle, Inbox, ListChecks, Loader2, Siren } from 'lucide-react';
import { IncidentRow } from './IncidentRow';
import { QUEUE_COLUMNS } from './queueColumns';
import { useNow } from '../../../hooks/useNow';
import type { Incident } from '../../../types/incident';

interface IncidentQueueListProps {
  incidents: Incident[];
  highlightIds: Set<string>;
  escalatedIds: Set<string>;
  selectedId: string | null;
  currentOperatorId: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  loadError?: string | null;
}

interface GroupHeaderProps {
  label: string;
  count: number;
  tone: 'alert' | 'neutral';
}

const GroupHeader: React.FC<GroupHeaderProps> = ({ label, count, tone }) => (
  <div
    className={`sticky top-0 z-10 flex items-center gap-2 px-6 py-2 border-b text-xs font-bold ${
      tone === 'alert' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-600'
    }`}
  >
    {tone === 'alert' && <Siren className="w-3.5 h-3.5" />}
    {label}
    <span className="font-semibold tabular-nums opacity-70">{count}</span>
  </div>
);

export const IncidentQueueList: React.FC<IncidentQueueListProps> = ({
  incidents,
  highlightIds,
  escalatedIds,
  selectedId,
  currentOperatorId,
  onSelect,
  isLoading = false,
  loadError = null,
}) => {
  const now = useNow();

  // Giữ nguyên thứ tự ưu tiên từ store, chỉ tách ca leo thang lên nhóm riêng.
  const [escalated, waiting] = useMemo(() => {
    const esc: Incident[] = [];
    const rest: Incident[] = [];
    incidents.forEach((inc) => (escalatedIds.has(inc.id) ? esc : rest).push(inc));
    return [esc, rest];
  }, [incidents, escalatedIds]);

  const renderRow = (incident: Incident) => (
    <IncidentRow
      key={incident.id}
      incident={incident}
      isNew={highlightIds.has(incident.id)}
      isSelected={incident.id === selectedId}
      isEscalated={escalatedIds.has(incident.id)}
      now={now}
      currentOperatorId={currentOperatorId}
      onClick={() => onSelect(incident.id)}
    />
  );

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="shrink-0 px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
          <ListChecks className="w-5 h-5 text-red-600" />
          Incident Queue
        </h1>
        <div className="flex items-center gap-4 text-sm whitespace-nowrap">
          <span className="text-slate-600">
            <span className="font-bold text-slate-900 tabular-nums">{incidents.length}</span> đang chờ
          </span>
          {escalated.length > 0 && (
            <span className="text-red-700">
              <span className="font-bold tabular-nums">{escalated.length}</span> leo thang
            </span>
          )}
        </div>
      </div>

      {loadError && (
        <div className="shrink-0 mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {!isLoading && incidents.length > 0 && (
        <div className="shrink-0 hidden md:flex items-center gap-4 pl-6 pr-6 py-2 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
          <span className={`${QUEUE_COLUMNS.thumbnail} shrink-0`} />
          <span className="flex-1">Sự cố</span>
          <span className={`${QUEUE_COLUMNS.ai} shrink-0`}>Đánh giá AI</span>
          <span className={`${QUEUE_COLUMNS.wait} shrink-0 text-right`}>Thời gian chờ</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-300">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm text-slate-500">Đang tải hàng đợi sự cố...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-300">
            <Inbox className="w-8 h-8" />
            <p className="text-sm text-slate-500">Không có sự cố nào đang chờ xử lý</p>
          </div>
        ) : escalated.length === 0 ? (
          waiting.map(renderRow)
        ) : (
          <>
            <section aria-label="Sự cố leo thang">
              <GroupHeader label="Leo thang, cần thẩm định ngay" count={escalated.length} tone="alert" />
              {escalated.map(renderRow)}
            </section>
            {waiting.length > 0 && (
              <section aria-label="Sự cố đang chờ">
                <GroupHeader label="Đang chờ thẩm định" count={waiting.length} tone="neutral" />
                {waiting.map(renderRow)}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};
