import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../../data/liveMapMock';
import { HAZARD_TAG_META, INCIDENT_CATEGORY_META, SEVERITY_LEVEL_COLOR } from '../../../data/incidentMock';
import type { VehicleStatus, VehicleType } from '../../../types/vehicle';
import type { IncidentCategory, SeverityLevel } from '../../../types/incident';

// Các hàm dưới đây trả về HTML cho phần tử marker của mapbox-gl (Marker neo ở tâm phần tử).

export function vehicleMarkerHtml(type: VehicleType, status: VehicleStatus, selected: boolean): string {
  const color = VEHICLE_STATUS_META[status].color;
  const size = selected ? 30 : 22;
  const iconSize = Math.round(size * 0.55);
  // Always white: stays legible whether the tile layer is light, dark, or satellite.
  const ringBorder = '#FFFFFF';

  const TypeIcon = VEHICLE_TYPE_META[type].icon;
  const typeIconSvg = renderToStaticMarkup(
    createElement(TypeIcon, { width: iconSize, height: iconSize, color: '#FFFFFF', strokeWidth: 2.5 })
  );

  const pulseRing =
    status === 'en_route'
      ? `<span class="absolute inset-0 rounded-full animate-ping pointer-events-none" style="background:${color};opacity:0.5;"></span>`
      : '';

  return `
    <div class="relative flex items-center justify-center cursor-pointer" style="width:${size}px;height:${size}px;">
      ${pulseRing}
      <div class="relative flex items-center justify-center rounded-full border-2 pointer-events-none" style="width:${size}px;height:${size}px;background:${color};border-color:${ringBorder};box-shadow:0 0 8px 1px ${color}99;">
        ${typeIconSvg}
      </div>
    </div>
  `;
}

// Marker sự cố: icon theo nhánh (🔥 Cháy nổ / 🚗 Tai nạn), màu theo cấp độ.
export function incidentMarkerHtml(category: IncidentCategory, severity: SeverityLevel, selected: boolean): string {
  const color = SEVERITY_LEVEL_COLOR[severity];
  const size = selected ? 34 : 26;
  const ringBorder = '#FFFFFF';
  const categorySvg = renderToStaticMarkup(
    createElement(INCIDENT_CATEGORY_META[category].icon, {
      width: Math.round(size * 0.55),
      height: Math.round(size * 0.55),
      color: '#FFFFFF',
      strokeWidth: 2.5,
    })
  );

  return `
    <div class="relative flex items-center justify-center cursor-pointer" style="width:${size}px;height:${size}px;">
      <span class="absolute inset-0 rounded-full animate-ping pointer-events-none" style="background:${color};opacity:0.45;"></span>
      <div class="relative flex items-center justify-center rounded-full border-2 pointer-events-none" style="width:${size}px;height:${size}px;background:${color};border-color:${ringBorder};box-shadow:0 0 10px 2px ${color}99;">
        ${categorySvg}
      </div>
    </div>
  `;
}

// Điểm ùn tắc nội khu (#Traffic_Jam) — chỉ là cảnh báo, không có cấp độ.
export function trafficJamMarkerHtml(): string {
  const { color, icon } = HAZARD_TAG_META.traffic_jam;
  const svg = renderToStaticMarkup(createElement(icon, { width: 13, height: 13, color: '#FFFFFF', strokeWidth: 2.5 }));
  return `
    <div class="flex items-center justify-center rounded-md border-2 cursor-pointer" style="width:22px;height:22px;background:${color};border-color:#FFFFFF;box-shadow:0 1px 6px rgba(0,0,0,0.35);">
      ${svg}
    </div>
  `;
}

// Cụm marker xe khi nhiều xe nằm sát nhau ở mức zoom hiện tại.
export function clusterMarkerHtml(count: number): string {
  const size = count >= 5 ? 38 : 32;
  return `
    <div class="flex items-center justify-center rounded-full border-2 font-bold text-white cursor-pointer" style="width:${size}px;height:${size}px;background:#131D33;border-color:#FFFFFF;box-shadow:0 0 0 4px rgba(19,29,51,0.25);font-size:12px;">
      ${count}
    </div>
  `;
}

export function stationMarkerHtml(): string {
  return `
    <div class="cursor-pointer" style="width:14px;height:14px;background:#131D33;border:2px solid #FFFFFF;transform:rotate(45deg);box-shadow:0 1px 4px rgba(0,0,0,0.6);"></div>
  `;
}
