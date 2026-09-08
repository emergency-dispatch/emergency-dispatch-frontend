import L from 'leaflet';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMock';
import type { VehicleStatus } from '../../../types/vehicle';

export function createVehicleIcon(status: VehicleStatus, selected: boolean): L.DivIcon {
  const color = VEHICLE_STATUS_META[status].color;
  const size = selected ? 22 : 16;
  const ringBorder = selected ? '#F8FAFC' : 'rgba(15,23,42,0.9)';

  const pulseRing =
    status === 'en_route'
      ? `<span class="absolute inset-0 rounded-full animate-ping pointer-events-none" style="background:${color};opacity:0.5;"></span>`
      : '';

  const html = `
    <div class="relative" style="width:${size}px;height:${size}px;">
      ${pulseRing}
      <div class="absolute inset-0 rounded-full border-2 pointer-events-none" style="background:${color};border-color:${ringBorder};box-shadow:0 0 8px 1px ${color}99;"></div>
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
    <div style="width:14px;height:14px;background:#131D33;border:2px solid #64748B;transform:rotate(45deg);box-shadow:0 1px 4px rgba(0,0,0,0.6);"></div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}
