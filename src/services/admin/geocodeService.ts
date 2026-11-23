import { MAPBOX_ACCESS_TOKEN } from '../mapboxService';
import { MAP_CENTER } from '../../data/liveMapMeta';

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
}

const LIMIT = 5;

async function searchMapbox(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  // proximity: ưu tiên kết quả gần Khu Công nghệ cao.
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${MAPBOX_ACCESS_TOKEN}&country=VN&language=vi&limit=${LIMIT}&proximity=${MAP_CENTER[1]},${MAP_CENTER[0]}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Mapbox ${res.status}`);
  const data = (await res.json()) as { features?: { place_name: string; center: [number, number] }[] };
  return (data.features ?? []).map((f) => ({ label: f.place_name, lng: f.center[0], lat: f.center[1] }));
}

export async function searchNominatim(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
    `&format=json&countrycodes=vn&accept-language=vi&limit=${LIMIT}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
}

export interface GeocodeSearchOptions {
  /**
   * Chỉ cho phép gọi OpenStreetMap Nominatim khi người dùng bấm nút tìm (explicit submit).
   * Mặc định là false: khi đang gõ phím / gợi ý autocomplete TUYỆT ĐỐI KHÔNG dùng Nominatim
   * để tuân thủ chính sách sử dụng (Usage Policy) của OpenStreetMap.
   */
  allowNominatim?: boolean;
  /**
   * Cờ tương thích ngược: nếu false thì không fallback sang Nominatim khi Mapbox lỗi / rỗng.
   */
  fallbackToNominatim?: boolean;
}

/**
 * Tìm tọa độ theo địa chỉ (forward geocoding):
 * - Khi đang gõ (mặc định options?.allowNominatim = false): CHỈ DÙNG Mapbox, TUYỆT ĐỐI KHÔNG gọi Nominatim.
 * - Khi người dân bấm nút tìm (options?.allowNominatim = true): thử Mapbox trước, nếu rỗng / lỗi mới gọi Nominatim một lần duy nhất.
 */
export async function searchAddress(
  query: string,
  signal?: AbortSignal,
  options?: GeocodeSearchOptions
): Promise<AddressSuggestion[]> {
  const isMapboxDisabled =
    typeof window !== 'undefined' && sessionStorage.getItem('resq_mapbox_geocode_disabled') === 'true';

  const shouldFallback = options?.allowNominatim ?? options?.fallbackToNominatim ?? false;
  const explicitNoFallback = options?.fallbackToNominatim === false;

  if (MAPBOX_ACCESS_TOKEN && !MAPBOX_ACCESS_TOKEN.includes('dummy') && !isMapboxDisabled) {
    try {
      const results = await searchMapbox(query, signal);
      if (results.length > 0 || !shouldFallback) return results;
    } catch (err: any) {
      if (signal?.aborted) throw err;
      if (err?.message?.includes('401') || err?.message?.includes('403')) {
        try { sessionStorage.setItem('resq_mapbox_geocode_disabled', 'true'); } catch {}
      }
      if (explicitNoFallback) throw err;
      if (!shouldFallback) return [];
    }
  }

  if (shouldFallback) {
    return searchNominatim(query, signal);
  }

  if (explicitNoFallback) {
    throw new Error('Mapbox geocoding unavailable');
  }

  return [];
}

/**
 * Tìm kiếm khi người dùng bấm nút tìm (explicit submit).
 * Cho phép fallback sang Nominatim 1 lần duy nhất nếu Mapbox không tìm thấy.
 */
export async function searchAddressExplicit(
  query: string,
  signal?: AbortSignal
): Promise<AddressSuggestion[]> {
  return searchAddress(query, signal, { allowNominatim: true });
}

/** Tìm toàn quốc trên OpenStreetMap — chỉ gọi khi người dùng chủ động bấm, mỗi lần bấm một yêu cầu (§43). */
export const searchOpenStreetMap = searchNominatim;

/** Vùng tìm kiếm: tâm + bán kính (khu vực phục vụ). */
export interface SearchArea {
  lat: number;
  lng: number;
  radiusKm: number;
}

