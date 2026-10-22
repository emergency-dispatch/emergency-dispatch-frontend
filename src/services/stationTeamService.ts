import { apiClient, unwrapApi } from './apiClient';
import { UserRole, UserStatus, type ApiResponse, type UserResponseDto } from '../types/auth';
import type { PaginatedResultDto } from '../types/incident';
import type { CrewRole, StationStaff, StationTeam, StationTeamInput } from '../types/stationTeam';

// Store dùng chung cho màn Trạm & Tổ và Dispatch Panel (tổ đi kèm xe khi giao xe).
// Tổ: GET/POST/PUT/DELETE /api/stations/{id}/teams. Nhân sự: RescueStaff từ GET /api/users,
// thêm/gỡ khỏi trạm qua PUT /api/users/{id}/assign-station-team.

export interface StationTeamsSnapshot {
  staff: StationStaff[];
  teams: StationTeam[];
}

type BackendCrewRole = 'Commander' | 'Driver' | 'Firefighter' | 'Rescuer' | 'Medic';

interface StationTeamDto {
  id: string;
  stationId: string;
  name: string;
  rescueUnitId: string | null;
  rescueUnitPlate: string | null;
  members: Array<{ staffId: string; fullName: string; phoneNumber: string | null; crewRole: BackendCrewRole }>;
  isUnderstaffed: boolean;
}

const USERS_PAGE_SIZE = 100;

const toCrewRole = (role: BackendCrewRole): CrewRole => role.toLowerCase() as CrewRole;
const toBackendCrewRole = (role: CrewRole): BackendCrewRole =>
  (role.charAt(0).toUpperCase() + role.slice(1)) as BackendCrewRole;

const mapTeam = (dto: StationTeamDto): StationTeam => ({
  id: dto.id,
  stationId: dto.stationId,
  name: dto.name,
  vehicleId: dto.rescueUnitId,
  members: dto.members.map((m) => ({ staffId: m.staffId, crewRole: toCrewRole(m.crewRole), fullName: m.fullName })),
});

let teams: StationTeam[] = [];
let rescueStaff: UserResponseDto[] = [];
let snapshot: StationTeamsSnapshot = { staff: [], teams: [] };
const listeners = new Set<() => void>();

function commit() {
  const teamOf = new Map(teams.flatMap((t) => t.members.map((m) => [m.staffId, t.id] as const)));
  snapshot = {
    teams,
    staff: rescueStaff.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      phoneNumber: u.phoneNumber ?? '',
      isLocked: u.status === UserStatus.Suspended,
      stationId: u.stationId ?? null,
      teamId: teamOf.get(u.id) ?? null,
    })),
  };
  listeners.forEach((listener) => listener());
}

async function fetchTeams(stationId: string): Promise<StationTeam[]> {
  const dtos = await unwrapApi(apiClient.get<ApiResponse<StationTeamDto[]>>(`/stations/${stationId}/teams`));
  return dtos.map(mapTeam);
}

function replaceStationTeams(stationId: string, next: StationTeam[]) {
  teams = [...teams.filter((t) => t.stationId !== stationId), ...next];
}

async function assignStation(staffId: string, stationId: string | null) {
  await unwrapApi(
    apiClient.put<ApiResponse<UserResponseDto>>(`/users/${staffId}/assign-station-team`, { stationId, teamName: null })
  );
}

const toInputDto = (input: StationTeamInput) => ({
  name: input.name.trim(),
  rescueUnitId: input.vehicleId,
  members: input.members.map((m) => ({ staffId: m.staffId, crewRole: toBackendCrewRole(m.crewRole) })),
});

export const stationTeamService = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot: () => snapshot,

  /** Tải tổ của các trạm (Dispatch Panel cần tổ của mọi trạm để hiện kèm xe). */
  async loadTeams(stationIds: string[]): Promise<void> {
    const results = await Promise.all(stationIds.map(fetchTeams));
    teams = results.flat();
    commit();
  },

  async reloadStationTeams(stationId: string): Promise<void> {
    replaceStationTeams(stationId, await fetchTeams(stationId));
    commit();
  },

  /** Toàn bộ tài khoản RescueStaff (kèm trạm đang thuộc). */
  async loadStaff(): Promise<void> {
    const all: UserResponseDto[] = [];
    for (let pageIndex = 1; ; pageIndex++) {
      const page = await unwrapApi(
        apiClient.get<ApiResponse<PaginatedResultDto<UserResponseDto>>>('/users', {
          params: { role: UserRole.RescueStaff, pageIndex, pageSize: USERS_PAGE_SIZE },
        })
      );
      all.push(...page.items);
      if (!page.hasNextPage) break;
    }
    rescueStaff = all;
    commit();
  },

  async addStaff(stationId: string, staffIds: string[]): Promise<void> {
    try {
      for (const id of staffIds) await assignStation(id, stationId);
    } finally {
      await stationTeamService.loadStaff();
    }
  },

  /** Gỡ khỏi trạm → backend đồng thời gỡ khỏi tổ đang thuộc. */
  async removeStaff(stationId: string, staffId: string): Promise<void> {
    await assignStation(staffId, null);
    await Promise.all([stationTeamService.loadStaff(), stationTeamService.reloadStationTeams(stationId)]);
  },

  async saveTeam(stationId: string, input: StationTeamInput, teamId: string | null): Promise<StationTeam> {
    const request = teamId
      ? apiClient.put<ApiResponse<StationTeamDto>>(`/stations/${stationId}/teams/${teamId}`, toInputDto(input))
      : apiClient.post<ApiResponse<StationTeamDto>>(`/stations/${stationId}/teams`, toInputDto(input));
    const saved = mapTeam(await unwrapApi(request));
    teams = teamId ? teams.map((t) => (t.id === teamId ? saved : t)) : [...teams, saved];
    commit();
    return saved;
  },

  /** Xóa tổ → thành viên vẫn thuộc trạm, trở thành "chưa vào tổ". */
  async deleteTeam(stationId: string, teamId: string): Promise<void> {
    await unwrapApi(apiClient.delete<ApiResponse<boolean>>(`/stations/${stationId}/teams/${teamId}`));
    teams = teams.filter((t) => t.id !== teamId);
    commit();
  },
};
