import React from 'react';
import { Loader2, Lock, MapPin, Siren } from 'lucide-react';
import { HazardTagBadge } from '../../common/HazardTagBadge';
import { IncidentThumbnail } from './IncidentThumbnail';
import { ConfidenceBadge } from './ConfidenceBadge';
import { SeverityBadge } from './SeverityBadge';
import {
  AI_PENDING_RAIL_COLOR,
  AI_UNCLASSIFIED_RAIL,
  INCIDENT_CATEGORY_META,
  SEVERITY_LEVEL_COLOR,
} from '../../../data/incidentMock';
import { QUEUE_COLUMNS } from './queueColumns';
import { formatCountdown, formatDateTime, formatWaitDuration } from '../../../utils/incidentFormat';
import { isAiFallbackTag, type Incident } from '../../../types/incident';

interface IncidentRowProps {
  incident: Incident;
  isNew: boolean;
  isSelected: boolean;
  isEscalated: boolean;
  now: number;
  currentOperatorId: string;
  onClick: () => void;
}


export const IncidentRow: React.FC<IncidentRowProps> = ({
  incident,
  isNew,
  isSelected,
  isEscalated,
  now,
  currentOperatorId,
  onClick,
}) => {
  const elapsedMs = now - new Date(incident.createdAt).getTime();
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;

  const lockRemainingMs = incident.lock ? new Date(incident.lock.expiresAt).getTime() - now : 0;
  const activeLock = incident.lock && lockRemainingMs > 0 ? incident.lock : null;
  const lockedByOther = !!activeLock && activeLock.operatorId !== currentOperatorId;

  // Tag hệ thống đã được thể hiện bằng badge "Chưa phân loại" → không lặp lại dưới tiêu đề.
  const visibleTags = incident.hazardTags.filter((tag) => !isAiFallbackTag(tag));
  const railStyle: React.CSSProperties =
    incident.aiPending
      ? { background: AI_PENDING_RAIL_COLOR }
      : incident.aiUnclassified
        ? { background: AI_UNCLASSIFIED_RAIL }
        : { background: SEVERITY_LEVEL_COLOR[incident.severity] };

  return (
    <button
      onClick={onClick}
      aria-current={isSelected ? 'true' : undefined}
      className={`group relative w-full flex items-center gap-4 pl-6 pr-6 py-3.5 text-left border-b border-slate-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 ${
        isSelected ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'
      } ${lockedByOther ? 'opacity-60' : ''} ${isNew ? 'animate-queue-enter' : ''}`}
    >
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1.5" style={railStyle} />

      <IncidentThumbnail incident={incident} className={`${QUEUE_COLUMNS.thumbnail} h-12 shrink-0`} />

      {/* Cái gì, ở đâu */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-slate-900 truncate">{incident.title}</p>
        <div className="flex items-center gap-3 mt-1 text-xs min-w-0">
          <span className="inline-flex items-center gap-1 font-semibold shrink-0" style={{ color: category.color }}>
            <CategoryIcon className="w-3.5 h-3.5" />
            {category.label}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500 min-w-0" title={incident.area}>
            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{incident.area}</span>
          </span>
        </div>
        {visibleTags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {visibleTags.map((tag) => (
              <HazardTagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
        {/* Màn hẹp: cột đánh giá AI bị ẩn → hiện cấp độ ngay dưới tiêu đề */}
        {!incident.aiPending && (
          <div className="md:hidden mt-1.5">
            <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
          </div>
        )}
      </div>

      {/* AI đánh giá thế nào */}
      <div className={`hidden md:flex ${QUEUE_COLUMNS.ai} shrink-0 items-center gap-3`}>
        {incident.aiPending ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            AI đang phân tích
          </span>
        ) : (
          <>
            <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
            {!incident.aiUnclassified && <ConfidenceBadge score={incident.confidenceScore} />}
          </>
        )}
      </div>

      {/* Đã chờ bao lâu */}
      <div className={`${QUEUE_COLUMNS.wait} shrink-0 text-right`}>
        <div
          className={`text-sm font-semibold tabular-nums whitespace-nowrap ${isEscalated ? 'text-red-700' : 'text-slate-800'}`}
          title={`Tiếp nhận lúc ${formatDateTime(incident.createdAt)}`}
        >
          {formatWaitDuration(elapsedMs)}
        </div>
        {isEscalated ? (
          <div className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-bold text-red-700">
            <Siren className="w-3 h-3" />
            Leo thang
          </div>
        ) : (
          <div className="mt-0.5 text-[11px] text-slate-400">đang chờ</div>
        )}
        {activeLock && (
          <div
            className={`flex justify-end items-center gap-1 mt-1 text-[11px] font-semibold tabular-nums whitespace-nowrap ${
              lockedByOther ? 'text-slate-500' : 'text-blue-700'
            }`}
          >
            <Lock className="w-3 h-3" />
            {lockedByOther ? activeLock.operatorName : 'Bạn đang xử lý'} {formatCountdown(lockRemainingMs)}
          </div>
        )}
      </div>
    </button>
  );
};
