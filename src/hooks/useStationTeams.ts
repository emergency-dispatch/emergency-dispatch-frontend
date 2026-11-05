import { useMemo, useSyncExternalStore } from 'react';
import { stationTeamService, type StationTeamsSnapshot } from '../services/stationTeamService';
import type { StationTeam } from '../types/stationTeam';

/** Nhân sự & tổ của mọi trạm, tự cập nhật khi Trưởng trạm thêm/sửa/xóa. */
export function useStationTeams(): StationTeamsSnapshot {
  return useSyncExternalStore(stationTeamService.subscribe, stationTeamService.getSnapshot);
}

/** Tổ phụ trách theo xe — Dispatch Panel hiện tổ đi kèm khi giao xe. Một tổ nhiều xe → nhiều khóa cùng trỏ về tổ. */
export function useTeamByVehicle(): Map<string, StationTeam> {
  const { teams } = useStationTeams();
  return useMemo(
    () => new Map(teams.flatMap((t) => t.vehicleIds.map((vehicleId) => [vehicleId, t] as const))),
    [teams]
  );
}
