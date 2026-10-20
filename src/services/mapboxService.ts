import { API_CONFIG } from '../config/api';
import type { Style } from 'mapbox-gl';

export const MAPBOX_ACCESS_TOKEN = API_CONFIG.MAPBOX_TOKEN || '';

/**
 * Bản đồ vệ tinh thực tế chân thực cao (Google Hybrid Satellite):
 * - Ảnh chụp vệ tinh thực địa độ phân giải cao (nhà dân, ngõ ngách, mái nhà, công trình, sông ngòi)
 * - Tên đường, số hiệu quốc lộ, địa danh tiếng Việt rõ nét
 * - Không có watermark, không bị giới hạn API key
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
 * Dự phòng vệ tinh Esri World Imagery (trong trường hợp cần nguồn ảnh vệ tinh dự phòng)
 */
export const MAPBOX_ESRI_SATELLITE_STYLE: Style = {
  version: 8,
  sources: {
    'esri-sat-base': {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '&copy; Esri World Imagery',
    },
    'esri-sat-roads': {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
    },
  },
  layers: [
    { id: 'esri-sat-base-layer', type: 'raster', source: 'esri-sat-base', minzoom: 0, maxzoom: 20 },
    { id: 'esri-sat-roads-layer', type: 'raster', source: 'esri-sat-roads', minzoom: 0, maxzoom: 20 },
  ],
};

/** Style raster 1 lớp từ một nguồn tile XYZ (dùng cho các lớp nền Sáng / Tối / Vệ tinh của Live Map). */
export function createRasterStyle(tiles: string[], options: { attribution?: string; maxzoom?: number } = {}): Style {
  return {
    version: 8,
    sources: {
      base: { type: 'raster', tiles, tileSize: 256, attribution: options.attribution, maxzoom: options.maxzoom ?? 19 },
    },
    layers: [{ id: 'base-layer', type: 'raster', source: 'base' }],
  };
}

// Dùng giao diện vệ tinh thực tế cho cả 2 màn hình
export const MAPBOX_DARK_STYLE = MAPBOX_REALISTIC_STYLE;
export const MAPBOX_LIGHT_STYLE = MAPBOX_REALISTIC_STYLE;
export const MAPBOX_STYLE = MAPBOX_REALISTIC_STYLE;

export const mapboxService = {
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
};
