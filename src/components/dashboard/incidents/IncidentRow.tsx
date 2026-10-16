import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { HazardTagBadge } from './HazardTagBadge';
import { IncidentThumbnail } from './IncidentThumbnail';
import { ConfidenceBadge } from './ConfidenceBadge';
import { SeverityBadge } from './SeverityBadge';
import { INCIDENT_CATEGORY_META, LOW_CONFIDENCE_THRESHOLD } from '../../../data/incidentMock';
import { formatCountdown } from '../../../utils/incidentFormat';
import type { Incident } from '../../../types/incident';

interface IncidentRowProps {
  incident: Incident;
  isNew: boolean;
  isSelected: boolean;
  now: number;
  currentOperatorId: string;
  onClick: () => void;
}

export const IncidentRow: React.FC<IncidentRowProps> = ({
  incident,
  isNew,
  isSelected,
  now,
  currentOperatorId,
  onClick,
}) => {
  const waitMinutes = Math.max(0, Math.round((now - new Date(incident.createdAt).getTime()) / 60000));
  const isOverdue = incident.severity === 3 && waitMinutes > 5;
  const isLowConfidence = incident.confidenceScore < LOW_CONFIDENCE_THRESHOLD;
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;

  const lockRemainingMs = incident.lock ? new Date(incident.lock.expiresAt).getTime() - now : 0;
  const activeLock = incident.lock && lockRemainingMs > 0 ? incident.lock : null;
  const lockedByOther = !!activeLock && activeLock.operatorId !== currentOperatorId;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-3.5 text-left border-b border-slate-100 border-l-2 transition-colors ${
        isSelected ? 'bg-red-50 border-l-red-500' : 'border-l-transparent hover:bg-slate-50'
      } ${lockedByOther ? 'opacity-60' : ''} ${isNew ? 'animate-queue-enter' : ''}`}
    >
      <IncidentThumbnail incident={incident} className="w-14 h-14 shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold shrink-0"
            style={{ color: category.color }}
          >
            <CategoryIcon className="w-3.5 h-3.5" />
            {category.label}
          </span>
          <SeverityBadge severity={incident.severity} />
          <ConfidenceBadge score={incident.confidenceScore} />
          {isLowConfidence && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-amber-300 bg-amber-50 text-[10px] font-bold text-amber-700 shrink-0">
              <AlertTriangle className="w-3 h-3" />
              Độ tin cậy thấp
            </span>
          )}
          {isOverdue && (
            <span className="text-[10px] font-mono-data text-red-600 font-bold uppercase tracking-wide animate-pulse">
              Quá hạn
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-900 truncate">{incident.title}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {incident.hazardTags.map((tag) => (
            <HazardTagBadge key={tag} tag={tag} />
          ))}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[11px] font-mono-data text-slate-500 whitespace-nowrap">{incident.area}</div>
        <div className="text-[11px] font-mono-data text-slate-400 mt-1 whitespace-nowrap">{waitMinutes} phút trước</div>
        {activeLock && (
          <div
            className={`inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${
              lockedByOther ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'
            }`}
          >
            <Lock className="w-3 h-3" />
            {lockedByOther ? activeLock.operatorName : 'Bạn đang xử lý'} · {formatCountdown(lockRemainingMs)}
          </div>
        )}
      </div>
    </button>
  );
};
