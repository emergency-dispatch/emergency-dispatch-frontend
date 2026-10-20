import { buildStationSeed } from '../data/admin/fleetAdminSeed';
import { internalAccountSeed } from '../data/admin/internalAccountSeed';
import { MAX_TEAM_SIZE } from '../data/dispatchConfig';
import { vehicleSeeds } from '../data/liveMapMock';
import { DEMO_STATION_ID, STATION_STAFF_SEED, STATION_TEAM_SEED } from '../data/stationTeamSeed';
import { mockApiError, mockDelay } from './admin/adminMock';
import { UserRole, type UserDto } from '../types/auth';
import type { AdminStation } from '../types/adminFleet';
import type { StationStaff, StationTeam, StationTeamInput } from '../types/stationTeam';

// TODO(backend): chưa có API Trạm/Tổ cho Operator — dữ liệu giữ trong bộ nhớ, mất khi tải lại trang.
// Trạm, tài khoản và xe đọc từ seed tĩnh, nên thay đổi bên Admin (cùng phiên) chưa đồng bộ sang đây.
// Store phát sự kiện thay đổi (useSyncExternalStore) để màn Trạm & Tổ và Dispatch Panel cùng cập nhật.

export interface StationTeamsSnapshot {
  staff: StationStaff[];
  teams: StationTeam[];
}

const stationList = buildStationSeed().filter((s) => !s.isDeleted);
const rescueAccounts = internalAccountSeed.filter((a) => a.role === UserRole.RescueStaff);
const accountsById = new Map(rescueAccounts.map((a) => [a.id, a]));
const vehicleStationById = new Map(vehicleSeeds.map((v) => [v.id, v.stationId]));

const stationOf = new Map(
  Object.entries(STATION_STAFF_SEED).flatMap(([stationId, staffIds]) => staffIds.map((id) => [id, stationId] as const))
);
let teams: StationTeam[] = structuredClone(STATION_TEAM_SEED);
let snapshot = buildSnapshot();
const listeners = new Set<() => void>();

function buildSnapshot(): StationTeamsSnapshot {
  const teamOf = new Map(teams.flatMap((t) => t.members.map((m) => [m.staffId, t.id] as const)));
  return {
    teams,
    staff: rescueAccounts.map((a) => ({
      id: a.id,
      fullName: a.fullName,
      phoneNumber: a.phoneNumber,
      isLocked: a.lock.kind === 'admin',
      stationId: stationOf.get(a.id) ?? null,
      teamId: teamOf.get(a.id) ?? null,
    })),
  };
}

function commit() {
  snapshot = buildSnapshot();
  listeners.forEach((listener) => listener());
}

const normalizeName = (name: string) => name.trim().toLowerCase();

function validateTeam(stationId: string, input: StationTeamInput, teamId: string | null) {
  const name = input.name.trim();
  if (!name) throw mockApiError(400, 'Vui lòng nhập tên tổ.');
  if (teams.some((t) => t.stationId === stationId && t.id !== teamId && normalizeName(t.name) === normalizeName(name))) {
    throw mockApiError(409, `Trạm đã có tổ tên "${name}".`);
  }
  if (input.members.length > MAX_TEAM_SIZE) throw mockApiError(400, `Mỗi tổ tối đa ${MAX_TEAM_SIZE} người.`);
  if (input.members.filter((m) => m.crewRole === 'commander').length > 1) {
    throw mockApiError(400, 'Mỗi tổ chỉ có 1 tổ trưởng (Chỉ huy kíp).');
  }

  const currentMemberIds = new Set(teams.find((t) => t.id === teamId)?.members.map((m) => m.staffId));
  for (const member of input.members) {
    const account = accountsById.get(member.staffId);
    if (!account || stationOf.get(member.staffId) !== stationId) {
      throw mockApiError(400, 'Thành viên phải là nhân sự của trạm.');
    }
    // Người bị khóa đang ở sẵn trong tổ thì giữ được (để sửa tổ không bị chặn), chỉ cấm thêm mới.
    if (account.lock.kind === 'admin' && !currentMemberIds.has(member.staffId)) {
      throw mockApiError(400, `Tài khoản ${account.fullName} đang bị khóa.`);
    }
    const otherTeam = teams.find((t) => t.id !== teamId && t.members.some((m) => m.staffId === member.staffId));
    if (otherTeam) throw mockApiError(409, `${account.fullName} đã thuộc ${otherTeam.name}.`);
  }

  if (input.vehicleId) {
    if (vehicleStationById.get(input.vehicleId) !== stationId) throw mockApiError(400, 'Xe không thuộc trạm này.');
    const otherTeam = teams.find((t) => t.id !== teamId && t.vehicleId === input.vehicleId);
    if (otherTeam) throw mockApiError(409, `Xe đã có ${otherTeam.name} phụ trách.`);
  }
}

