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

  return routes;
}
