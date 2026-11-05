import type { ServiceAreaDto } from '../services/liveMapService';

// Bán kính hoạt động thực tế của nền tảng tại Khu Công nghệ cao (SHTP) — SOS / tạo sự cố ngoài vòng này bị chặn.
export const KCN_RADIUS_KM = 4.5;

export const DEFAULT_SERVICE_AREA: ServiceAreaDto = {
  enabled: true,
  name: 'Khu Công nghệ cao, TP. Thủ Đức (SHTP)',
  centerLat: 10.8441,
  centerLng: 106.8089,
  radiusKm: KCN_RADIUS_KM,
};

/** Vùng phục vụ áp dụng thật: tâm theo cấu hình Admin (nếu có), bán kính luôn là KCN_RADIUS_KM. */
export interface EffectiveServiceArea {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

export function resolveServiceArea(area?: ServiceAreaDto | null): EffectiveServiceArea {
  return {
    name: area?.name || DEFAULT_SERVICE_AREA.name!,
    lat: area?.centerLat ? area.centerLat : DEFAULT_SERVICE_AREA.centerLat,
    lng: area?.centerLng ? area.centerLng : DEFAULT_SERVICE_AREA.centerLng,
    radiusKm: KCN_RADIUS_KM,
  };
}

export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Số km nằm ngoài vùng (làm tròn 0.1); 0 = trong vùng. */
export function distanceOutsideAreaKm(point: { lat: number; lng: number }, area: EffectiveServiceArea): number {
  const outside = haversineDistanceKm(point.lat, point.lng, area.lat, area.lng) - area.radiusKm;
  return outside > 0 ? Math.max(0.1, Math.round(outside * 10) / 10) : 0;
}
