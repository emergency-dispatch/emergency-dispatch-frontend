import { useEffect, useMemo, useState } from 'react';
import { incidentService } from '../services/incidentService';
import type { Incident } from '../types/incident';
import type { Vehicle, VehicleStatus } from '../types/vehicle';

/** Một lộ trình xe → hiện trường, tọa độ [lng, lat] theo chuẩn GeoJSON. */
export interface DispatchRoute {
  id: string;
  vehicleId: string;
  status: VehicleStatus;
  coordinates: [number, number][];
  /** Máy chủ chỉ đường lỗi → chỉ là đoạn thẳng ước lượng (vẽ nét đứt). */
  approximate: boolean;
}

// Chỉ vẽ đường cho xe chưa tới hiện trường.
const ROUTED_STATUSES: VehicleStatus[] = ['awaiting_ack', 'accepted', 'en_route'];
// Lộ trình tính từ vị trí xe lúc gọi API → làm mới định kỳ để điểm đầu bám theo xe.
const REFRESH_MS = 30000;
// Xe lệch khỏi tuyến quá ngưỡng này (đi đường khác) → giữ nguyên tuyến, chờ lần làm mới tính lại.
const OFF_ROUTE_METERS = 150;

/**
 * Cắt phần tuyến xe đã đi qua: chiếu vị trí xe lên đoạn gần nhất của tuyến, tuyến mới bắt đầu từ xe.
 * Chạy mỗi lần xe gửi GPS nên nét đường mất ngay sau xe, không phải chờ 30 giây tải lại.
 * Khoảng cách dùng phép chiếu phẳng (đủ chính xác ở phạm vi vài km).
 */
function trimPassedRoute(coordinates: [number, number][], lng: number, lat: number): [number, number][] {
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  let best = { index: -1, distance: Infinity };
  for (let i = 1; i < coordinates.length; i++) {
    const [ax, ay] = [(coordinates[i - 1][0] - lng) * mPerDegLng, (coordinates[i - 1][1] - lat) * mPerDegLat];
    const [bx, by] = [(coordinates[i][0] - lng) * mPerDegLng, (coordinates[i][1] - lat) * mPerDegLat];
    const [dx, dy] = [bx - ax, by - ay];
    const lengthSq = dx * dx + dy * dy;
    // Xe ở gốc tọa độ: điểm gần nhất trên đoạn AB.
    const t = lengthSq > 0 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSq)) : 0;
    const distance = Math.hypot(ax + t * dx, ay + t * dy);
    if (distance < best.distance) best = { index: i, distance };
  }
  if (best.index < 0 || best.distance > OFF_ROUTE_METERS) return coordinates;
  return [[lng, lat], ...coordinates.slice(best.index)];
}

/**
 * Lộ trình đường bộ của các xe đang tới hiện trường (GET /api/dispatch/tracking/incident/{id} →
 * units[].routeTrajectory, backend tính bằng OSRM từ vị trí xe; xe chưa gửi GPS thì vị trí = trạm của xe).
 * Tải lại khi có xe đổi trạng thái hoặc được giao / hủy giao, và mỗi 30 giây.
 */
export function useDispatchRoutes(incidents: Incident[], vehicles: Vehicle[]): DispatchRoute[] {
  const [routes, setRoutes] = useState<DispatchRoute[]>([]);

  const movingVehicles = useMemo(
    () => vehicles.filter((v) => v.incidentId && ROUTED_STATUSES.includes(v.status)),
    [vehicles]
  );
  const incidentIds = useMemo(() => {
    const active = new Set(incidents.filter((i) => i.status === 'approved').map((i) => i.id));
    return [...new Set(movingVehicles.map((v) => v.incidentId!))].filter((id) => active.has(id));
  }, [incidents, movingVehicles]);
  const refreshKey = movingVehicles
    .map((v) => `${v.id}:${v.status}`)
    .sort()
    .join('|');

  useEffect(() => {
    if (incidentIds.length === 0) {
      setRoutes([]);
      return;
    }
    let cancelled = false;
    const statusById = new Map(movingVehicles.map((v) => [v.id, v.status]));

    const load = async () => {
      const results = await Promise.allSettled(incidentIds.map((id) => incidentService.getTracking(id)));
      if (cancelled) return;
      setRoutes(
        results.flatMap((result) => {
          if (result.status !== 'fulfilled' || !result.value.success) return [];
          return (result.value.data.units ?? []).flatMap((unit) => {
            const status = statusById.get(unit.rescueUnitId);
            if (!status || unit.routeTrajectory.length < 2) return [];
            return [
              {
                id: unit.assignmentId,
                vehicleId: unit.rescueUnitId,
                status,
                coordinates: unit.routeTrajectory.map((p) => [p.longitude, p.latitude] as [number, number]),
                approximate: !!unit.isApproximateRoute,
              },
            ];
          });
        })
      );
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

  return useMemo(() => {
    const byId = new Map(vehicles.map((v) => [v.id, v]));
    return routes.map((route) => {
      const vehicle = byId.get(route.vehicleId);
      // Chưa có GPS thật thì xe đang hiện ở trạm, chính là đầu tuyến → không cắt.
      if (!vehicle?.hasLiveGps) return route;
      return { ...route, coordinates: trimPassedRoute(route.coordinates, vehicle.lng, vehicle.lat) };
    });
  }, [routes, vehicles]);
}
