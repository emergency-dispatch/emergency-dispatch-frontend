import React from 'react';
import { HazardTagBadge } from './HazardTagBadge';
import { IncidentThumbnail } from './IncidentThumbnail';
import { PlausibilityBadge } from './PlausibilityBadge';
import { SeverityBadge } from './SeverityBadge';
import type { Incident } from '../../../types/incident';

interface IncidentRowProps {
  incident: Incident;
  isNew: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export const IncidentRow: React.FC<IncidentRowProps> = ({ incident, isNew, isSelected, onClick }) => {
  const waitMinutes = Math.max(0, Math.round((Date.now() - new Date(incident.createdAt).getTime()) / 60000));
  const isOverdue = incident.severity >= 4 && waitMinutes > 5;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-3.5 text-left border-b border-slate-800/80 border-l-2 transition-colors ${
        isSelected ? 'bg-blue-600/10 border-l-blue-500' : 'border-l-transparent hover:bg-slate-800/40'
      } ${isNew ? 'animate-queue-enter' : ''}`}
    >
      <IncidentThumbnail incident={incident} className="w-14 h-14 shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <SeverityBadge severity={incident.severity} />
          <PlausibilityBadge score={incident.plausibilityScore} />
          {isOverdue && (
            <span className="text-[10px] font-mono-data text-red-400 font-bold uppercase tracking-wide animate-pulse">
              Quá hạn
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-white truncate">{incident.title}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {incident.hazardTags.map((tag) => (
            <HazardTagBadge key={tag} tag={tag} />
          ))}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[11px] font-mono-data text-slate-500 whitespace-nowrap">{incident.area}</div>
        <div className="text-[11px] font-mono-data text-slate-600 mt-1 whitespace-nowrap">{waitMinutes} phút trước</div>
      </div>
    </button>
  );
};
