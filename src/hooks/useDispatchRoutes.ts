import { useEffect, useMemo, useRef, useState } from 'react';
import { incidentService } from '../services/incidentService';
import { mapboxService } from '../services/mapboxService';
import type { Incident } from '../types/incident';
import type { Station, Vehicle, VehicleStatus } from '../types/vehicle';

/** Một lộ trình xe → hiện trường, tọa độ [lng, lat] theo chuẩn GeoJSON. */
export interface DispatchRoute {
  id: string;
  vehicleId: string;
  status: VehicleStatus;
  coordinates: [number, number][];
}

// Chỉ vẽ đường cho xe chưa tới hiện trường.
const ROUTED_STATUSES: VehicleStatus[] = ['awaiting_ack', 'accepted', 'en_route'];
// Lộ trình tính từ vị trí xe lúc gọi API → làm mới định kỳ để điểm đầu bám theo xe.
const REFRESH_MS = 30000;

/**
 * Lộ trình của các xe đang tới hiện trường.
 * - Xe đã có GPS thật: lộ trình backend (GET /api/dispatch/tracking/incident/{id} → units[].routeTrajectory).
 * - Xe chưa gửi GPS: backend tính từ tọa độ cũ trong DB (có thể là trạm cũ) → tự vẽ từ trạm của xe tới hiện trường
 *   (Mapbox Directions, dự phòng đường thẳng), khớp với chỗ xe đang hiện trên bản đồ.
 * Tải lại khi có xe đổi trạng thái hoặc được giao / hủy giao, và mỗi 30 giây.
 */
export function useDispatchRoutes(incidents: Incident[], vehicles: Vehicle[], stations: Station[]): DispatchRoute[] {
  const [routes, setRoutes] = useState<DispatchRoute[]>([]);
  // Lộ trình trạm → hiện trường không đổi theo thời gian → nhớ theo cặp (trạm, sự cố) để không gọi lại mỗi 30 giây.
  const stationRouteCache = useRef(new Map<string, [number, number][]>());
  const latest = useRef({ vehicles, incidents, stations });
  latest.current = { vehicles, incidents, stations };

  const movingVehicles = useMemo(
    () => vehicles.filter((v) => v.incidentId && ROUTED_STATUSES.includes(v.status)),
    [vehicles]
  );
  const incidentIds = useMemo(() => {
    const active = new Set(incidents.filter((i) => i.status === 'approved').map((i) => i.id));
    return [...new Set(movingVehicles.map((v) => v.incidentId!))].filter((id) => active.has(id));
  }, [incidents, movingVehicles]);
  // Tải lại khi xe đổi trạng thái, bắt đầu có GPS, hoặc danh sách trạm vừa tải xong.
  const refreshKey = `${movingVehicles
    .map((v) => `${v.id}:${v.status}:${v.hasLiveGps}`)
    .sort()
    .join('|')}#${stations.length}`;

  useEffect(() => {
    if (incidentIds.length === 0) {
      setRoutes([]);
      return;
    }
    let cancelled = false;
    const statusById = new Map(movingVehicles.map((v) => [v.id, v.status]));

    const stationRoute = async (station: Station, incident: Incident) => {
      const key = `${station.id}|${incident.id}`;
      const cached = stationRouteCache.current.get(key);
      if (cached) return cached;
      const coords = (await mapboxService.getDrivingRoute(station, incident)) ?? [
        [station.lng, station.lat],
        [incident.lng, incident.lat],
      ];
      stationRouteCache.current.set(key, coords);
      return coords;
    };

    const load = async () => {
      const results = await Promise.allSettled(incidentIds.map((id) => incidentService.getTracking(id)));
      if (cancelled) return;
      const { vehicles: currentVehicles, incidents: currentIncidents, stations: currentStations } = latest.current;
      const vehiclesById = new Map(currentVehicles.map((v) => [v.id, v]));
      const incidentsById = new Map(currentIncidents.map((i) => [i.id, i]));
      const stationsById = new Map(currentStations.map((s) => [s.id, s]));

      const units = results.flatMap((result) =>
        result.status === 'fulfilled' && result.value.success ? (result.value.data.units ?? []) : []
      );
      const next = await Promise.all(
        units.map(async (unit): Promise<DispatchRoute | null> => {
          const status = statusById.get(unit.rescueUnitId);
          const vehicle = vehiclesById.get(unit.rescueUnitId);
          if (!status || !vehicle) return null;
          const station = stationsById.get(vehicle.stationId);
          const incident = vehicle.incidentId ? incidentsById.get(vehicle.incidentId) : undefined;
          const coordinates =
            !vehicle.hasLiveGps && station && incident
              ? await stationRoute(station, incident)
              : unit.routeTrajectory.map((p) => [p.longitude, p.latitude] as [number, number]);
          return coordinates.length >= 2 ? { id: unit.assignmentId, vehicleId: unit.rescueUnitId, status, coordinates } : null;
        })
      );
      if (!cancelled) setRoutes(next.filter((r): r is DispatchRoute => r !== null));
    };

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // refreshKey gói trạng thái các xe đang chạy; incidentIds suy ra từ cùng dữ liệu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, incidentIds.join('|')]);

  return routes;
}
