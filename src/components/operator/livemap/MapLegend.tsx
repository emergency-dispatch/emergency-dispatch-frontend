import React, { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { INCIDENT_CATEGORY_META } from '../../../data/incidentMock';
import { DISPATCH_VEHICLE_TYPES, VEHICLE_STATUS_META } from '../../../data/liveMapMeta';
import type { IncidentCategory } from '../../../types/incident';
import { MAP_VISIBLE_VEHICLE_STATUSES } from './mapIcons';
import {
  legendIncidentIconHtml,
  legendSeverityIconHtml,
  legendStationIconHtml,
  legendTrafficJamIconHtml,
  legendVehicleIconHtml,
} from './glowMarkers';
import { useTranslation } from '../../../i18n';

const SEVERITY_LEGEND = [1, 2, 3] as const;

// Nhớ trạng thái thu gọn cho lần mở sau (chỉ là tiện ích của từng người xem).
const STORAGE_KEY = 'resq.liveMap.legendCollapsed';

const readCollapsed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const sectionTitle = 'text-[10px] font-mono-data uppercase tracking-widest text-slate-500 font-bold mb-1';
// Lưới 2 cột cố định để chú thích gọn trong một khung hẹp, không trải theo chiều ngang bản đồ.
const grid2 = 'grid grid-cols-2 gap-x-3 gap-y-1';
const itemClass = 'flex items-center gap-1.5 min-w-0 text-[11px] leading-tight text-slate-700';

/** Icon chú thích lấy đúng hình của marker (SVG tĩnh trong livemap/icons, không có dữ liệu người dùng). */
const MarkerIcon: React.FC<{ html: string }> = ({ html }) => (
  <span className="shrink-0 inline-flex" aria-hidden dangerouslySetInnerHTML={{ __html: html }} />
);

const Item: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <span className={itemClass}>
    {icon}
    <span className="min-w-0">{label}</span>
  </span>
);

export const MapLegend: React.FC = () => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(readCollapsed);

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
        {t('liveMap.legend.open')}
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-[1000] cad-glass rounded-xl px-3 py-2.5 space-y-2 w-[272px] max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] overflow-y-auto">
      <div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className={`${sectionTitle} mb-0`}>{t('liveMap.legend.incidents')}</span>
          <button
            onClick={toggle}
            className="p-0.5 -mr-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label={t('liveMap.legend.collapse')}
            aria-expanded
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className={grid2}>
          {(Object.keys(INCIDENT_CATEGORY_META) as IncidentCategory[]).map((key) => (
            <Item key={key} icon={<MarkerIcon html={legendIncidentIconHtml(key, 16)} />} label={t(`enums.category.${key}`)} />
          ))}
        </div>
        {/* Cấp độ = số cung sáng quanh lõi marker sự cố (Cấp 1 = 1 cung … Cấp 3 = 3 cung). */}
        <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-slate-700">
          <span className="text-slate-500">{t('liveMap.legend.severity')}</span>
          {SEVERITY_LEGEND.map((level) => (
            <span key={level} className="flex items-center gap-1" title={t(`enums.severityShort.level${level}`)}>
              <MarkerIcon html={legendSeverityIconHtml(level, 16)} />
              <span className="font-mono-data font-bold">{level}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <div className={sectionTitle}>{t('liveMap.legend.vehicles')}</div>
        <div className={grid2}>
          {DISPATCH_VEHICLE_TYPES.map((type) => (
            <Item key={type} icon={<MarkerIcon html={legendVehicleIconHtml(type, 26)} />} label={t(`enums.vehicleType.${type}`)} />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          {MAP_VISIBLE_VEHICLE_STATUSES.map((status) => (
            <Item
              key={status}
              icon={<span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: VEHICLE_STATUS_META[status].color }} />}
              label={t(`enums.vehicleStatus.${status}`)}
            />
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <div className={sectionTitle}>{t('liveMap.legend.stationsAndTraffic')}</div>
        <div className={grid2}>
          <Item icon={<MarkerIcon html={legendStationIconHtml(true, 16)} />} label={t('liveMap.legend.myStation')} />
          <Item icon={<MarkerIcon html={legendStationIconHtml(false, 16)} />} label={t('liveMap.legend.otherStation')} />
          <Item icon={<MarkerIcon html={legendTrafficJamIconHtml('active', 16)} />} label={t('liveMap.legend.trafficJam')} />
          <Item icon={<MarkerIcon html={legendTrafficJamIconHtml('assigned', 16)} />} label={t('liveMap.legend.trafficJamAssigned')} />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <div className={sectionTitle}>{t('liveMap.legend.areas')}</div>
        <div className={grid2}>
          <Item
            icon={<span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-red-600 bg-red-600/10 shrink-0" />}
            label={t('liveMap.legend.stationCoverage')}
          />
          <Item
            icon={<span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-violet-600 bg-violet-600/10 shrink-0" />}
            label={t('liveMap.legend.otherStationCoverage')}
          />
          <Item
            icon={<span className="w-3.5 h-0 border-t-2 border-dashed border-blue-600 shrink-0" />}
            label={t('liveMap.legend.serviceArea')}
          />
          <Item
            icon={<span className="w-3.5 h-0 border-t-2 border-dashed border-slate-500 shrink-0" />}
            label={t('liveMap.legend.approximateRoute')}
          />
        </div>
      </div>
    </div>
  );
};
