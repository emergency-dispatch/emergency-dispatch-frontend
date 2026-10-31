import { MAPBOX_ACCESS_TOKEN } from '../mapboxService';
import { MAP_CENTER } from '../../data/liveMapMeta';

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
}

const LIMIT = 5;

async function searchMapbox(query: string, signal: AbortSignal): Promise<AddressSuggestion[]> {
  // proximity: ưu tiên kết quả gần Khu Công nghệ cao.
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${MAPBOX_ACCESS_TOKEN}&country=VN&language=vi&limit=${LIMIT}&proximity=${MAP_CENTER[1]},${MAP_CENTER[0]}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Mapbox ${res.status}`);
  const data = (await res.json()) as { features?: { place_name: string; center: [number, number] }[] };
  return (data.features ?? []).map((f) => ({ label: f.place_name, lng: f.center[0], lat: f.center[1] }));
}

async function searchNominatim(query: string, signal: AbortSignal): Promise<AddressSuggestion[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
    `&format=json&countrycodes=vn&accept-language=vi&limit=${LIMIT}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
}

/** Tìm tọa độ theo địa chỉ (forward geocoding): thử Mapbox, lỗi / không có kết quả thì dùng OpenStreetMap. */
export async function searchAddress(query: string, signal: AbortSignal): Promise<AddressSuggestion[]> {
  if (MAPBOX_ACCESS_TOKEN && !MAPBOX_ACCESS_TOKEN.includes('dummy')) {
    try {
      const results = await searchMapbox(query, signal);
      if (results.length > 0) return results;
    } catch (err) {
      if (signal.aborted) throw err;
    }
  }
  return searchNominatim(query, signal);
}

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
async function searchMapboxPlaces(query: string, area: SearchArea, signal: AbortSignal): Promise<AddressSuggestion[]> {
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

async function searchNominatimInArea(query: string, area: SearchArea, signal: AbortSignal): Promise<AddressSuggestion[]> {
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

const normalizeLabel = (label: string) => label.split(',')[0].trim().toLowerCase();

// Khung chữ nhật rộng hơn vòng tròn ở 4 góc → lọc lại theo khoảng cách thật tới tâm.
function insideArea(s: AddressSuggestion, area: SearchArea): boolean {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(s.lat - area.lat);
  const dLng = toRad(s.lng - area.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(area.lat)) * Math.cos(toRad(s.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= area.radiusKm;
}

/**
 * Tìm địa chỉ / địa điểm **chỉ trong vùng** (Operator tạo sự cố): gọi song song Mapbox Search Box và OpenStreetMap,
 * gộp kết quả (Mapbox trước), bỏ trùng theo tên. Một nguồn lỗi vẫn dùng nguồn còn lại; cả hai lỗi mới báo lỗi.
 */
export async function searchAddressInArea(query: string, area: SearchArea, signal: AbortSignal): Promise<AddressSuggestion[]> {
  const sources = [searchNominatimInArea(query, area, signal)];
  if (MAPBOX_ACCESS_TOKEN && !MAPBOX_ACCESS_TOKEN.includes('dummy')) sources.unshift(searchMapboxPlaces(query, area, signal));
  const settled = await Promise.allSettled(sources);
  if (settled.every((r) => r.status === 'rejected')) throw (settled[0] as PromiseRejectedResult).reason;

  const seen = new Set<string>();
  return settled
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((s) => {
      const key = normalizeLabel(s.label);
      if (!s.label || seen.has(key) || !insideArea(s, area)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, LIMIT + 2);
}