/** Khung chữ nhật bao quanh vùng tròn: [minLng, minLat, maxLng, maxLat]. */
function areaBbox({ lat, lng, radiusKm }: SearchArea): [number, number, number, number] {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

// Search Box API có địa điểm (trường, công ty, nhà máy…) — Geocoding v5 ở VN chỉ có tên đường.
async function searchMapboxPlaces(query: string, area: SearchArea, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const bbox = areaBbox(area).join(',');
  const url =
    `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(query)}` +
    `&access_token=${MAPBOX_ACCESS_TOKEN}&country=vn&language=vi&limit=${LIMIT}` +
    `&bbox=${bbox}&proximity=${area.lng},${area.lat}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Mapbox Search Box ${res.status}`);
  const data = (await res.json()) as {
    features?: {
      geometry: { coordinates: [number, number] };
      properties: { name?: string; full_address?: string; place_formatted?: string; feature_type?: string };
    }[];
  };
  return (data.features ?? []).map(({ geometry, properties: p }) => {
    const address = p.full_address ?? p.place_formatted ?? '';
    // Địa điểm: "Tên, địa chỉ"; địa chỉ / đường thì tên đã nằm trong địa chỉ.
    const label = p.feature_type === 'poi' && p.name ? [p.name, address].filter(Boolean).join(', ') : address || p.name || '';
    return { label, lng: geometry.coordinates[0], lat: geometry.coordinates[1] };
  });
}

// Nominatim: viewbox + bounded=1 để chỉ lấy trong vùng chữ nhật bao quanh.
async function searchNominatimInArea(query: string, area: SearchArea, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const [minLng, minLat, maxLng, maxLat] = areaBbox(area);
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
    `&format=json&countrycodes=vn&accept-language=vi&limit=${LIMIT}` +
    `&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=1`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
}

function normalizeLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Haversine: kiểm tra điểm có nằm trong hình tròn (bán kính radiusKm) không.
function insideArea(s: AddressSuggestion, area: SearchArea): boolean {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(s.lat - area.lat);
  const dLng = toRad(s.lng - area.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(area.lat)) * Math.cos(toRad(s.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= area.radiusKm;
}

/** Bỏ kết quả ngoài vùng và trùng tên. */
function keepInsideArea(items: AddressSuggestion[], area: SearchArea): AddressSuggestion[] {
  const seen = new Set<string>();
  return items.filter((s) => {
    const key = normalizeLabel(s.label);
    if (!s.label || seen.has(key) || !insideArea(s, area)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Tìm địa chỉ / địa điểm **chỉ trong vùng** (Operator tạo sự cố):
 * - Khi đang gõ (mặc định options?.allowNominatim = false): CHỈ DÙNG Mapbox Search Box API, KHÔNG gọi Nominatim (tuân thủ chính sách OSM).
 * - Khi bấm nút tìm (options?.allowNominatim = true): nếu Mapbox không có kết quả mới gọi Nominatim trong vùng.
 */
export async function searchAddressInArea(
  query: string,
  area: SearchArea,
  signal?: AbortSignal,
  options?: GeocodeSearchOptions
): Promise<AddressSuggestion[]> {
  const shouldFallback = options?.allowNominatim ?? options?.fallbackToNominatim ?? false;
  const isMapboxAvailable = Boolean(MAPBOX_ACCESS_TOKEN && !MAPBOX_ACCESS_TOKEN.includes('dummy'));

  if (isMapboxAvailable) {
    try {
      const places = await searchMapboxPlaces(query, area, signal);
      const filtered = keepInsideArea(places, area);
      if (filtered.length > 0 || !shouldFallback) {
        return filtered.slice(0, LIMIT + 2);
      }
    } catch (err: any) {
      if (signal?.aborted) throw err;
      if (!shouldFallback) {
        // Khi đang gõ, Mapbox lỗi thì không gọi Nominatim (tránh vi phạm chính sách OSM)
        return [];
      }
    }
  }

  // Chỉ gọi Nominatim khi người dùng chủ động bấm tìm hoặc cho phép fallback
  if (shouldFallback) {
    try {
      const osmResults = await searchNominatimInArea(query, area, signal);
      return keepInsideArea(osmResults, area).slice(0, LIMIT + 2);
    } catch (err: any) {
      if (signal?.aborted) throw err;
      throw err;
    }
  }

  return [];
}

/** Tìm thêm trong vùng trên OpenStreetMap — chỉ gọi khi Operator chủ động bấm, mỗi lần bấm một yêu cầu (§43). */
export async function searchOpenStreetMapInArea(
  query: string,
  area: SearchArea,
  signal?: AbortSignal
): Promise<AddressSuggestion[]> {
  return keepInsideArea(await searchNominatimInArea(query, area, signal), area);
}

/** Nối kết quả tìm thêm vào sau danh sách đang có, bỏ địa điểm trùng tên. */
export function mergeSuggestions(current: AddressSuggestion[], extra: AddressSuggestion[]): AddressSuggestion[] {
  const seen = new Set(current.map((s) => normalizeLabel(s.label)));
  return [...current, ...extra.filter((s) => !seen.has(normalizeLabel(s.label)))];
}
