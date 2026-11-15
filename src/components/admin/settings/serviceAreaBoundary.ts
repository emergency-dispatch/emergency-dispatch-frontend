// Ranh giới khu vực phục vụ dạng đa giác (FE_MOBILE_HANDOFF §33): backend nhận chuỗi GeoJSON Polygon / MultiPolygon,
// tọa độ [kinh độ, vĩ độ]. Các hàm ở đây chỉ làm việc trên mảng tọa độ thuần để dùng chung cho form + bản đồ vẽ.

import { SERVICE_AREA_RADIUS_KM } from '../../../services/admin/adminSettingsService';

export type LngLat = [number, number];
/** Vòng khép kín (điểm đầu = điểm cuối). */
export type Ring = LngLat[];
/** Một đa giác: vòng ngoài + các lỗ (nếu có). */
export type PolygonCoords = Ring[];

const isPosition = (p: unknown): p is LngLat =>
  Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number';
const isRing = (r: unknown): r is Ring => Array.isArray(r) && r.every(isPosition);
const isPolygon = (p: unknown): p is PolygonCoords => Array.isArray(p) && p.length > 0 && p.every(isRing);

/** Chuỗi GeoJSON từ backend → danh sách đa giác; rỗng / sai định dạng → []. */
export function parseBoundary(json: string | null | undefined): PolygonCoords[] {
  if (!json?.trim()) return [];
  try {
    const geo: unknown = JSON.parse(json);
    if (!geo || typeof geo !== 'object') return [];
    const { type, coordinates } = geo as { type?: string; coordinates?: unknown };
    if (type === 'Polygon' && isPolygon(coordinates)) return [coordinates];
    if (type === 'MultiPolygon' && Array.isArray(coordinates) && coordinates.every(isPolygon)) {
      return coordinates as PolygonCoords[];
    }
  } catch {
    // Chuỗi hỏng: coi như chưa có đa giác.
  }
  return [];
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

const closeRing = (ring: Ring): Ring => {
  const r = ring.map(([lng, lat]) => [round6(lng), round6(lat)] as LngLat);
  const [first, last] = [r[0], r[r.length - 1]];
  return first && last && (first[0] !== last[0] || first[1] !== last[1]) ? [...r, first] : r;
};

/** Danh sách đa giác → chuỗi GeoJSON gửi backend (1 vùng = Polygon, nhiều vùng = MultiPolygon, rỗng = null). */
export function boundaryToGeoJson(polygons: PolygonCoords[]): string | null {
  const closed = polygons.map((p) => p.map(closeRing));
  if (closed.length === 0) return null;
  return JSON.stringify(
    closed.length === 1 ? { type: 'Polygon', coordinates: closed[0] } : { type: 'MultiPolygon', coordinates: closed }
  );
}

/** Mỗi vòng ngoài cần ít nhất 3 đỉnh khác nhau. */
export const isValidBoundary = (polygons: PolygonCoords[]) =>
  polygons.length > 0 && polygons.every((p) => new Set(closeRing(p[0] ?? []).map(([x, y]) => `${x},${y}`)).size >= 3);

/** Số đỉnh (không tính điểm khép vòng) của các vòng ngoài. */
export const boundaryVertexCount = (polygons: PolygonCoords[]) =>
  polygons.reduce((sum, p) => sum + Math.max(0, closeRing(p[0] ?? []).length - 1), 0);

/** Ray casting trên mặt phẳng kinh / vĩ độ — đủ chính xác cho khu vực vài chục km. */
function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Điểm nằm trong ít nhất một đa giác (trong vòng ngoài, ngoài các lỗ). */
export const pointInBoundary = (lat: number, lng: number, polygons: PolygonCoords[]) =>
  polygons.some(([outer, ...holes]) => !!outer && inRing(lng, lat, outer) && !holes.some((h) => inRing(lng, lat, h)));

/** [minLng, minLat, maxLng, maxLat]; không có đỉnh → null. */
export function boundaryBounds(polygons: PolygonCoords[]): [number, number, number, number] | null {
  const points = polygons.flatMap((p) => p[0] ?? []);
  if (points.length === 0) return null;
  return points.reduce<[number, number, number, number]>(
    ([a, b, c, d], [lng, lat]) => [Math.min(a, lng), Math.min(b, lat), Math.max(c, lng), Math.max(d, lat)],
    [Infinity, Infinity, -Infinity, -Infinity]
  );
}

export const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Tâm + bán kính bao quanh đa giác. Backend vẫn bắt buộc tâm / bán kính (dùng để hiển thị bản đồ, VD vòng khu vực
 * trên Live Map của Operator) → khi dùng đa giác, FE tự tính: tâm = giữa khung bao, bán kính = tới đỉnh xa nhất,
 * làm tròn lên bước 0.5 km và giữ trong giới hạn của backend.
 */
export function boundaryCircle(polygons: PolygonCoords[]): { centerLat: number; centerLng: number; radiusKm: number } | null {
  const bounds = boundaryBounds(polygons);
  if (!bounds) return null;
  const [minLng, minLat, maxLng, maxLat] = bounds;
  const centerLat = round6((minLat + maxLat) / 2);
  const centerLng = round6((minLng + maxLng) / 2);
  const farthest = polygons
    .flatMap((p) => p[0] ?? [])
    .reduce((max, [lng, lat]) => Math.max(max, haversineKm(centerLat, centerLng, lat, lng)), 0);
  const radiusKm = Math.min(
    SERVICE_AREA_RADIUS_KM.max,
    Math.max(SERVICE_AREA_RADIUS_KM.min, Math.ceil(farthest * 2) / 2)
  );
  return { centerLat, centerLng, radiusKm };
}
