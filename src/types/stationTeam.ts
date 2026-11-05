// Tổ làm việc CỐ ĐỊNH của trạm (không phụ thuộc ca trực).
// Trưởng trạm (Operator có headOperatorId) quản lý nhân sự và tổ của trạm mình.
// Mỗi RescueStaff thuộc tối đa 1 trạm và 1 tổ; mỗi xe có tối đa 1 tổ phụ trách, một tổ có thể phụ trách nhiều xe.

export type CrewRole = 'commander' | 'driver' | 'firefighter' | 'rescuer' | 'medic';

export const CREW_ROLES: CrewRole[] = ['commander', 'driver', 'firefighter', 'rescuer', 'medic'];

export const CREW_ROLE_LABEL: Record<CrewRole, string> = {
  commander: 'Chỉ huy kíp',
  driver: 'Lái xe',
  firefighter: 'Chiến sĩ cứu hỏa',
  rescuer: 'Chiến sĩ cứu hộ',
  medic: 'Y sĩ cấp cứu',
};

export interface TeamMember {
  staffId: string;
  /** 'commander' = Tổ trưởng (tối đa 1 người/tổ). */
  crewRole: CrewRole;
  /** Tên do backend trả kèm tổ — Dispatch Panel dùng để hiện tổ trưởng mà không cần tải danh sách nhân sự. */
  fullName?: string;
}

/** Mirror StationTeamDto (GET /api/stations/{id}/teams). */
export interface StationTeam {
  id: string;
  stationId: string;
  name: string;
  /** Các xe tổ phụ trách (rescueUnitIds, xếp theo biển số); rỗng = tổ trực tại trạm. */
  vehicleIds: string[];
  /** Biển số tương ứng từng phần tử của `vehicleIds` (rescueUnitPlates). */
  vehiclePlates: string[];
  members: TeamMember[];
}

export type StationTeamInput = Pick<StationTeam, 'name' | 'vehicleIds' | 'members'>;

/** RescueStaff kèm trạm / tổ đang thuộc (null = chưa có). */
export interface StationStaff {
  id: string;
  fullName: string;
  phoneNumber: string;
  /** Admin khóa tài khoản → không thêm được vào trạm / tổ. */
  isLocked: boolean;
  stationId: string | null;
  teamId: string | null;
}
