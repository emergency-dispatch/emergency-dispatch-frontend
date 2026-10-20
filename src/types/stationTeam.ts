import type { CrewRole } from './shift';

// Tổ làm việc CỐ ĐỊNH của trạm (không phụ thuộc ca — khác kíp trực ShiftAssignment của Admin).
// Trưởng trạm (Operator có headOperatorId) quản lý nhân sự và tổ của trạm mình.
// Mỗi RescueStaff thuộc tối đa 1 trạm và 1 tổ; mỗi xe có tối đa 1 tổ phụ trách.

export interface TeamMember {
  staffId: string;
  /** 'commander' = Tổ trưởng (tối đa 1 người/tổ). */
  crewRole: CrewRole;
}

/** Mirror dự kiến của StationTeamDto (backend chưa có). */
export interface StationTeam {
  id: string;
  stationId: string;
  name: string;
  /** Xe tổ phụ trách; null = tổ trực tại trạm. */
  vehicleId: string | null;
  members: TeamMember[];
}

export type StationTeamInput = Pick<StationTeam, 'name' | 'vehicleId' | 'members'>;

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
