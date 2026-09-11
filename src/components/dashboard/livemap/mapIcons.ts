import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../../data/liveMapMock';
import { SEVERITY_COLOR } from '../../../data/incidentMock';
import type { VehicleStatus, VehicleType } from '../../../types/vehicle';
import type { IncidentSeverity } from '../../../types/incident';

export function createVehicleIcon(type: VehicleType, status: VehicleStatus, selected: boolean): L.DivIcon {
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

  const html = `
    <div class="relative flex items-center justify-center" style="width:${size}px;height:${size}px;">
      ${pulseRing}
      <div class="relative flex items-center justify-center rounded-full border-2 pointer-events-none" style="width:${size}px;height:${size}px;background:${color};border-color:${ringBorder};box-shadow:0 0 8px 1px ${color}99;">
        ${typeIconSvg}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createIncidentIcon(severity: IncidentSeverity, selected: boolean): L.DivIcon {
  const color = SEVERITY_COLOR[severity];
  const size = selected ? 26 : 20;
  const ringBorder = '#FFFFFF';

  const html = `
    <div class="relative flex items-center justify-center" style="width:${size}px;height:${size}px;">
      <span class="absolute inset-0 rounded-full animate-ping pointer-events-none" style="background:${color};opacity:0.45;"></span>
      <div class="relative flex items-center justify-center rounded-full border-2 pointer-events-none" style="width:${size}px;height:${size}px;background:${color};border-color:${ringBorder};box-shadow:0 0 10px 2px ${color}99;">
        <span class="text-white font-black leading-none pointer-events-none" style="font-size:${Math.round(size * 0.5)}px;">!</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createStationIcon(): L.DivIcon {
  const html = `
    <div style="width:14px;height:14px;background:#131D33;border:2px solid #FFFFFF;transform:rotate(45deg);box-shadow:0 1px 4px rgba(0,0,0,0.6);"></div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}
