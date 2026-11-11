import type { StationTeam } from '../types/stationTeam';
import type { Vehicle, VehicleStatus } from '../types/vehicle';

// Trạng thái xe cho thấy kíp của tổ đang làm nhiệm vụ (hoặc đang quay về / hồi sức).
const TEAM_BUSY_STATUSES = new Set<VehicleStatus>(['awaiting_ack', 'accepted', 'en_route', 'on_scene', 'recovering']);

/**
 * Tổ đang bận: một tổ là một kíp người nhưng có thể sở hữu nhiều xe (`rescueUnitIds`). Khi một xe của tổ đang làm
 * nhiệm vụ thì các xe còn lại của tổ vẫn "Sẵn sàng" ở backend — không được gợi ý giao tiếp, kẻo cùng một tổ bị giao
 * hai lần (cùng sự cố hoặc sự cố khác).
 */
export function getBusyTeamIds(vehicles: Vehicle[], teamByVehicle: Map<string, StationTeam>): Set<string> {
  const busy = new Set<string>();
  for (const v of vehicles) {
    if (!TEAM_BUSY_STATUSES.has(v.status)) continue;
    const team = teamByVehicle.get(v.id);
    if (team) busy.add(team.id);
  }
  return busy;
}
