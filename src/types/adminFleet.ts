import type { DispatchVehicleType, VehicleStatus } from './vehicle';

// Trạng thái xe phía Admin = vòng đời nhiệm vụ của Operator + 2 trạng thái quản trị.
// maintenance: Admin chủ động đặt. out_of_service: hệ thống đặt khi trạm trực thuộc bị xóa.
export type AdminVehicleStatus = VehicleStatus | 'maintenance' | 'out_of_service';

// Xe đang làm nhiệm vụ hoặc hồi sức sau nhiệm vụ → cấm xóa, đặt bảo trì, đổi trạm.
export const BUSY_VEHICLE_STATUSES: AdminVehicleStatus[] = [
  'awaiting_ack',
  'accepted',
  'en_route',
  'on_scene',
  'recovering',
];

export const isVehicleBusy = (status: AdminVehicleStatus) => BUSY_VEHICLE_STATUSES.includes(status);

/** Đang làm nhiệm vụ (chưa tính hồi sức) — gộp thành một nhóm ở Tổng quan và bộ lọc Đội xe. */
export const ON_MISSION_VEHICLE_STATUSES: AdminVehicleStatus[] = ['awaiting_ack', 'accepted', 'en_route', 'on_scene'];

/** Mirror dự kiến của StationDto (backend chưa có). */
export interface AdminStation {
  id: string;
  name: string;
  address: string;
  area: string;
  lat: number;
  lng: number;
  coverageRadiusKm: number;
  hotline: string;
  /** Trưởng trạm = một Operator được gán vào trạm (HeadOperatorId), tối đa 1. */
  headOperatorId: string | null;
  isDeleted: boolean;
}

export interface AdminStationListItem extends AdminStation {
  headOperatorName: string | null;
  vehicleCount: number;
  availableVehicleCount: number;
}

export type StationInput = Omit<AdminStation, 'id' | 'isDeleted'>;

/** Mirror dự kiến của VehicleDto (backend chưa có). */
export interface AdminVehicle {
  id: string;
  plate: string;
  type: DispatchVehicleType;
  stationId: string;
  status: AdminVehicleStatus;
  /** Nhân sự phụ trách xe (1 RescueStaff, mỗi người chỉ gán cho 1 xe). */
  crewMemberId: string | null;
  /** Thời điểm Admin đặt Bảo trì; null khi xe không ở trạng thái Bảo trì. */
  maintenanceSince: string | null;
  isDeleted: boolean;
}

export interface AdminVehicleListItem extends AdminVehicle {
  stationName: string;
  crewMemberName: string | null;
}

export type VehicleInput = Pick<AdminVehicle, 'plate' | 'type' | 'stationId' | 'crewMemberId'>;

export interface StationDeleteResult {
  affectedVehicleIds: string[];
}
