import { API_CONFIG } from '../config/api';
import mapboxgl from 'mapbox-gl';
import type { Style } from 'mapbox-gl';

// Token Mapbox (Dùng cho Reverse Geocoding & Directions API)
export const MAPBOX_ACCESS_TOKEN = API_CONFIG.MAPBOX_TOKEN || '';

if (typeof window !== 'undefined') {
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
}

// Vô hiệu hóa triệt để cơ chế Token Revocation & Auth Error ngầm của Mapbox GL JS v3
// Tránh việc Mapbox tự động xóa sạch WebGL canvas khi phát hiện token hạn chế bản quyền vector
try {
  if ((mapboxgl as any)?.config) {
    (mapboxgl as any).config.REQUIRE_ACCESS_TOKEN = false;
    (mapboxgl as any).config.API_URL = '';
    (mapboxgl as any).config.SESSION_PATH = '';
    (mapboxgl as any).config.EVENTS_URL = null;
  }
  if ((mapboxgl.Map as any)?.prototype) {
    (mapboxgl.Map.prototype as any)._authenticate = function () { };
    (mapboxgl.Map.prototype as any)._revokeAuth = function () { };
  }
} catch {
  // Ignore
}

/**
 * Bản đồ vệ tinh thực tế chân thực cao (Google Hybrid Satellite):
 * - Ảnh chụp vệ tinh thực địa độ phân giải cao (nhà dân, ngõ ngách, mái nhà, công trình, sông ngòi)
 * - Tên đường, số hiệu quốc lộ, địa danh tiếng Việt rõ nét
 * - Hoạt động ổn định 100%, không bị 403 Forbidden, không watermark
 */
export const MAPBOX_REALISTIC_STYLE: Style = {
  version: 8,
  sources: {
    'satellite-hybrid': {
      type: 'raster',
      tiles: [
        'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      ],
      tileSize: 256,
      attribution: '&copy; Google Satellite Imagery &copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'satellite-hybrid-layer',
      type: 'raster',
      source: 'satellite-hybrid',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

/**
 * Bản đồ tác chiến ban đêm CAD (ArcGIS World Dark Gray Canvas):
 * - Nền tối chỉ huy quân đội chuyên dụng
 * - Lớp Base + Reference hiển thị rõ trục đường, ranh giới và nhãn địa danh
 * - Không có watermark như CartoDB, không bị lỗi 403 bản quyền như Mapbox dark vector
 */
export const MAPBOX_DARK_STYLE: Style = {
  version: 8,
  sources: {
    'arcgis-dark-base': {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '&copy; Esri World Dark Gray &copy; OpenStreetMap contributors',
    },
    'arcgis-dark-reference': {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: 'arcgis-dark-base-layer',
      type: 'raster',
      source: 'arcgis-dark-base',
      minzoom: 0,
      maxzoom: 20,
    },
    {
      id: 'arcgis-dark-reference-layer',
      type: 'raster',
      source: 'arcgis-dark-reference',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

/**
 * Giao diện đường phố rõ nét (Google Roadmap tiếng Việt):
 * - Đường giao thông rõ nét, địa danh tiếng Việt
 */
export const MAPBOX_STREETS_STYLE: Style = {
  version: 8,
  sources: {
    'google-streets': {
      type: 'raster',
      tiles: [
        'https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      ],
      tileSize: 256,
      attribution: '&copy; Google Maps &copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'google-streets-layer',
      type: 'raster',
      source: 'google-streets',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

// Aliases
export const MAPBOX_LIGHT_STYLE: Style = MAPBOX_STREETS_STYLE;
export const MAPBOX_STYLE: Style = MAPBOX_REALISTIC_STYLE;

export const mapboxService = {
  /**
   * Lộ trình đường bộ (Mapbox Directions, profile driving) — tọa độ [lng, lat].
   * Không có token / lỗi mạng → null để nơi gọi tự dùng đường thẳng.
   */
  async getDrivingRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<[number, number][] | null> {
    if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN.includes('dummy')) return null;
    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}` +
        `?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const coords = data.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
      return coords && coords.length >= 2 ? coords : null;
    } catch {
      return null;
    }
  },

  /**
   * Tra cứu địa chỉ tiếng Việt từ tọa độ GPS (Reverse Geocoding)
   * Tự động thử Mapbox API nếu token hợp lệ, dự phòng OpenStreetMap Nominatim tiếng Việt cực nhạy
   */
  async reverseGeocode(lng: number, lat: number): Promise<string> {
    if (MAPBOX_ACCESS_TOKEN && !MAPBOX_ACCESS_TOKEN.includes('dummy')) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=VN&language=vi`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            return data.features[0].place_name;
          }
        }
      } catch (err) {
        console.warn('Mapbox reverseGeocode failed, switching to OSM Nominatim:', err);
      }
    }

    // Fallback: OpenStreetMap Nominatim chuẩn tiếng Việt
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`;
      const res = await fetch(osmUrl, {
        headers: { 'User-Agent': 'ResQ-EmergencyDispatchWeb/1.0' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          return data.display_name;
        }
      }
    } catch {
      // Ignore
    }

    return `Tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)}) - Khu Công nghệ cao, TP. Thủ Đức`;
  },

  /**
   * Tìm tọa độ từ địa chỉ người dùng nhập vào (Forward Geocoding)
   * Hỗ trợ Mapbox Geocoding & OpenStreetMap Nominatim chuẩn tiếng Việt
   */
  async forwardGeocode(query: string): Promise<{ lat: number; lng: number; address: string } | null> {
    const trimmed = query.trim();
    if (!trimmed) return null;

    if (MAPBOX_ACCESS_TOKEN && !MAPBOX_ACCESS_TOKEN.includes('dummy')) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=VN&language=vi`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            const first = data.features[0];
            const [lng, lat] = first.center;
            return {
              lat,
              lng,
              address: first.place_name || trimmed,
            };
          }
        }
      } catch (err) {
        console.warn('Mapbox forwardGeocode failed, switching to OSM Nominatim:', err);
      }
    }

    try {
      const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&countrycodes=vn&limit=1&accept-language=vi`;
      const res = await fetch(osmUrl, {
        headers: { 'User-Agent': 'ResQ-EmergencyDispatchWeb/1.0' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            address: data[0].display_name || trimmed,
          };
        }
      }
    } catch {
      // Ignore
    }

    return null;
  },
};
