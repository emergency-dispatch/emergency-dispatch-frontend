import { apiClient, unwrapApi } from './apiClient';
import { UserRole, UserStatus, type ApiResponse, type UserResponseDto } from '../types/auth';
import type { PaginatedResultDto } from '../types/incident';
import type { CrewRole, StationStaff, StationTeam, StationTeamInput } from '../types/stationTeam';

// Store dùng chung cho màn Trạm & Tổ và Dispatch Panel (tổ đi kèm xe khi giao xe).
// Tổ: GET/POST/PUT/DELETE /api/stations/{id}/teams. Nhân sự: RescueStaff từ GET /api/users (với Operator chỉ trả
// nhân viên trạm mình) + GET /api/users/unassigned-staff (nhân viên chưa có trạm, toàn hệ thống — ứng viên
// "Thêm nhân sự"), thêm/gỡ khỏi trạm qua PUT /api/users/{id}/assign-station-team.

export interface CreateStaffInput {
  fullName: string;
  email: string;
  password: string;
  /** Rỗng = không có số. */
  phoneNumber: string;
}

export interface StationTeamsSnapshot {
  staff: StationStaff[];
  teams: StationTeam[];
}

type BackendCrewRole = 'Commander' | 'Driver' | 'Firefighter' | 'Rescuer' | 'Medic';

interface StationTeamDto {
  id: string;
  stationId: string;
  name: string;
  /** Tổ nhiều xe (§26.1). Backend cũ chưa có → dùng rescueUnitId. */
  rescueUnitIds?: string[];
  rescueUnitPlates?: string[];
  /** [Cũ] Xe đầu tiên của tổ. */
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
  vehicleIds: dto.rescueUnitIds ?? (dto.rescueUnitId ? [dto.rescueUnitId] : []),
  vehiclePlates: dto.rescueUnitPlates ?? (dto.rescueUnitPlate ? [dto.rescueUnitPlate] : []),
  members: dto.members.map((m) => ({ staffId: m.staffId, crewRole: toCrewRole(m.crewRole), fullName: m.fullName })),
});

let teams: StationTeam[] = [];
let rescueStaff: UserResponseDto[] = [];
let unassignedStaff: UserResponseDto[] = [];
let snapshot: StationTeamsSnapshot = { staff: [], teams: [] };
const listeners = new Set<() => void>();

function commit() {
  const teamOf = new Map(teams.flatMap((t) => t.members.map((m) => [m.staffId, t.id] as const)));
  // Một người có thể nằm ở cả hai danh sách khi vừa đổi trạm giữa hai lần tải → ưu tiên bản từ GET /users.
  const known = new Set(rescueStaff.map((u) => u.id));
  const allStaff = [...rescueStaff, ...unassignedStaff.filter((u) => !known.has(u.id))];
  snapshot = {
    teams,
    staff: allStaff.map((u) => ({
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

/** Tải mọi trang của một API danh sách người dùng phân trang. */
async function fetchAllUsers(url: string, params: Record<string, string | number> = {}): Promise<UserResponseDto[]> {
  const all: UserResponseDto[] = [];
  for (let pageIndex = 1; ; pageIndex++) {
    const page = await unwrapApi(
      apiClient.get<ApiResponse<PaginatedResultDto<UserResponseDto>>>(url, {
        params: { ...params, pageIndex, pageSize: USERS_PAGE_SIZE },
      })
    );
    all.push(...page.items);
    if (!page.hasNextPage) break;
  }
  return all;
}

async function assignStation(staffId: string, stationId: string | null) {
  await unwrapApi(
    apiClient.put<ApiResponse<UserResponseDto>>(`/users/${staffId}/assign-station-team`, { stationId, teamName: null })
  );
}

const toInputDto = (input: StationTeamInput) => ({
  name: input.name.trim(),
  // Gửi danh sách (kể cả rỗng = gỡ hết xe); backend chỉ dùng rescueUnitId cũ khi không có rescueUnitIds.
  rescueUnitIds: input.vehicleIds,
  members: input.members.map((m) => ({ staffId: m.staffId, crewRole: toBackendCrewRole(m.crewRole) })),
});

export const stationTeamService = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot: () => snapshot,

  /**
   * Tải tổ của các trạm (Dispatch Panel hiện tổ kèm xe). Operator chỉ xem được tổ trạm mình — trạm khác trả 403
   * và được bỏ qua (xe hỗ trợ của trạm khác hiện không kèm tổ).
   */
  async loadTeams(stationIds: string[]): Promise<void> {
    const results = await Promise.allSettled(stationIds.map(fetchTeams));
    teams = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    commit();
  },

  async reloadStationTeams(stationId: string): Promise<void> {
    replaceStationTeams(stationId, await fetchTeams(stationId));
    commit();
  },

  /** Tài khoản RescueStaff mà người dùng được xem qua GET /api/users (Operator: nhân viên trạm mình). */
  async loadStaff(): Promise<void> {
    rescueStaff = await fetchAllUsers('/users', { role: UserRole.RescueStaff });
    commit();
  },

  /**
   * Nhân viên cứu hộ đang hoạt động chưa thuộc trạm nào, toàn hệ thống (GET /api/users/unassigned-staff) —
   * ứng viên cho "Thêm nhân sự". Backend chỉ trả tài khoản Active, stationId = null.
   */
  async loadUnassignedStaff(): Promise<void> {
    unassignedStaff = await fetchAllUsers('/users/unassigned-staff');
    commit();
  },

  async addStaff(stationId: string, staffIds: string[]): Promise<void> {
    try {
      for (const id of staffIds) await assignStation(id, stationId);
    } finally {
      await Promise.all([stationTeamService.loadStaff(), stationTeamService.loadUnassignedStaff()]);
    }
  },

  /**
   * Operator tạo tài khoản RescueStaff (POST /api/users). Backend chỉ cho Operator tạo RescueStaff và tự gán trạm của
   * Operator (bỏ qua stationId client gửi) nên không gửi trạm.
   */
  async createStaff(input: CreateStaffInput): Promise<UserResponseDto> {
    const created = await unwrapApi(
      apiClient.post<ApiResponse<UserResponseDto>>('/users', {
        fullName: input.fullName,
        email: input.email,
        password: input.password,
        phoneNumber: input.phoneNumber || null,
        role: UserRole.RescueStaff,
      })
    );
    await stationTeamService.loadStaff();
    return created;
  },

  /** Gỡ khỏi trạm → backend đồng thời gỡ khỏi tổ đang thuộc. */
  async removeStaff(stationId: string, staffId: string): Promise<void> {
    await assignStation(staffId, null);
    await Promise.all([
      stationTeamService.loadStaff(),
      stationTeamService.loadUnassignedStaff(),
      stationTeamService.reloadStationTeams(stationId),
    ]);
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
