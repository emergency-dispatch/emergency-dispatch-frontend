import { haversineDistanceKm } from './serviceArea';
import type { Station, Vehicle } from '../types/vehicle';

/** Xe Sẵn sàng có GPS cách trạm quá mức này = vị trí đáng ngờ (bằng nấc bán kính tìm tổ đầu tiên mặc định). */
export const GPS_FAR_FROM_STATION_KM = 10;

/** GPS cách trạm trong mức này coi như xe đang đậu ở trạm (sai số GPS, bãi đậu cạnh trạm). */
export const GPS_AT_STATION_KM = 0.2;

/**
 * Xe Sẵn sàng đang cách trạm bao nhiêu km theo GPS lưu; null = đang ở trạm / không xét (xe có nhiệm vụ, thiếu trạm).
 * Backend tính khoảng cách gợi ý theo GPS này và không đưa xe về trạm khi hết nhiệm vụ.
 */
export function readyAwayFromStationKm(
  vehicle: Pick<Vehicle, 'status' | 'lat' | 'lng'>,
  station: Pick<Station, 'lat' | 'lng'> | undefined
): number | null {
  if (!station || vehicle.status !== 'available') return null;
  const km = haversineDistanceKm(vehicle.lat, vehicle.lng, station.lat, station.lng);
  return km > GPS_AT_STATION_KM ? km : null;
}

/** Như trên nhưng chỉ trả khi cách trạm quá mức đáng ngờ → cảnh báo; null = bình thường. */
export function gpsFarFromStationKm(
  vehicle: Pick<Vehicle, 'status' | 'lat' | 'lng'>,
  station: Pick<Station, 'lat' | 'lng'> | undefined
): number | null {
  const km = readyAwayFromStationKm(vehicle, station);
  return km !== null && km > GPS_FAR_FROM_STATION_KM ? km : null;
}
