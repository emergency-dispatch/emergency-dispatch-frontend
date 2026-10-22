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

/**
 * CoolDown: hồi sức sau khi nghiệm thu nhiệm vụ (BR-27). OutOfService: ngừng hoạt động, VD xe của trạm đã bị xóa.
 */
export type RescueUnitStatus =
  | 'Available'
  | 'Dispatched'
  | 'OnScene'
  | 'Returning'
  | 'CoolDown'
  | 'Maintenance'
  | 'OutOfService';

export const RESCUE_UNIT_STATUSES: RescueUnitStatus[] = [
  'Available',
  'Dispatched',
  'OnScene',
  'Returning',
  'CoolDown',
  'Maintenance',
  'OutOfService',
];

/** Admin đặt thủ công được (RescueUnitService.EnsureManualStatusAllowed); các trạng thái còn lại do luồng điều phối tự đặt. */
export const ADMIN_SETTABLE_UNIT_STATUSES: RescueUnitStatus[] = ['Available', 'Maintenance', 'OutOfService'];

/**
 * Đang trong vòng đời nhiệm vụ (RescueUnitService.IsOnMission): backend chặn xóa xe, xóa trạm, đổi trạng thái thủ công.
 */
export const ON_MISSION_UNIT_STATUSES: RescueUnitStatus[] = ['Dispatched', 'OnScene', 'Returning'];

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
