import { useMemo } from 'react';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import { getBusyTeamIds } from '../../../utils/teamAvailability';
import { gpsFarFromStationKm } from '../../../utils/vehicleLocation';

/**
 * Tổ còn sẵn sàng của trạm (xe Sẵn sàng, tổ không bận, `canBeAssigned`) — nguồn chung cho thẻ "Tổ sẵn sàng" trên bản đồ
 * và phần "Cấp … sẽ điều" của panel thẩm định. Một tổ nhiều xe sẵn sàng → một dòng theo xe đầu tiên (xe GPS bình thường
 * đứng trước). Xe GPS lệch xa trạm vẫn liệt kê (`farKm`) nhưng không tính là sẵn sàng (backend tìm tổ theo GPS xe).
 */
export function useReadyTeams() {
  const { vehicles, stations } = useDispatchStore();
  const teamByVehicle = useTeamByVehicle();
  return useMemo(() => {
    const stationsById = new Map(stations.map((s) => [s.id, s]));
    const busyTeamIds = getBusyTeamIds(vehicles, teamByVehicle);
    const seen = new Set<string>();
    const blocked = new Set<string>();
    const readyTeams = vehicles
      .filter((v) => v.status === 'available')
      .map((v) => ({ v, farKm: gpsFarFromStationKm(v, stationsById.get(v.stationId)) }))
      .sort((a, b) => Number(a.farKm !== null) - Number(b.farKm !== null))
      .flatMap(({ v, farKm }) => {
        const team = teamByVehicle.get(v.id);
        if (!team || busyTeamIds.has(team.id) || seen.has(team.id)) return [];
        if (!team.canBeAssigned) {
          blocked.add(team.id);
          return [];
        }
        seen.add(team.id);
        return [{ vehicle: v, team, farKm }];
      })
      .sort((a, b) => a.team.name.localeCompare(b.team.name, 'vi'));
    return {
      readyTeams,
      readyCount: readyTeams.filter((r) => r.farKm === null).length,
      blockedCount: blocked.size,
    };
  }, [vehicles, stations, teamByVehicle]);
}
