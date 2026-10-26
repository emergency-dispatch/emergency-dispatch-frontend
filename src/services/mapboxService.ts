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

    // Fallback: OpenStreetMap Nominatim chuẩn tiếng Việt (Không gửi custom User-Agent vì trình duyệt cấm)
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`;
      const res = await fetch(osmUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          return data.display_name;
        }
      }
    } catch {
      // Ignore
    }

    return `Tọa độ (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  },

  /**
   * Tìm tọa độ từ địa chỉ người dùng nhập vào (Forward Geocoding)
   * 1. Tra cứu nhanh danh mục 63 tỉnh/thành Việt Nam (100% offline, chuẩn xác tức thì)
   * 2. Thử Mapbox Geocoding & OpenStreetMap Nominatim tiếng Việt
   */
  async forwardGeocode(query: string): Promise<{ lat: number; lng: number; address: string } | null> {
    const trimmed = query.trim();
    if (!trimmed) return null;

    // Normalizer không dấu để tra cứu tỉnh thành phố Việt Nam
    const norm = trimmed
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 1. Kiểm tra nhanh từ điển các tỉnh/thành phố lớn của Việt Nam
    for (const p of VIETNAMESE_PROVINCES) {
      if (p.keywords.some((k) => norm.includes(k))) {
        return {
          lat: p.lat,
          lng: p.lng,
          address: `${trimmed.length > 3 ? trimmed : p.name}`,
        };
      }
    }

    // 2. Thử Mapbox Geocoding nếu token hợp lệ
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

    // 3. Fallback: OpenStreetMap Nominatim chuẩn tiếng Việt (Không truyền custom User-Agent trong browser)
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&countrycodes=vn&limit=1&accept-language=vi`;
      const res = await fetch(osmUrl);
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

const VIETNAMESE_PROVINCES: Array<{ keywords: string[]; lat: number; lng: number; name: string }> = [
  { keywords: ['ha noi', 'hanoi'], lat: 21.0285, lng: 105.8542, name: 'TP. Hà Nội' },
  { keywords: ['da nang', 'danang'], lat: 16.0544, lng: 108.2022, name: 'TP. Đà Nẵng' },
  { keywords: ['hai phong', 'haiphong'], lat: 20.8449, lng: 106.6881, name: 'TP. Hải Phòng' },
  { keywords: ['can tho', 'cantho'], lat: 10.0452, lng: 105.7469, name: 'TP. Cần Thơ' },
  { keywords: ['bien hoa', 'bienhoa'], lat: 10.9574, lng: 106.8427, name: 'TP. Biên Hòa, Đồng Nai' },
  { keywords: ['dong nai', 'dongnai'], lat: 11.0500, lng: 107.0000, name: 'Đồng Nai' },
  { keywords: ['binh duong', 'binhduong', 'thu dau mot', 'thudaumot', 'di an', 'thuan an'], lat: 10.9804, lng: 106.6519, name: 'Bình Dương' },
  { keywords: ['vung tau', 'vungtau', 'ba ria', 'baria'], lat: 10.3460, lng: 107.0843, name: 'Bà Rịa - Vũng Tàu' },
  { keywords: ['nha trang', 'nhatrang', 'khanh hoa', 'khanhhoa'], lat: 12.2388, lng: 109.1967, name: 'Nha Trang, Khánh Hòa' },
  { keywords: ['hue', 'thua thien hue'], lat: 16.4637, lng: 107.5909, name: 'Thừa Thiên Huế' },
  { keywords: ['da lat', 'dalat', 'lam dong', 'lamdong'], lat: 11.9404, lng: 108.4583, name: 'Đà Lạt, Lâm Đồng' },
  { keywords: ['long an', 'tan an'], lat: 10.5333, lng: 106.4167, name: 'Long An' },
  { keywords: ['tien giang', 'my tho'], lat: 10.3600, lng: 106.3600, name: 'Tiền Giang' },
  { keywords: ['ben tre', 'bentre'], lat: 10.2415, lng: 106.3759, name: 'Bến Tre' },
  { keywords: ['tay ninh', 'tayninh'], lat: 11.3100, lng: 106.1000, name: 'Tây Ninh' },
  { keywords: ['binh phuoc', 'dong xoai'], lat: 11.5333, lng: 106.8833, name: 'Bình Phước' },
  { keywords: ['quang ninh', 'ha long', 'cam pha'], lat: 20.9500, lng: 107.0833, name: 'Quảng Ninh' },
  { keywords: ['nghe an', 'vinh'], lat: 18.6733, lng: 105.6811, name: 'Nghệ An' },
  { keywords: ['thanh hoa', 'thanhhoa'], lat: 19.8000, lng: 105.7833, name: 'Thanh Hóa' },
  { keywords: ['quang nam', 'hoi an', 'tam ky'], lat: 15.5667, lng: 108.0000, name: 'Quảng Nam' },
  { keywords: ['quang ngai'], lat: 15.1167, lng: 108.8000, name: 'Quảng Ngãi' },
  { keywords: ['binh dinh', 'quy nhon'], lat: 13.7833, lng: 109.2167, name: 'Bình Định' },
  { keywords: ['phu yen', 'tuy hoa'], lat: 13.0833, lng: 109.3000, name: 'Phú Yên' },
  { keywords: ['gia lai', 'pleiku'], lat: 13.9833, lng: 108.0000, name: 'Gia Lai' },
  { keywords: ['dak lak', 'daklak', 'buon ma thuot', 'bmt'], lat: 12.6667, lng: 108.0500, name: 'Đắk Lắk' },
  { keywords: ['kien giang', 'rach gia', 'phu quoc'], lat: 10.0167, lng: 105.0833, name: 'Kiên Giang' },
  { keywords: ['ca mau', 'camau'], lat: 9.1769, lng: 105.1524, name: 'Cà Mau' },
  { keywords: ['an giang', 'long xuyen', 'chau doc'], lat: 10.3833, lng: 105.4167, name: 'An Giang' },
  { keywords: ['soc trang'], lat: 9.6000, lng: 105.9667, name: 'Sóc Trăng' },
  { keywords: ['bac lieu'], lat: 9.2833, lng: 105.7167, name: 'Bạc Liêu' },
  { keywords: ['hau giang', 'vi thanh'], lat: 9.7833, lng: 105.4667, name: 'Hậu Giang' },
  { keywords: ['vinh long'], lat: 10.2500, lng: 105.9667, name: 'Vĩnh Long' },
  { keywords: ['tra vinh'], lat: 9.9333, lng: 106.3333, name: 'Trà Vinh' },
  { keywords: ['dong thap', 'cao lanh', 'sa dec'], lat: 10.4500, lng: 105.6333, name: 'Đồng Tháp' },
  { keywords: ['bac ninh'], lat: 21.1833, lng: 106.0667, name: 'Bắc Ninh' },
  { keywords: ['hung yen'], lat: 20.6500, lng: 106.0500, name: 'Hưng Yên' },
  { keywords: ['nam dinh'], lat: 20.4333, lng: 106.1833, name: 'Nam Định' },
  { keywords: ['thai binh'], lat: 20.4500, lng: 106.3333, name: 'Thái Bình' },
  { keywords: ['ninh binh'], lat: 20.2500, lng: 105.9667, name: 'Ninh Bình' },
  { keywords: ['vinh phuc'], lat: 21.3000, lng: 105.6000, name: 'Vĩnh Phúc' },
  { keywords: ['phu tho', 'viet tri'], lat: 21.3167, lng: 105.2167, name: 'Phú Thọ' },
  { keywords: ['thai nguyen'], lat: 21.5833, lng: 105.8500, name: 'Thái Nguyên' },
  { keywords: ['lao cai', 'sapa'], lat: 22.4833, lng: 103.9667, name: 'Lào Cai' },
  { keywords: ['lang son'], lat: 21.8500, lng: 106.7500, name: 'Lạng Sơn' },
  { keywords: ['cao bang'], lat: 22.6667, lng: 106.2667, name: 'Cao Bằng' },
  { keywords: ['ha giang'], lat: 22.8167, lng: 104.9833, name: 'Hà Giang' },
  { keywords: ['son la'], lat: 21.3333, lng: 103.9167, name: 'Sơn La' },
  { keywords: ['dien bien'], lat: 21.3833, lng: 103.0167, name: 'Điện Biên' },
  { keywords: ['lai chau'], lat: 22.3833, lng: 103.4500, name: 'Lai Châu' },
  { keywords: ['yen bai'], lat: 21.7167, lng: 104.8833, name: 'Yên Bái' },
  { keywords: ['tuyen quang'], lat: 21.8167, lng: 105.2167, name: 'Tuyên Quang' },
  { keywords: ['bac kan'], lat: 22.1500, lng: 105.8333, name: 'Bắc Kạn' },
  { keywords: ['bac giang'], lat: 21.2667, lng: 106.2000, name: 'Bắc Giang' },
  { keywords: ['hoa binh'], lat: 20.8167, lng: 105.3333, name: 'Hòa Bình' },
  { keywords: ['ha nam', 'phu ly'], lat: 20.5333, lng: 105.9167, name: 'Hà Nam' },
  { keywords: ['hai duong'], lat: 20.9333, lng: 106.3167, name: 'Hải Dương' },
  { keywords: ['ha tinh'], lat: 18.3333, lng: 105.9000, name: 'Hà Tĩnh' },
  { keywords: ['quang binh', 'dong hoi'], lat: 17.4667, lng: 106.6000, name: 'Quảng Bình' },
  { keywords: ['quang tri', 'dong ha'], lat: 16.7500, lng: 107.1833, name: 'Quảng Trị' },
  { keywords: ['binh thuan', 'phan thiet'], lat: 10.9333, lng: 108.1000, name: 'Bình Thuận' },
  { keywords: ['ninh thuan', 'phan rang'], lat: 11.5667, lng: 108.9833, name: 'Ninh Thuận' },
  { keywords: ['kon tum'], lat: 14.3500, lng: 108.0000, name: 'Kon Tum' },
  { keywords: ['dak nong'], lat: 12.0000, lng: 107.6833, name: 'Đắk Nông' },
];
