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

// ---------------------------------------------------------------------------
// Nhập GeoJSON (Admin dán / tải file) + rút gọn đỉnh
// ---------------------------------------------------------------------------

/**
 * Đọc GeoJSON Admin nhập: Polygon, MultiPolygon, Feature, FeatureCollection, GeometryCollection — lấy mọi đa giác hợp lệ
 * (VD file xuất từ OpenStreetMap / geojson.io). JSON hỏng → ném lỗi (SyntaxError) để form báo.
 */
export function parseGeoJsonInput(text: string): PolygonCoords[] {
  const collect = (node: unknown): PolygonCoords[] => {
    if (!node || typeof node !== 'object') return [];
    const { type, coordinates, geometry, features, geometries } = node as {
      type?: string;
      coordinates?: unknown;
      geometry?: unknown;
      features?: unknown;
      geometries?: unknown;
    };
    if (type === 'Polygon') return isPolygon(coordinates) ? [coordinates] : [];
    if (type === 'MultiPolygon' && Array.isArray(coordinates)) return coordinates.filter(isPolygon);
    if (type === 'Feature') return collect(geometry);
    if (type === 'FeatureCollection' && Array.isArray(features)) return features.flatMap(collect);
    if (type === 'GeometryCollection' && Array.isArray(geometries)) return geometries.flatMap(collect);
    return [];
  };
  // Bỏ chiều cao (z) nếu có; chỉ giữ đa giác có vòng ngoài ≥ 3 đỉnh.
  const polygons = collect(JSON.parse(text)).map((p) => p.map((ring) => ring.map(([lng, lat]) => [lng, lat] as LngLat)));
  return polygons.filter((p) => isValidBoundary([p]));
}

/** Douglas–Peucker trên mặt phẳng chiếu (mét) quanh vĩ độ của vòng. */
function simplifyRing(ring: Ring, toleranceM: number): Ring {
  if (ring.length <= 4) return ring;
  const lat0 = ring.reduce((s, [, lat]) => s + lat, 0) / ring.length;
  const kx = 111_320 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110_574;
  const pts = ring.map(([lng, lat]) => [lng * kx, lat * ky]);
  const keep = new Array<boolean>(ring.length).fill(false);
  keep[0] = keep[ring.length - 1] = true;
  const distToSegment = (p: number[], a: number[], b: number[]) => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const lenSq = dx * dx + dy * dy;
    const t = lenSq > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq)) : 0;
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  };
  // Vòng khép (đầu = cuối) → chia đôi tại điểm xa điểm đầu nhất để DP không suy biến.
  let far = 1;
  for (let i = 1; i < ring.length - 1; i++) if (distToSegment(pts[i], pts[0], pts[0]) > distToSegment(pts[far], pts[0], pts[0])) far = i;
  keep[far] = true;
  const stack: Array<[number, number]> = [[0, far], [far, ring.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = distToSegment(pts[i], pts[start], pts[end]);
      if (d > maxDist) [maxDist, index] = [d, i];
    }
    if (index !== -1 && maxDist > toleranceM) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  const result = ring.filter((_, i) => keep[i]);
  return result.length >= 4 ? result : ring;
}

/** Hai đoạn thẳng cắt nhau thực sự (không tính chạm ở đầu mút). */
function segmentsCross(a: LngLat, b: LngLat, c: LngLat, d: LngLat): boolean {
  const cross = (o: LngLat, p: LngLat, q: LngLat) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Vòng tự cắt (hai cạnh không kề nhau cắt nhau) hoặc lặp đỉnh → PostGIS ST_IsValid = false, backend từ chối. */
function ringSelfIntersects(ring: Ring): boolean {
  const closed = closeRing(ring);
  const n = closed.length - 1;
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const key = `${closed[i][0]},${closed[i][1]}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // cạnh đầu và cạnh cuối kề nhau qua điểm khép vòng
      if (segmentsCross(closed[i], closed[i + 1], closed[j], closed[j + 1])) return true;
    }
  }
  return false;
}

/** Có vòng nào tự cắt không (kiểm tra trước khi gửi backend để báo lỗi rõ ràng). */
export const boundarySelfIntersects = (polygons: PolygonCoords[]) => polygons.some((p) => p.some(ringSelfIntersects));

/**
 * Rút gọn đa giác nhập vào (VD 374 đỉnh từ OpenStreetMap) còn ≤ `maxVertices` đỉnh để vẽ / kéo đỉnh không nặng:
 * tăng dần sai số cho phép (từ 2 m) tới khi đủ ít đỉnh. Vòng nào rút gọn xong bị tự cắt thì giữ bản trước đó
 * (chấp nhận dư đỉnh) để đa giác vẫn hợp lệ với PostGIS.
 */
export function simplifyBoundary(polygons: PolygonCoords[], maxVertices = 80): PolygonCoords[] {
  let result = polygons;
  for (let tolerance = 2; boundaryVertexCount(result) > maxVertices && tolerance < 2000; tolerance *= 1.2) {
    result = result.map((polygon, pi) =>
      polygon
        .map((ring, ri) => {
          const candidate = simplifyRing(polygons[pi][ri] ?? ring, tolerance);
          // Bản rút gọn tự cắt → giữ vòng hiện tại (đã hợp lệ ở bước trước).
          return candidate.length >= 4 && !ringSelfIntersects(candidate) ? candidate : ring;
        })
    );
  }
  return result.filter((p) => isValidBoundary([p]));
}
