import { useMemo, useSyncExternalStore } from 'react';
import { stationTeamService, type StationTeamsSnapshot } from '../services/stationTeamService';
import type { StationTeam } from '../types/stationTeam';

/** Nhân sự & tổ của mọi trạm, tự cập nhật khi Trưởng trạm thêm/sửa/xóa. */
export function useStationTeams(): StationTeamsSnapshot {
  return useSyncExternalStore(stationTeamService.subscribe, stationTeamService.getSnapshot);
}

/** Tổ phụ trách theo xe — Dispatch Panel hiện tổ đi kèm khi giao xe. */
export function useTeamByVehicle(): Map<string, StationTeam> {
  const { teams } = useStationTeams();
  return useMemo(
    () => new Map(teams.filter((t) => t.vehicleId).map((t) => [t.vehicleId!, t])),
    [teams]
  );
}
