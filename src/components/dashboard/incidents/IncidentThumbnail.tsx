import React from 'react';
import { CirclePlay } from 'lucide-react';
import { HAZARD_TAG_META } from '../../../data/incidentMock';
import type { Incident } from '../../../types/incident';

interface IncidentThumbnailProps {
  incident: Incident;
  className?: string;
}

export const IncidentThumbnail: React.FC<IncidentThumbnailProps> = ({ incident, className = '' }) => {
  const meta = HAZARD_TAG_META[incident.hazardTags[0]];
  const Icon = meta.icon;

  if (incident.mediaUrl) {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-slate-100 ${className}`}>
        <img src={incident.mediaUrl} alt={incident.title} className="w-full h-full object-cover" />
        {incident.mediaType === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <CirclePlay className="w-5 h-5 text-white drop-shadow" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center rounded-lg overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${meta.color}26, #F1F5F9)` }}
    >
      <Icon className="w-6 h-6" style={{ color: meta.color }} />
      {incident.mediaType === 'video' && (
        <CirclePlay className="absolute bottom-1 right-1 w-3.5 h-3.5 text-white/80" />
      )}
    </div>
  );
};
