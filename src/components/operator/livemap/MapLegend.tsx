import React from 'react';
import { HAZARD_TAG_META, INCIDENT_CATEGORY_META, SEVERITY_LEVEL_COLOR } from '../../../data/incidentMock';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMeta';

const SEVERITY_LEGEND = [
  { level: 1, label: 'Cấp 1' },
  { level: 2, label: 'Cấp 2' },
  { level: 3, label: 'Cấp 3' },
] as const;

export const MapLegend: React.FC = () => {
  const TrafficIcon = HAZARD_TAG_META.traffic_jam.icon;

  return (
    <div className="absolute bottom-4 left-4 z-[1000] cad-glass rounded-xl px-3.5 py-3 space-y-2.5">
      <div>
        <div className="text-[10px] font-mono-data uppercase tracking-widest text-slate-500 font-bold mb-1.5">
          Sự cố
        </div>
        <div className="flex items-center gap-3">
          {Object.entries(INCIDENT_CATEGORY_META).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <span key={key} className="flex items-center gap-1 text-xs text-slate-700">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
                {meta.label}
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          {SEVERITY_LEGEND.map(({ level, label }) => (
            <span key={level} className="flex items-center gap-1 text-xs text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SEVERITY_LEVEL_COLOR[level] }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <div className="text-[10px] font-mono-data uppercase tracking-widest text-slate-500 font-bold mb-1.5">
          Phương tiện
        </div>
        <div className="space-y-1.5">
          {Object.entries(VEHICLE_STATUS_META).map(([status, meta]) => (
            <div key={status} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
              <span className="text-xs text-slate-700">{meta.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm border border-slate-500 rotate-45 shrink-0" />
          <span className="text-xs text-slate-700">Trạm</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: HAZARD_TAG_META.traffic_jam.color }}
          >
            <TrafficIcon className="w-2.5 h-2.5 text-white" />
          </span>
          <span className="text-xs text-slate-700">Ùn tắc</span>
        </div>
      </div>
    </div>
  );
};
