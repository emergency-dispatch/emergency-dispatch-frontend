import React from 'react';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMock';

export const MapLegend: React.FC = () => {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] cad-glass rounded-xl border border-slate-700/80 px-3.5 py-3 shadow-glass-panel">
      <div className="text-[10px] font-mono-data uppercase tracking-widest text-slate-400 font-bold mb-2">
        Vehicle Status
      </div>
      <div className="space-y-1.5">
        {Object.entries(VEHICLE_STATUS_META).map(([status, meta]) => (
          <div key={status} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
            <span className="text-xs text-slate-300">{meta.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1 mt-1 border-t border-slate-800">
          <span className="w-2.5 h-2.5 rounded-sm border border-slate-400 shrink-0" />
          <span className="text-xs text-slate-300">Station</span>
        </div>
      </div>
    </div>
  );
};
