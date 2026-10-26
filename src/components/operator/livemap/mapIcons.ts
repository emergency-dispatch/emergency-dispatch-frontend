import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Building2 } from 'lucide-react';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../../data/liveMapMeta';
import { HAZARD_TAG_META, INCIDENT_CATEGORY_META, SEVERITY_LEVEL_COLOR } from '../../../data/incidentMock';
import type { VehicleStatus, VehicleType } from '../../../types/vehicle';
import type { IncidentCategory, SeverityLevel } from '../../../types/incident';

/**
 * Live Map chỉ vẽ xe đang trên đường tới hiện trường (đội đã nhận / đang di chuyển); xe đậu ở trạm, chờ đội xác nhận,
 * tại hiện trường, hồi sức, bảo trì không vẽ — ghim trạm đã đại diện (popup trạm vẫn ghi số xe sẵn sàng).
 */
export const MAP_VISIBLE_VEHICLE_STATUSES: VehicleStatus[] = ['accepted', 'en_route'];

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

// Marker sự cố: icon + màu theo nhánh, giống chú thích (🔥 Cháy nổ đỏ / 🚗 Tai nạn cam).
// Cấp độ là huy hiệu số nhỏ ở góc, màu theo cấp.
export function incidentMarkerHtml(category: IncidentCategory, severity: SeverityLevel, selected: boolean): string {
  const color = INCIDENT_CATEGORY_META[category].color;
  const badge = selected ? 18 : 16;
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
      <span class="absolute flex items-center justify-center rounded-full font-bold text-white pointer-events-none"
        style="right:-${Math.round(badge / 2.5)}px;top:-${Math.round(badge / 2.5)}px;width:${badge}px;height:${badge}px;background:${SEVERITY_LEVEL_COLOR[severity]};border:2px solid #FFFFFF;font-size:${badge - 7}px;line-height:1;">
        ${severity}
      </span>
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

// Ghim trạm cứu hộ: khối vuông bo góc màu navy + icon tòa nhà trạm, mũi ghim ở đáy (marker neo 'bottom').
export function stationMarkerHtml(isMine = false): string {
  const bg = isMine ? '#B91C1C' : '#1E293B';
  const svg = renderToStaticMarkup(createElement(Building2, { width: 16, height: 16, color: '#FFFFFF', strokeWidth: 2.25 }));
  return `
    <div class="cursor-pointer flex flex-col items-center" style="filter:drop-shadow(0 2px 4px rgba(15,23,42,0.35));">
      <div class="flex items-center justify-center" style="width:30px;height:30px;border-radius:9px;background:${bg};border:2px solid #FFFFFF;">
        ${svg}
      </div>
      <div style="width:0;height:0;margin-top:-1px;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${bg};"></div>
    </div>
  `;
}
