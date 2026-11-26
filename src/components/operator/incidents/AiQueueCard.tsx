import React from 'react';
import { MapPin } from 'lucide-react';
import { AiStepGlyph, SegmentBar } from '../AiLane';
import { AiProgressStrip } from './AutoDispatchInfo';
import { IncidentCode } from './IncidentCode';
import { IncidentThumbnail } from './IncidentThumbnail';
import { SeverityBadge } from './SeverityBadge';
import { aiProgressOf, formatWaitTime, type AiWorkingItem } from './incomingTriage';
import { SEVERITY_LEVEL_COLOR } from '../../../data/incidentMock';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useTranslation } from '../../../i18n';
import '../aiLane.css';

/**
 * §31.E: thẻ ca AI đang phân tích / điều phối ở tab "AI đang phân tích" của Hàng đợi — cho thấy AI đi tới đâu (Đã nhận →
 * AI phân tích → Tự điều phối, thanh thời gian 2 đoạn, đồng hồ). AI điều xong → ca sang tab "AI đã điều phối"; AI chuyển
 * cho người → sang "Cần bạn xử lý". "Mở ca" mở thẩm định ngay (không chặn AI: AI điều xong trước khi duyệt thì drawer tự đóng).
 */
export const AiQueueCard: React.FC<{ item: AiWorkingItem; now: number; isNew: boolean; onOpen: () => void }> = ({
  item,
  now,
  isNew,
  onOpen,
}) => {
  const { t } = useTranslation();
  const { incidentKindLabel } = useDispatchStore();
  const { incident } = item;
  const progress = aiProgressOf(item, now);
  const known = !incident.aiPending && !incident.aiUnclassified;
  const status = progress.slow
    ? t('layout.aiLane.slow')
    : progress.phase === 'analyzing'
      ? t('layout.aiLane.analyzing')
      : t('layout.aiLane.deciding');

  return (
    <div
      className={`flex gap-4 pl-5 pr-6 py-3.5 border-b border-slate-100 border-l-4 border-l-indigo-500 bg-indigo-50/40 ${
        isNew ? 'animate-queue-enter' : ''
      }`}
      style={known ? { borderLeftColor: SEVERITY_LEVEL_COLOR[incident.severity] } : undefined}
    >
      {/* Ảnh hiện trường; đang phân tích ảnh thì có vệt quét chạy qua. */}
      <span className="relative shrink-0 w-24 h-20 overflow-hidden rounded-lg ring-2 ring-indigo-200">
        <IncidentThumbnail incident={incident} className="w-full h-full" />
        {progress.phase === 'analyzing' && <span className="ai-case-scan" />}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="min-w-0 truncate text-xs font-semibold text-indigo-800">
            {incident.aiPending ? t('liveMap.cases.ai.unknownKind') : incidentKindLabel(incident)}
          </span>
          {known && <SeverityBadge severity={incident.severity} unclassified={false} />}
          <span
            className={`ml-auto shrink-0 font-mono-data text-base font-bold tabular-nums ${
              progress.slow ? 'text-amber-700' : 'text-slate-800'
            }`}
          >
            {formatWaitTime(progress.elapsedSeconds)}
          </span>
        </div>
        <p className="mt-0.5 text-[15px] font-semibold text-slate-900 truncate">{incident.title}</p>
        <p className="flex items-center gap-1 text-xs text-slate-500 min-w-0">
          {incident.code && (
            <>
              <IncidentCode code={incident.code} className="shrink-0" />
              <span aria-hidden>·</span>
            </>
          )}
          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{incident.area}</span>
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <AiProgressStrip phase={progress.phase} />
          <SegmentBar progress={progress} height="h-1.5" className="flex-1 min-w-[8rem]" />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <p
            role="status"
            className={`flex items-center gap-1.5 text-xs font-semibold ${progress.slow ? 'text-amber-800' : 'text-indigo-800'}`}
          >
            <AiStepGlyph phase={progress.phase} />
            {status}
          </p>
          <button
            type="button"
            onClick={onOpen}
            title={t('layout.aiLane.takeOverTitle')}
            className="shrink-0 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {t('layout.aiLane.takeOver')}
          </button>
        </div>
      </div>
    </div>
  );
};
