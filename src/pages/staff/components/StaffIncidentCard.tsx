import React from 'react';
import type { StaffMission } from '../../../types/staff';
import { SEVERITY_META } from '../../../data/incidentMock';
import { HazardTagBadge } from '../../../components/common/HazardTagBadge';
import { MapPin, Phone, User, UserCheck, Sparkles } from 'lucide-react';

interface StaffIncidentCardProps {
  mission: StaffMission;
}

export const StaffIncidentCard: React.FC<StaffIncidentCardProps> = ({ mission }) => {
  const severityMeta = SEVERITY_META[mission.severity];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${severityMeta?.badgeClass || 'bg-red-600 text-white'}`}
          >
            {severityMeta?.label || `Cấp độ ${mission.severity}`}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            #{mission.incidentId}
          </span>
        </div>

        <span className="text-xs text-red-600 font-mono font-bold">
          {mission.area}
        </span>
      </div>

      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
        {mission.title}
      </h3>

      <p className="text-xs text-slate-600 leading-relaxed">
        {mission.description}
      </p>

      {/* Hazard Tags */}
      {mission.hazardTags && mission.hazardTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {mission.hazardTags.map((tag) => (
            <HazardTagBadge key={tag} tag={tag} size="sm" />
          ))}
        </div>
      )}

      {/* Address & Caller */}
      <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
        <div className="flex items-start gap-2 text-slate-600">
          <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span className="font-medium text-slate-900">{mission.address}</span>
        </div>

        <div className="flex flex-col gap-2 text-slate-600 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
          <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-200/60">
            <div className="flex items-center gap-1.5">
              {mission.isAiDispatched || mission.dispatcherName === 'AI tự điều phối' ? (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-purple-100 text-purple-800 border border-purple-200">
                  <Sparkles className="w-3 h-3 text-purple-600 animate-pulse" />
                  <span>AI tự điều phối</span>
                </div>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-red-600" />
                  <span>
                    Điều phối: <strong className="text-slate-900">{mission.dispatcherName || 'Điều phối viên CAD'}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Người báo: <strong className="text-slate-900">{mission.callerName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-red-600" />
              <a
                href={`tel:${mission.callerPhone}`}
                className="text-red-600 font-mono font-bold hover:underline"
              >
                {mission.callerPhone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
