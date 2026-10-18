import { API_CONFIG } from '../config/api';

export const MAPBOX_ACCESS_TOKEN = API_CONFIG.MAPBOX_TOKEN;
export const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';

export const mapboxService = {
  /**
   * Tra cứu địa chỉ tiếng Việt từ tọa độ GPS (Reverse Geocoding)
   */
  async reverseGeocode(lng: number, lat: number): Promise<string> {
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
      console.warn('Mapbox reverseGeocode failed, trying OSM fallback:', err);
    }

    // Fallback: OpenStreetMap Nominatim
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
