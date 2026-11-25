import { haversineDistanceKm } from './serviceArea';
import type { Station, Vehicle } from '../types/vehicle';

/** Xe Sẵn sàng có GPS cách trạm quá mức này = vị trí đáng ngờ (bằng nấc bán kính tìm tổ đầu tiên mặc định). */
export const GPS_FAR_FROM_STATION_KM = 10;

/**
 * Backend tính khoảng cách gợi ý theo GPS lưu của xe và không đưa xe về trạm khi hết nhiệm vụ, trong khi bản đồ vẽ xe
 * rảnh đậu cạnh trạm → GPS lệch không thấy được trên bản đồ. Trả số km lệch; null = bình thường / không xét.
 */
export function gpsFarFromStationKm(
  vehicle: Pick<Vehicle, 'status' | 'lat' | 'lng'>,
  station: Pick<Station, 'lat' | 'lng'> | undefined
): number | null {
  if (!station || vehicle.status !== 'available') return null;
  const km = haversineDistanceKm(vehicle.lat, vehicle.lng, station.lat, station.lng);
  return km > GPS_FAR_FROM_STATION_KM ? km : null;
}
