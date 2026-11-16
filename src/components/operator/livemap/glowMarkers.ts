import fireSvg from './icons/fire.svg?raw';
import accidentSvg from './icons/accident.svg?raw';
import sosSvg from './icons/sos.svg?raw';
import stationSvg from './icons/station.svg?raw';
import trafficJamSvg from './icons/traffic-jam.svg?raw';
import pickPinSvg from './icons/pick-pin.svg?raw';
import vehicleFireSvg from './icons/vehicle-fire.svg?raw';
import vehicleAmbulanceSvg from './icons/vehicle-ambulance.svg?raw';
import vehicleRescueSvg from './icons/vehicle-rescue.svg?raw';
import { INCIDENT_CATEGORY_META } from '../../../data/incidentMock';
import { GLOW_MARKER_COLORS as C, VEHICLE_STATUS_META } from '../../../data/liveMapMeta';
import type { IncidentCategory, SeverityLevel } from '../../../types/incident';
import type { DispatchVehicleType, VehicleStatus } from '../../../types/vehicle';

/**
 * Bộ marker mới của Live Map Operator (chốt 2026-11-12):
 * - Sự cố / trạm / ùn tắc: kiểu "Quầng sáng" — lõi tối, vòng màu, hình một màu trong `icons/*.svg`.
 * - Xe: hình semi-flat nhiều màu, viền trắng kiểu hình dán + chấm trạng thái, lật ngang khi chạy về phía tây.
 * mapIcons.ts giữ nguyên vì Citizen / Landing / MapboxLocationPicker vẫn dùng bộ cũ.
 */

/** Bỏ comment, đặt lại kích thước của file SVG gốc để chèn thẳng vào HTML marker. */
function inlineSvg(raw: string, width: number, height: number): string {
  return raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<svg([^>]*?)\swidth="[^"]*"\sheight="[^"]*"/, `<svg$1 width="${width}" height="${height}"`)
    .replace('<svg', '<svg style="display:block;overflow:visible"')
    .trim();
}

