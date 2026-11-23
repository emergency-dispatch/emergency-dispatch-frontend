import type { ServiceAreaDto } from '../services/liveMapService';
import { parseBoundary, pointInBoundary, type PolygonCoords } from '../components/admin/settings/serviceAreaBoundary';

// Bán kính hoạt động thực tế của nền tảng tại Khu Công nghệ cao (SHTP) — SOS / tạo sự cố ngoài vòng này bị chặn.
export const KCN_RADIUS_KM = 4.5;

export const DEFAULT_SERVICE_AREA: ServiceAreaDto = {
  enabled: true,
  name: 'Khu Công nghệ cao, TP. Thủ Đức (SHTP)',
  centerLat: 10.8441,
  centerLng: 106.8089,
  radiusKm: KCN_RADIUS_KM,
};

/** Vùng phục vụ áp dụng: tâm và bán kính theo cấu hình Admin (nếu có), mặc định là KCN SHTP. */
export interface EffectiveServiceArea {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  /** §33: đa giác ranh giới (rỗng = dùng hình tròn tâm + bán kính). */
  polygons: PolygonCoords[];
}

export function normalizeServiceArea(area?: ServiceAreaDto | null): ServiceAreaDto {
  const raw = area as (ServiceAreaDto & Record<string, any>) | null | undefined;
  const rawLat = raw?.centerLat ?? raw?.CenterLat;
  const rawLng = raw?.centerLng ?? raw?.CenterLng;
  const rawRad = raw?.radiusKm ?? raw?.RadiusKm;
  return {
    enabled: raw?.enabled ?? raw?.Enabled ?? true,
    rejectOutside: raw?.rejectOutside ?? raw?.RejectOutside ?? true,
    name: raw?.name ?? raw?.Name ?? DEFAULT_SERVICE_AREA.name,
    centerLat: typeof rawLat === 'number' && rawLat !== 0 ? rawLat : DEFAULT_SERVICE_AREA.centerLat,
    centerLng: typeof rawLng === 'number' && rawLng !== 0 ? rawLng : DEFAULT_SERVICE_AREA.centerLng,
    radiusKm: typeof rawRad === 'number' && rawRad > 0 ? rawRad : DEFAULT_SERVICE_AREA.radiusKm,
    boundaryGeoJson: raw?.boundaryGeoJson ?? raw?.BoundaryGeoJson ?? null,
  };
}

const SERVICE_AREA_CACHE_KEY = 'resq_cached_service_area';

export function getCachedServiceArea(): ServiceAreaDto | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SERVICE_AREA_CACHE_KEY) : null;
    return raw ? normalizeServiceArea(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function cacheServiceArea(area?: ServiceAreaDto | null): void {
  if (!area || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SERVICE_AREA_CACHE_KEY, JSON.stringify(normalizeServiceArea(area)));
  } catch {
    // ignore storage errors
  }
}

export function resolveServiceArea(area?: ServiceAreaDto | null): EffectiveServiceArea {
  const radius = typeof area?.radiusKm === 'number' && area.radiusKm > 0 ? area.radiusKm : DEFAULT_SERVICE_AREA.radiusKm;
  return {
    name: area?.name || DEFAULT_SERVICE_AREA.name!,
    lat: area?.centerLat ? area.centerLat : DEFAULT_SERVICE_AREA.centerLat,
    lng: area?.centerLng ? area.centerLng : DEFAULT_SERVICE_AREA.centerLng,
    radiusKm: radius,
    polygons: parseBoundary(area?.boundaryGeoJson),
  };
}

export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Khoảng cách (km) từ điểm tới cạnh gần nhất của các đa giác. Chiếu phẳng quanh điểm (equirectangular) — đủ chính xác
 * cho khu vực vài chục km; backend tính lại bằng PostGIS.
 */
function distanceToBoundaryKm(point: { lat: number; lng: number }, polygons: PolygonCoords[]): number {
  const kx = 111.32 * Math.cos((point.lat * Math.PI) / 180);
  const ky = 110.574;
  let best = Infinity;
  for (const ring of polygons.flat()) {
    for (let i = 1; i < ring.length; i++) {
      const [ax, ay] = [(ring[i - 1][0] - point.lng) * kx, (ring[i - 1][1] - point.lat) * ky];
      const [bx, by] = [(ring[i][0] - point.lng) * kx, (ring[i][1] - point.lat) * ky];
      const [dx, dy] = [bx - ax, by - ay];
      const lenSq = dx * dx + dy * dy;
      const t = lenSq > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq)) : 0;
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return best;
}

/** Số km nằm ngoài vùng (làm tròn 0.1); 0 = trong vùng. Có đa giác (§33) thì xét theo đa giác. */
export function distanceOutsideAreaKm(point: { lat: number; lng: number }, area: EffectiveServiceArea): number {
  const outside =
    area.polygons.length > 0
      ? pointInBoundary(point.lat, point.lng, area.polygons)
        ? 0
        : distanceToBoundaryKm(point, area.polygons)
      : haversineDistanceKm(point.lat, point.lng, area.lat, area.lng) - area.radiusKm;
  return outside > 0 ? Math.max(0.1, Math.round(outside * 10) / 10) : 0;
}