export const stationTeamService = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot: () => snapshot,

  /**
   * Trạm mà Operator đang làm Trưởng trạm (user.stationId, hoặc headOperatorId khớp tài khoản).
   * Tài khoản chưa gắn trạm → trả trạm demo kèm isDemo để UI báo rõ.
   */
  resolveMyStation(user: UserDto | null): { station: AdminStation | null; isDemo: boolean } {
    const assigned = user?.stationId ? stationList.find((s) => s.id === user.stationId) : undefined;
    if (assigned) return { station: assigned, isDemo: false };

    const email = user?.email?.toLowerCase();
    const account = internalAccountSeed.find(
      (a) => a.role === UserRole.Operator && (a.id === user?.id || (!!email && a.email.toLowerCase() === email))
    );
    const headed = account ? stationList.find((s) => s.headOperatorId === account.id) : undefined;
    if (headed) return { station: headed, isDemo: false };

    return { station: stationList.find((s) => s.id === DEMO_STATION_ID) ?? null, isDemo: true };
  },

  async addStaff(stationId: string, staffIds: string[]): Promise<void> {
    await mockDelay();
    for (const id of staffIds) {
      const account = accountsById.get(id);
      if (!account) throw mockApiError(404, 'Không tìm thấy nhân sự.');
      if (account.lock.kind === 'admin') throw mockApiError(400, `Tài khoản ${account.fullName} đang bị khóa.`);
      if (stationOf.has(id)) throw mockApiError(409, `${account.fullName} đã thuộc một trạm khác.`);
    }
    staffIds.forEach((id) => stationOf.set(id, stationId));
    commit();
  },

  /** Gỡ khỏi trạm → đồng thời gỡ khỏi tổ đang thuộc. */
  async removeStaff(stationId: string, staffId: string): Promise<void> {
    await mockDelay();
    if (stationOf.get(staffId) !== stationId) throw mockApiError(404, 'Nhân sự không thuộc trạm này.');
    stationOf.delete(staffId);
    teams = teams.map((t) =>
      t.members.some((m) => m.staffId === staffId) ? { ...t, members: t.members.filter((m) => m.staffId !== staffId) } : t
    );
    commit();
  },

  async saveTeam(stationId: string, input: StationTeamInput, teamId: string | null): Promise<StationTeam> {
    await mockDelay();
    validateTeam(stationId, input, teamId);
    const team: StationTeam = {
      id: teamId ?? `team-${Date.now()}`,
      stationId,
      name: input.name.trim(),
      vehicleId: input.vehicleId,
      members: input.members,
    };
    teams = teamId ? teams.map((t) => (t.id === teamId ? team : t)) : [...teams, team];
    commit();
    return team;
  },

  /** Xóa tổ → thành viên vẫn thuộc trạm, trở thành "chưa vào tổ". */
  async deleteTeam(teamId: string): Promise<void> {
    await mockDelay();
    if (!teams.some((t) => t.id === teamId)) throw mockApiError(404, 'Không tìm thấy tổ.');
    teams = teams.filter((t) => t.id !== teamId);
    commit();
  },
};
