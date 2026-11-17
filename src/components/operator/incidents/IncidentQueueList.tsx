import React, { useMemo, useState } from 'react';
import { AlertTriangle, Bot, Eye, Inbox, ListChecks, Loader2, Map as MapIcon, MapPin, Siren } from 'lucide-react';
import { IncidentRow } from './IncidentRow';
import { IncidentThumbnail } from './IncidentThumbnail';
import { AutoDispatchBadge } from './AutoDispatchInfo';
import { autoDispatchVerdictAt, needsOperator, type HandoverReason } from './autoDispatchVerdict';
import { QUEUE_COLUMNS } from './queueColumns';
import { INCIDENT_CATEGORY_META } from '../../../data/incidentMock';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useNow } from '../../../hooks/useNow';
import type { AutoDispatchSettings } from '../../../services/liveMapService';
import type { Incident } from '../../../types/incident';
import { formatWaitDuration } from '../../../utils/incidentFormat';
import { Trans, useTranslation } from '../../../i18n';

type QueueTab = 'human' | 'ai' | 'dispatched';

interface IncidentQueueListProps {
  incidents: Incident[];
  highlightIds: Set<string>;
  escalatedIds: Set<string>;
  selectedId: string | null;
  currentOperatorId: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  loadError?: string | null;
  /** Số ca đã duyệt đang xử lý — hàng đợi trống thì mời sang Live Map theo dõi. */
  activeIncidentCount?: number;
  onOpenLiveMap?: () => void;
  /** §31.E: cài đặt AI tự điều phối; bật → hàng đợi chia 3 tab theo ai đang cầm ca. */
  autoDispatchSettings?: AutoDispatchSettings | null;
  /** Ca AI đã tự điều phối, còn đang xử lý (tab "AI đã điều phối"). */
  autoDispatchedIncidents?: Incident[];
  /** Mở xem nhanh một ca AI đã điều phối (drawer chỉ xem). */
  onOpenAutoDispatched?: (id: string) => void;
  /** Ca đang mở xem nhanh (tô nền dòng). */
  previewId?: string | null;
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
  activeIncidentCount = 0,
  onOpenLiveMap,
  autoDispatchSettings = null,
  autoDispatchedIncidents = [],
  onOpenAutoDispatched,
  previewId = null,
}) => {
  const now = useNow();
  const { t } = useTranslation();
  const [tab, setTab] = useState<QueueTab>('human');
  // Ca AI đang xử lý mà Operator bấm mở → hỏi lại (mở = giữ ca = AI bỏ qua tự điều phối).
  const [confirmTakeOverId, setConfirmTakeOverId] = useState<string | null>(null);
  const autoOn = !!autoDispatchSettings?.enabled;
  const threshold = autoDispatchSettings ? Math.round(autoDispatchSettings.minConfidence * 100) : null;

  // Chia ca chờ duyệt theo ai đang cầm: người (kèm lý do AI chuyển) / AI (đang phân tích hoặc điều phối).
  const { humanIncidents, aiIncidents, reasons } = useMemo(() => {
    const human: Incident[] = [];
    const ai: Incident[] = [];
    const why = new Map<string, HandoverReason>();
    for (const incident of incidents) {
      const verdict = autoDispatchVerdictAt(incident, autoDispatchSettings, now);
      if (!needsOperator(verdict)) ai.push(incident);
      else {
        human.push(incident);
        if (verdict.phase === 'handover') why.set(incident.id, verdict.reason);
      }
    }
    return { humanIncidents: human, aiIncidents: ai, reasons: why };
  }, [incidents, autoDispatchSettings, now]);

  // Tab đang xem (tự điều phối tắt → chỉ một danh sách như cũ).
  const activeTab: QueueTab = autoOn ? tab : 'human';
  const listed = activeTab === 'ai' ? aiIncidents : humanIncidents;

  // Giữ nguyên thứ tự ưu tiên từ store, chỉ tách ca leo thang lên nhóm riêng.
  const [escalated, waiting] = useMemo(() => {
    const esc: Incident[] = [];
    const rest: Incident[] = [];
    listed.forEach((inc) => (escalatedIds.has(inc.id) ? esc : rest).push(inc));
    return [esc, rest];
  }, [listed, escalatedIds]);

  const renderRow = (incident: Incident) => (
    <IncidentRow
      key={incident.id}
      incident={incident}
      isNew={highlightIds.has(incident.id)}
      isSelected={incident.id === selectedId}
      isEscalated={escalatedIds.has(incident.id)}
      now={now}
      currentOperatorId={currentOperatorId}
      onClick={() => (activeTab === 'ai' ? setConfirmTakeOverId(incident.id) : onSelect(incident.id))}
      handoverReason={reasons.get(incident.id) ?? null}
      threshold={threshold}
    />
  );

  const tabs: { key: QueueTab; label: string; count: number; tone: string }[] = [
    { key: 'human', label: t('incidents.queue.tabs.human'), count: humanIncidents.length, tone: 'bg-red-600 text-white' },
    { key: 'ai', label: t('incidents.queue.tabs.ai'), count: aiIncidents.length, tone: 'bg-indigo-600 text-white' },
    {
      key: 'dispatched',
      label: t('incidents.queue.tabs.dispatched'),
      count: autoDispatchedIncidents.length,
      tone: 'bg-slate-200 text-slate-700',
    },
  ];
  const confirmIncident = confirmTakeOverId ? aiIncidents.find((i) => i.id === confirmTakeOverId) : undefined;

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="shrink-0 px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
          <ListChecks className="w-5 h-5 text-red-600" />
          {t('incidents.queue.title')}
        </h1>
        <div className="flex items-center gap-4 text-sm whitespace-nowrap">
          <span className="text-slate-600">
            <Trans
              i18nKey="incidents.queue.waitingCount"
              values={{ count: humanIncidents.length }}
              components={{ b: <span className="font-bold text-slate-900 tabular-nums" /> }}
            />
          </span>
          {escalated.length > 0 && (
            <span className="text-red-700">
              <Trans
                i18nKey="incidents.queue.escalatedCount"
                values={{ count: escalated.length }}
                components={{ b: <span className="font-bold tabular-nums" /> }}
              />
            </span>
          )}
        </div>
      </div>

      {autoOn && (
        <div role="tablist" aria-label={t('incidents.queue.tabs.label')} className="shrink-0 flex gap-1 px-6 border-b border-slate-200">
          {tabs.map(({ key, label, count, tone }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => {
                setTab(key);
                setConfirmTakeOverId(null);
              }}
              className={`inline-flex items-center gap-2 px-3 py-2.5 -mb-px border-b-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                activeTab === key ? 'border-red-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {key === 'ai' && <Bot className="w-4 h-4 text-indigo-600" />}
              {label}
              <span className={`min-w-[1.25rem] px-1.5 rounded-full text-[11px] font-bold tabular-nums ${count > 0 ? tone : 'bg-slate-100 text-slate-400'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'ai' && confirmIncident && (
        <div role="alert" className="shrink-0 mx-5 mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 space-y-2">
          <p>{t('incidents.queue.takeOver.body', { title: confirmIncident.title })}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setConfirmTakeOverId(null);
                onSelect(confirmIncident.id);
              }}
              className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {t('incidents.queue.takeOver.confirm')}
            </button>
            <button
              onClick={() => setConfirmTakeOverId(null)}
              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
            >
              {t('incidents.queue.takeOver.cancel')}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'ai' && aiIncidents.length > 0 && !confirmIncident && (
        <p className="shrink-0 mx-6 mt-3 text-xs text-slate-500">{t('incidents.queue.aiTabHint')}</p>
      )}

      {loadError && (
        <div className="shrink-0 mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {!isLoading && activeTab !== 'dispatched' && listed.length > 0 && (
        <div className="shrink-0 hidden md:flex items-center gap-4 pl-6 pr-6 py-2 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
          <span className={`${QUEUE_COLUMNS.thumbnail} shrink-0`} />
          <span className="flex-1">{t('incidents.queue.columnIncident')}</span>
          <span className={`${QUEUE_COLUMNS.ai} shrink-0`}>{t('incidents.queue.columnAi')}</span>
          <span className={`${QUEUE_COLUMNS.wait} shrink-0 text-right`}>{t('incidents.queue.columnWait')}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-300">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm text-slate-500">{t('incidents.queue.loading')}</p>
          </div>
        ) : activeTab === 'dispatched' ? (
          autoDispatchedIncidents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-300">
              <Bot className="w-8 h-8" />
              <p className="text-sm text-slate-500">{t('incidents.queue.dispatchedEmpty')}</p>
            </div>
          ) : (
            autoDispatchedIncidents.map((incident) => (
              <AutoDispatchedRow
                key={incident.id}
                incident={incident}
                now={now}
                isSelected={incident.id === previewId}
                onOpen={() => onOpenAutoDispatched?.(incident.id)}
              />
            ))
          )
        ) : listed.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-300">
            <Inbox className="w-8 h-8" />
            <p className="text-sm text-slate-500">
              {activeTab === 'ai' ? t('incidents.queue.aiEmpty') : t('incidents.queue.empty')}
            </p>
            {activeTab === 'human' && aiIncidents.length > 0 && (
              <button
                onClick={() => setTab('ai')}
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:underline"
              >
                <Bot className="w-4 h-4" />
                {t('incidents.queue.aiWorking', { count: aiIncidents.length })}
              </button>
            )}
            {activeIncidentCount > 0 && onOpenLiveMap && (
              <button
                onClick={onOpenLiveMap}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <MapIcon className="w-4 h-4 text-slate-500" />
                {t('incidents.queue.emptyFollowUp', { count: activeIncidentCount })}
              </button>
            )}
          </div>
        ) : escalated.length === 0 ? (
          waiting.map(renderRow)
        ) : (
          <>
            <section aria-label={t('incidents.queue.escalatedSection')}>
              <GroupHeader label={t('incidents.queue.escalatedGroup')} count={escalated.length} tone="alert" />
              {escalated.map(renderRow)}
            </section>
            {waiting.length > 0 && (
              <section aria-label={t('incidents.queue.waitingSection')}>
                <GroupHeader label={t('incidents.queue.waitingGroup')} count={waiting.length} tone="neutral" />
                {waiting.map(renderRow)}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Dòng ca AI đã tự điều phối (đang xử lý): để Operator giám sát — bấm mở xem nhanh (drawer chỉ xem); đổi mức độ /
 * thu hồi / giao thêm tổ làm trên Live Map.
 */
const AutoDispatchedRow: React.FC<{ incident: Incident; now: number; isSelected: boolean; onOpen: () => void }> = ({
  incident,
  now,
  isSelected,
  onOpen,
}) => {
  const { t } = useTranslation();
  const { incidentKindLabel } = useDispatchStore();
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const teamCount = incident.assignedVehicleIds.length - incident.reportedVehicleIds.length;
  return (
    <button
      onClick={onOpen}
      aria-current={isSelected ? 'true' : undefined}
      className={`w-full flex items-center gap-4 pl-6 pr-6 py-3 text-left border-b border-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 ${
        isSelected ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'
      }`}
    >
      <IncidentThumbnail incident={incident} className={`${QUEUE_COLUMNS.thumbnail} h-12 shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-slate-900 truncate">{incident.title}</p>
        <div className="flex items-center gap-3 mt-1 text-xs min-w-0">
          <span className="inline-flex items-center gap-1 font-semibold shrink-0" style={{ color: category.color }}>
            <CategoryIcon className="w-3.5 h-3.5" />
            {incidentKindLabel(incident)}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500 min-w-0" title={incident.area}>
            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{incident.area}</span>
          </span>
          <AutoDispatchBadge incident={incident} />
        </div>
      </div>
      <div className={`hidden md:block ${QUEUE_COLUMNS.ai} shrink-0 text-xs`}>
        {teamCount > 0 ? (
          <span className="text-slate-600">{t('incidents.queue.dispatchedTeams', { count: teamCount })}</span>
        ) : (
          // Ca còn mở mà không còn tổ nào (VD tổ cuối bị thu hồi) → Operator phải giao thêm hoặc đóng ca.
          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t('incidents.queue.noActiveTeam')}
          </span>
        )}
      </div>
      <div className={`${QUEUE_COLUMNS.wait} shrink-0 text-right`}>
        <div className="text-sm font-semibold tabular-nums text-slate-800 whitespace-nowrap">
          {formatWaitDuration(now - new Date(incident.createdAt).getTime())}
        </div>
        <div className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-semibold text-blue-700">
          <Eye className="w-3 h-3" />
          {t('incidents.queue.preview')}
        </div>
      </div>
    </button>
  );
};
