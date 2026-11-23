import React from 'react';
import { MapPin } from 'lucide-react';
import { AiStepGlyph, AiTakeOver, SegmentBar } from '../AiLane';
import { IncidentCode } from '../incidents/IncidentCode';
import { IncidentThumbnail } from '../incidents/IncidentThumbnail';
import { SeverityBadge } from '../incidents/SeverityBadge';
import { aiProgressOf, formatWaitTime, type AiWorkingItem } from '../incidents/incomingTriage';
import { SEVERITY_LEVEL_COLOR } from '../../../data/incidentMock';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useTranslation } from '../../../i18n';
import '../aiLane.css';

/**
 * Thẻ ca AI đang phân tích / điều phối trong panel "Theo dõi ca". Bấm thẻ chỉ bay tới marker — KHÔNG mở ca (mở = giữ khóa
 * mềm = AI bỏ qua ca này). Muốn nhận thì bấm "Tôi xử lý" (hỏi lại một lần). AI điều xong → thẻ ca thường, cùng nhóm.
 */
export const AiCaseCard: React.FC<{ item: AiWorkingItem; now: number; onViewOnMap: () => void }> = ({
  item,
  now,
  onViewOnMap,
}) => {
  const { t } = useTranslation();
  const { incidentKindLabel } = useDispatchStore();
  const { incident } = item;
  const progress = aiProgressOf(item, now);
  const known = !incident.aiPending && !incident.aiUnclassified;

  return (
    <div
      className="flex border-l-[3px] border-l-indigo-500 border-b border-b-slate-100 bg-indigo-50/40"
      style={known ? { borderLeftColor: SEVERITY_LEVEL_COLOR[incident.severity] } : undefined}
    >
      <button
        type="button"
        onClick={onViewOnMap}
        tabIndex={-1}
        aria-hidden
        className="shrink-0 self-stretch w-[72px] my-3 ml-3"
      >
        <span className="relative block w-full h-full min-h-[72px] overflow-hidden rounded-lg ring-2 ring-indigo-200">
          <IncidentThumbnail incident={incident} className="w-full h-full min-h-[72px]" />
          {progress.phase === 'analyzing' && <span className="ai-case-scan" />}
        </span>
      </button>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onViewOnMap}
          title={t('layout.aiLane.viewOnMapHint')}
          className="w-full text-left pl-3 pr-4 pt-3 pb-1.5 focus-visible:outline-none focus-visible:bg-indigo-100/60"
        >
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 truncate text-[11px] font-semibold text-indigo-800">
              {incident.aiPending ? t('liveMap.cases.ai.unknownKind') : incidentKindLabel(incident)}
            </span>
            {known && <SeverityBadge severity={incident.severity} unclassified={false} />}
            <span
              className={`ml-auto shrink-0 font-mono-data text-xs tabular-nums ${
                progress.slow ? 'text-amber-700 font-bold' : 'text-slate-500'
              }`}
            >
              {formatWaitTime(progress.elapsedSeconds)}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-900 truncate leading-snug">{incident.title}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {incident.code && (
              <>
                <IncidentCode code={incident.code} />
                {' · '}
              </>
            )}
            {incident.area}
          </p>
          <SegmentBar progress={progress} height="h-1.5" className="mt-2" />
          <p
            className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold ${
              progress.slow ? 'text-amber-800' : 'text-indigo-800'
            }`}
          >
            <AiStepGlyph phase={progress.phase} />
            {progress.slow
              ? t('layout.aiLane.slow')
              : progress.phase === 'analyzing'
                ? t('layout.aiLane.analyzing')
                : t('layout.aiLane.deciding')}
          </p>
        </button>
        <div className="pl-3 pr-4 pb-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onViewOnMap}
            className="inline-flex items-center gap-1 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
          >
            <MapPin className="w-3.5 h-3.5" />
            {t('layout.aiLane.viewOnMap')}
          </button>
          <AiTakeOver incidentId={incident.id} />
        </div>
      </div>
    </div>
  );
};
