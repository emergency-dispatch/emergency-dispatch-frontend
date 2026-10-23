import React, { useState } from 'react';
import { Building2, ChevronDown, Info } from 'lucide-react';
import { HAZARD_TAG_META, INCIDENT_CATEGORY_META, SEVERITY_LEVEL_COLOR } from '../../../data/incidentMock';
import { DISPATCH_VEHICLE_TYPES, VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../../data/liveMapMeta';

const SEVERITY_LEGEND = [
  { level: 1, label: 'Cấp 1' },
  { level: 2, label: 'Cấp 2' },
  { level: 3, label: 'Cấp 3' },
] as const;

// Nhớ trạng thái thu gọn cho lần mở sau (chỉ là tiện ích của từng người xem).
const STORAGE_KEY = 'resq.liveMap.legendCollapsed';

const readCollapsed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const sectionTitle = 'text-[10px] font-mono-data uppercase tracking-widest text-slate-500 font-bold mb-1.5';

export const MapLegend: React.FC = () => {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const TrafficIcon = HAZARD_TAG_META.traffic_jam.icon;

  const toggle = () => {
    setCollapsed((prev) => {
      try {
        localStorage.setItem(STORAGE_KEY, prev ? '0' : '1');
      } catch {
        // Bỏ qua: trình duyệt chặn storage thì chỉ không nhớ được lựa chọn.
      }
      return !prev;
    });
  };

  if (collapsed) {
    return (
      <button
        onClick={toggle}
        className="absolute bottom-4 left-4 z-[1000] cad-glass rounded-xl px-3 py-2 flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
        aria-expanded={false}
      >
        <Info className="w-3.5 h-3.5" />
        Chú thích
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-[1000] cad-glass rounded-xl px-3.5 py-3 space-y-2.5 max-w-[calc(100%-2rem)]">
      <div>
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className={`${sectionTitle} mb-0`}>Sự cố</span>
          <button
            onClick={toggle}
            className="p-0.5 -mr-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Thu gọn chú thích"
            aria-expanded
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {Object.entries(INCIDENT_CATEGORY_META).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <span key={key} className="flex items-center gap-1 text-xs text-slate-700">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
                {meta.label}
              </span>
            );
          })}
          {SEVERITY_LEGEND.map(({ level, label }) => (
            // Cấp độ = số nhỏ ở góc marker sự cố.
            <span key={level} className="flex items-center gap-1 text-xs text-slate-700">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
                style={{ backgroundColor: SEVERITY_LEVEL_COLOR[level] }}
              >
                {level}
              </span>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <div className={sectionTitle}>Tổ / xe</div>
        <div className="flex items-center gap-3 flex-wrap mb-1.5">
          {DISPATCH_VEHICLE_TYPES.map((type) => {
            const TypeIcon = VEHICLE_TYPE_META[type].icon;
            return (
              <span key={type} className="flex items-center gap-1 text-xs text-slate-700">
                <span className="w-4 h-4 rounded-full bg-slate-500 flex items-center justify-center shrink-0">
                  <TypeIcon className="w-2.5 h-2.5" color="#FFFFFF" />
                </span>
                {VEHICLE_TYPE_META[type].label}
              </span>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(VEHICLE_STATUS_META).map(([status, meta]) => (
            <div key={status} className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
              <span className="text-xs text-slate-700 truncate">{meta.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200 flex items-center gap-x-4 gap-y-1 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-[5px] bg-red-700 flex items-center justify-center shrink-0">
            <Building2 className="w-2.5 h-2.5 text-white" />
          </span>
          <span className="text-xs text-slate-700">Trạm của bạn</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-[5px] bg-slate-800 flex items-center justify-center shrink-0">
            <Building2 className="w-2.5 h-2.5 text-white" />
          </span>
          <span className="text-xs text-slate-700">Trạm khác</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: HAZARD_TAG_META.traffic_jam.color }}
          >
            <TrafficIcon className="w-2.5 h-2.5 text-white" />
          </span>
          <span className="text-xs text-slate-700">Ùn tắc</span>
        </span>
      </div>
    </div>
  );
};
