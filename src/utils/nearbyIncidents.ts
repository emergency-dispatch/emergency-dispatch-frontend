import type { Incident } from '../types/incident';

// Tin báo qua điện thoại / bộ đàm có thể đúng là vụ người dân đã SOS → cảnh báo khả năng trùng khi đặt ghim.
export const DUPLICATE_RADIUS_M = 500;
export const DUPLICATE_WINDOW_MINUTES = 60;

export interface NearbyIncident {
  incident: Incident;
  distanceM: number;
  minutesAgo: number;
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Sự cố đang mở (chờ duyệt / đang điều phối) trong bán kính và khung thời gian gần đây, gần nhất trước. */
export function findNearbyIncidents(incidents: Incident[], point: { lat: number; lng: number }, now = Date.now()): NearbyIncident[] {
  return incidents
    .filter((i) => i.status !== 'completed')
    .map((incident) => ({
      incident,
      distanceM: Math.round(distanceMeters(point.lat, point.lng, incident.lat, incident.lng)),
      minutesAgo: Math.max(0, Math.round((now - new Date(incident.createdAt).getTime()) / 60000)),
    }))
    .filter((n) => n.distanceM <= DUPLICATE_RADIUS_M && n.minutesAgo <= DUPLICATE_WINDOW_MINUTES)
    .sort((a, b) => a.distanceM - b.distanceM);
}