/** Hình một màu đặt trong khung — tô màu qua `color` (SVG dùng currentColor). */
function glyph(raw: string, left: number, top: number, size: number, color: string): string {
  return `<div style="position:absolute;left:${left}px;top:${top}px;width:${size}px;height:${size}px;color:${color};pointer-events:none;">${inlineSvg(raw, size, size)}</div>`;
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** 3 cung quanh lõi, sáng theo cấp độ (Cấp 1 = 1 cung … Cấp 3 = 3 cung). viewBox 48, tâm 24. */
function severityArcs(severity: SeverityLevel, r = 17.5, width = 3.6): string {
  let s = '';
  for (let i = 0; i < 3; i++) {
    const a0 = -90 + i * 120 + 9;
    const a1 = -90 + (i + 1) * 120 - 9;
    const color = i < severity ? C.severityArc[severity] : C.arcIdle;
    s += `<path d="${arcPath(24, 24, r, a0, a1)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
  }
  return s;
}

const INCIDENT_GLYPH: Record<IncidentCategory, string> = { fire: fireSvg, accident: accidentSvg, unknown: sosSvg };

/** Sự cố: lõi tối + 3 cung cấp độ + quầng màu loại sự cố. Neo tâm. */
export function glowIncidentMarkerHtml(category: IncidentCategory, severity: SeverityLevel, selected: boolean): string {
  const size = selected ? 54 : 48;
  const k = size / 48;
  const color = INCIDENT_CATEGORY_META[category].color;
  return `
    <div class="relative cursor-pointer" style="width:${size}px;height:${size}px;">
      <svg viewBox="0 0 48 48" width="${size}" height="${size}" style="position:absolute;inset:0;overflow:visible;pointer-events:none;">
        <circle cx="24" cy="24" r="22" fill="${color}" opacity="0.22"${selected ? ' class="animate-pulse"' : ''}/>
        ${selected ? '<circle cx="24" cy="24" r="23.2" fill="none" stroke="#FFFFFF" stroke-width="1.6"/>' : ''}
        <circle cx="24" cy="24" r="13.5" fill="${C.core}" stroke="${color}" stroke-width="1.5"/>
        ${severityArcs(severity)}
      </svg>
      ${glyph(INCIDENT_GLYPH[category], 16 * k, 16 * k, 16 * k, C.categoryGlyph[category])}
    </div>
  `;
}

/** Trạm: ô vuông tối bo góc; trạm của tôi viền đỏ + quầng đỏ, trạm khác viền xám. Neo tâm. */
export function glowStationMarkerHtml(isMine = false): string {
  const ring = isMine ? C.station.mine : C.station.other;
  return `
    <div class="relative cursor-pointer" style="width:40px;height:40px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.45));">
      <svg viewBox="0 0 40 40" width="40" height="40" style="position:absolute;inset:0;pointer-events:none;">
        ${isMine ? `<rect x="1" y="1" width="38" height="38" rx="12" fill="${C.station.mineHalo}" opacity="0.22"/>` : ''}
        <rect x="6" y="6" width="28" height="28" rx="8" fill="${C.core}" stroke="${ring}" stroke-width="2.5"/>
      </svg>
      ${glyph(stationSvg, 10, 9.5, 20, ring)}
    </div>
  `;
}

/**
 * Điểm ùn tắc: lõi tối 36px. Chưa có đội = viền cam nét đứt, đang giải tỏa = viền xanh,
 * `escalated` (§24: tê liệt quá ngưỡng, còn Active) = viền đỏ + vòng đỏ nhấp nháy. Neo tâm.
 */
export function glowTrafficJamMarkerHtml(status: 'active' | 'assigned' = 'active', escalated = false): string {
  const state = escalated && status === 'active' ? 'escalated' : status;
  const { ring, glyph: glyphColor } = C.trafficJam[state];
  const pulse =
    state === 'escalated'
      ? `<span class="absolute rounded-full animate-ping pointer-events-none" style="left:3px;top:3px;width:30px;height:30px;background:${C.pulse};opacity:0.55;"></span>`
      : '';
  return `
    <div class="relative cursor-pointer" style="width:36px;height:36px;">
      ${pulse}
      <svg viewBox="0 0 36 36" width="36" height="36" style="position:absolute;inset:0;pointer-events:none;">
        <circle cx="18" cy="18" r="17" fill="${ring}" opacity="0.2"/>
        <circle cx="18" cy="18" r="12.5" fill="${C.core}" stroke="${ring}" stroke-width="2.5"${state === 'active' ? ' stroke-dasharray="4.5 3"' : ''}/>
      </svg>
      ${glyph(trafficJamSvg, 9.5, 9.5, 17, glyphColor)}
    </div>
  `;
}

const VEHICLE_ART: Record<DispatchVehicleType, string> = {
  fire_truck: vehicleFireSvg,
  ambulance: vehicleAmbulanceSvg,
  rescue: vehicleRescueSvg,
};

// Hình xe 120×64, mặt đất ở y≈58.5 → phần tử marker cao đúng tới mặt đất để neo 'bottom' chạm đường.
const VEHICLE_ART_RATIO = 64 / 120;
const VEHICLE_GROUND_RATIO = 58.5 / 120;
const VEHICLE_PAD = 4;
const WHITE_OUTLINE =
  'drop-shadow(1.5px 0 0 #fff) drop-shadow(-1.5px 0 0 #fff) drop-shadow(0 1.5px 0 #fff) drop-shadow(0 -1.5px 0 #fff) drop-shadow(0 2px 3px rgba(0,0,0,0.5))';

/** Hướng 180°–360° (bắc = 0°, theo chiều kim đồng hồ) là đi về phía tây → lật hình để đầu xe quay theo hướng chạy. */
const isHeadingWest = (heading: number) => {
  const h = ((heading % 360) + 360) % 360;
  return h > 180 && h < 360;
};

/**
 * Xe: hình semi-flat nhiều màu, viền trắng kiểu hình dán; chấm góc trên = trạng thái
 * (đang di chuyển nhấp nháy, đội đã nhận đứng yên); đang chọn thì to hơn và có vòng nét đứt dưới gầm.
 * Neo 'bottom' (mặt đất dưới bánh xe).
 */
export function stickerVehicleMarkerHtml(
  type: DispatchVehicleType,
  status: VehicleStatus,
  selected: boolean,
  heading = 0
): string {
  const artW = selected ? 64 : 56;
  const artH = artW * VEHICLE_ART_RATIO;
  const ground = artW * VEHICLE_GROUND_RATIO;
  const width = artW + VEHICLE_PAD * 2;
  const height = ground + VEHICLE_PAD;
  const west = isHeadingWest(heading);
  const color = VEHICLE_STATUS_META[status].color;
  // Chấm trạng thái nằm phía đầu xe (lật theo hướng chạy).
  const dotLeft = (west ? VEHICLE_PAD : artW - VEHICLE_PAD) - 1.5;
  const dotBox = `left:${dotLeft}px;top:-1.5px;width:11px;height:11px;`;
  const pulse =
    status === 'en_route'
      ? `<span class="absolute rounded-full animate-ping pointer-events-none" style="${dotBox}background:${color};opacity:0.6;"></span>`
      : '';
  const ring = selected
    ? `<span class="absolute rounded-full pointer-events-none" style="left:50%;bottom:-7px;width:${artW + 4}px;height:14px;transform:translateX(-50%);border:2px dashed #FFFFFF;background:rgba(255,255,255,0.18);"></span>`
    : '';
  return `
    <div class="relative cursor-pointer" style="width:${width}px;height:${height}px;">
      ${ring}
      <div style="position:absolute;left:${VEHICLE_PAD}px;top:${VEHICLE_PAD}px;width:${artW}px;height:${artH}px;filter:${WHITE_OUTLINE};${west ? 'transform:scaleX(-1);' : ''}pointer-events:none;">
        ${inlineSvg(VEHICLE_ART[type], artW, artH)}
      </div>
      ${pulse}
      <span class="absolute rounded-full pointer-events-none" style="${dotBox}background:${color};border:2px solid #FFFFFF;box-sizing:border-box;box-shadow:0 1px 2px rgba(0,0,0,0.4);"></span>
    </div>
  `;
}

/** Ghim chọn vị trí khi Operator tạo sự cố: ghim lõi tối, quầng đỏ, vòng nhấp nháy dưới chân. Neo 'bottom' (mũi ghim). */
export function pickPinMarkerHtml(): string {
  return `
    <div style="position:relative;width:30px;height:39px;cursor:grab;">
      <span class="absolute rounded-full animate-ping pointer-events-none" style="left:6px;bottom:-9px;width:18px;height:18px;background:${C.pulse};opacity:0.55;"></span>
      <div style="position:absolute;left:0;top:0;filter:drop-shadow(0 0 5px rgba(239,68,68,0.85)) drop-shadow(0 2px 3px rgba(0,0,0,0.45));">
        ${inlineSvg(pickPinSvg, 30, 40)}
      </div>
    </div>`;
}

// ---------- Icon nhỏ cho hộp chú thích (MapLegend) ----------

/** Lõi tối tròn + hình loại sự cố. */
export function legendIncidentIconHtml(category: IncidentCategory, size = 18): string {
  const color = INCIDENT_CATEGORY_META[category].color;
  const g = Math.round(size * 0.62);
  return `
    <div style="position:relative;width:${size}px;height:${size}px;">
      <svg viewBox="0 0 20 20" width="${size}" height="${size}" style="position:absolute;inset:0;"><circle cx="10" cy="10" r="9" fill="${C.core}" stroke="${color}" stroke-width="1.5"/></svg>
      ${glyph(INCIDENT_GLYPH[category], (size - g) / 2, (size - g) / 2, g, C.categoryGlyph[category])}
    </div>`;
}

/** Vòng 3 cung sáng theo cấp độ. */
export function legendSeverityIconHtml(severity: SeverityLevel, size = 18): string {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" style="display:block;"><circle cx="24" cy="24" r="12" fill="${C.core}"/>${severityArcs(severity, 18, 6)}</svg>`;
}

/** Hình xe semi-flat thu nhỏ. */
export function legendVehicleIconHtml(type: DispatchVehicleType, width = 30): string {
  return inlineSvg(VEHICLE_ART[type], width, width * VEHICLE_ART_RATIO);
}

/** Ô trạm thu nhỏ. */
export function legendStationIconHtml(isMine: boolean, size = 18): string {
  const ring = isMine ? C.station.mine : C.station.other;
  const g = Math.round(size * 0.68);
  return `
    <div style="position:relative;width:${size}px;height:${size}px;">
      <svg viewBox="0 0 20 20" width="${size}" height="${size}" style="position:absolute;inset:0;"><rect x="1" y="1" width="18" height="18" rx="5" fill="${C.core}" stroke="${ring}" stroke-width="1.6"/></svg>
      ${glyph(stationSvg, (size - g) / 2, (size - g) / 2, g, ring)}
    </div>`;
}

/** Điểm ùn tắc thu nhỏ theo trạng thái. */
export function legendTrafficJamIconHtml(state: 'active' | 'assigned' | 'escalated', size = 18): string {
  const { ring, glyph: glyphColor } = C.trafficJam[state];
  const g = Math.round(size * 0.66);
  return `
    <div style="position:relative;width:${size}px;height:${size}px;">
      <svg viewBox="0 0 20 20" width="${size}" height="${size}" style="position:absolute;inset:0;"><circle cx="10" cy="10" r="8.8" fill="${C.core}" stroke="${ring}" stroke-width="1.6"${state === 'active' ? ' stroke-dasharray="3 2"' : ''}/></svg>
      ${glyph(trafficJamSvg, (size - g) / 2, (size - g) / 2, g, glyphColor)}
    </div>`;
}
