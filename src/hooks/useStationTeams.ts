import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { stationTeamService, type StationTeamsSnapshot } from '../services/stationTeamService';
import { teamNameLabel, type DispatchAssignmentResponseDto } from '../types/dispatch';
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

/** Tổ của một lượt điều xe: `team` = chi tiết tổ (tổ trưởng, thành viên) nếu là tổ trạm mình còn tồn tại. */
export interface AssignmentTeam {
  id: string | null;
  name: string;
  team: StationTeam | null;
}

/**
 * §34: tổ của một lượt điều xe. Ưu tiên tổ backend chốt lúc phát lệnh (`stationTeamId` / `stationTeamName`) — xe có
 * thể đã đổi tổ sau đó, hoặc là tổ trạm khác đi hỗ trợ (Operator không xem được chi tiết). Lượt cũ chưa có tổ → tổ
 * hiện tại của xe. null = xe chưa thuộc tổ nào.
 */
export function useAssignmentTeam(): (
  vehicleId: string,
  assignment?: DispatchAssignmentResponseDto | null
) => AssignmentTeam | null {
  const { teams } = useStationTeams();
  const teamByVehicle = useTeamByVehicle();
  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t] as const)), [teams]);
  return useCallback(
    (vehicleId, assignment) => {
      if (assignment?.stationTeamId) {
        // §40: tổ đã giải thể → không ghép chi tiết tổ hiện tại (tên có thể đã thuộc tổ mới), ghi rõ "(đã giải thể)".
        const deleted = !!assignment.stationTeamDeleted;
        const team = deleted ? null : teamsById.get(assignment.stationTeamId) ?? null;
        const name = assignment.stationTeamName || team?.name;
        if (name) return { id: assignment.stationTeamId, name: teamNameLabel(name, deleted), team };
      }
      const team = teamByVehicle.get(vehicleId);
      return team ? { id: team.id, name: team.name, team } : null;
    },
    [teamsById, teamByVehicle]
  );
}
