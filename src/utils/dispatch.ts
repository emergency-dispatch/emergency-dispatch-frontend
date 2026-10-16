import { LOAD_AWARE_WEIGHTS, MATCHING_VEHICLE_TYPES, MAX_SEARCH_RADIUS_KM, SEARCH_RADII_KM } from '../data/dispatchConfig';
import type { Incident } from '../types/incident';
import type { DispatchAlgorithm, DispatchCandidate, DispatchSuggestion, Vehicle } from '../types/vehicle';

const AVG_SPEED_KMH = 28;
// Số nhiệm vụ đang chạy của trạm được coi là "đầy tải" khi chuẩn hóa về 0–1.
const MISSIONS_SATURATION = 3;

interface LatLng {
  lat: number;
  lng: number;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function estimateEtaMinutes(km: number): number {
  return Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60));
}

/**
 * Gợi ý điều phối (FR-OP-04): lọc xe Available đúng chủng loại, tìm trong bán kính
 * 10 → 15 → 22.5 → 30 km, rồi xếp hạng theo Nearest-Available hoặc Load-Aware.
 * Sự cố đã leo thang: nhân đôi bán kính (tối đa 30 km).
 * TODO(backend): chuyển sang API gợi ý khi backend có (khoảng cách mạng lưới đường thay vì Haversine).
 */
export function suggestVehicles(
  incident: Incident,
  vehicles: Vehicle[],
  algorithm: DispatchAlgorithm,
  escalated = false
): DispatchSuggestion {
  const radii = escalated
    ? Array.from(new Set(SEARCH_RADII_KM.map((r) => Math.min(MAX_SEARCH_RADIUS_KM, r * 2))))
    : SEARCH_RADII_KM;

  const matchingTypes = MATCHING_VEHICLE_TYPES[incident.category];
  const eligible = vehicles
    .filter((v) => v.status === 'available' && matchingTypes.includes(v.type))
    .map((vehicle) => ({ vehicle, km: haversineKm(incident, vehicle) }));

  for (const radiusKm of radii) {
    const inRadius = eligible.filter((c) => c.km <= radiusKm);
    if (inRadius.length === 0) continue;

    const candidates: DispatchCandidate[] = inRadius.map(({ vehicle, km }) => {
      const stationVehicles = vehicles.filter((v) => v.stationId === vehicle.stationId);
      const busy = stationVehicles.filter((v) => v.status !== 'available');
      const stationLoad = stationVehicles.length > 0 ? busy.length / stationVehicles.length : 0;
      const missions = new Set(busy.map((v) => v.incidentId).filter(Boolean)).size;
      const activeMissions = Math.min(1, missions / MISSIONS_SATURATION);
      const cost =
        LOAD_AWARE_WEIGHTS.distance * (km / radiusKm) +
        LOAD_AWARE_WEIGHTS.stationLoad * stationLoad +
        LOAD_AWARE_WEIGHTS.activeMissions * activeMissions;

      return { vehicle, km, etaMinutes: estimateEtaMinutes(km), cost, stationLoad, activeMissions };
    });

    candidates.sort((a, b) => (algorithm === 'nearest' ? a.km - b.km : a.cost - b.cost));
    return { radiusKm, expanded: radiusKm > SEARCH_RADII_KM[0], candidates };
  }

  return { radiusKm: MAX_SEARCH_RADIUS_KM, expanded: true, candidates: [] };
}
