// Mirror EmergencyDispatch.Application.DTOs.RescueUnit (enum trả về dạng chuỗi — JsonStringEnumConverter).

export type RescueUnitType =
  | 'Ambulance'
  | 'FireTruck'
  | 'LadderTruck'
  | 'RescueBoat'
  | 'HeavyRescueVehicle'
  | 'PolicePatrol';

export const RESCUE_UNIT_TYPES: RescueUnitType[] = [
  'FireTruck',
  'LadderTruck',
  'Ambulance',
  'HeavyRescueVehicle',
  'RescueBoat',
  'PolicePatrol',
];

export type RescueUnitStatus = 'Available' | 'Dispatched' | 'OnScene' | 'Returning' | 'Maintenance';

export const RESCUE_UNIT_STATUSES: RescueUnitStatus[] = ['Available', 'Dispatched', 'OnScene', 'Returning', 'Maintenance'];

/** Admin chỉ chủ động đổi qua lại hai trạng thái này; các trạng thái còn lại do luồng điều phối tự đặt. */
export const ADMIN_SETTABLE_UNIT_STATUSES: RescueUnitStatus[] = ['Available', 'Maintenance'];

/** Backend chặn xóa trạm / xóa xe khi xe đang ở các trạng thái này. */
export const ON_MISSION_UNIT_STATUSES: RescueUnitStatus[] = ['Dispatched', 'OnScene'];

export interface RescueUnitResponseDto {
  id: string;
  plateNumber: string;
  unitType: RescueUnitType;
  unitTypeName: string;
  status: RescueUnitStatus;
  statusName: string;
  currentLat: number;
  currentLng: number;
  lastLocationUpdateAt: string | null;
  stationId: string;
  stationName: string;
  createdAt: string;
  updatedAt: string | null;
}

/** Body của POST /api/rescue-units. Bỏ trống tọa độ → backend lấy tọa độ của trạm. */
export interface CreateRescueUnitDto {
  plateNumber: string;
  unitType: RescueUnitType;
  stationId: string;
  initialLat?: number | null;
  initialLng?: number | null;
}

/** Body của PUT /api/rescue-units/{id} — backend bắt buộc gửi cả `status`. */
export interface UpdateRescueUnitDto {
  plateNumber: string;
  unitType: RescueUnitType;
  status: RescueUnitStatus;
  stationId: string;
}
