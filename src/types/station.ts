import type { RescueUnitResponseDto } from './rescueUnit';

// Mirror EmergencyDispatch.Application.DTOs.Station.
// Backend chưa có: phân khu. Trạm đã xóa mềm không bao giờ được trả về.

export interface StationStaffMemberDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  /** Tổ làm việc. */
  teamName: string | null;
}

export interface StationResponseDto {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber: string | null;
  isActive: boolean;
  coverageRadiusKm: number;
  /** Operator phụ trách trạm (mỗi Operator phụ trách tối đa 1 trạm). */
  headOperatorId: string | null;
  headOperatorName: string | null;
  headOperatorPhone: string | null;
  /** Số xe đang Available. */
  activeUnitsCount: number;
  totalUnitsCount: number;
  staffCount: number;
  rescueUnits: RescueUnitResponseDto[];
  staffMembers: StationStaffMemberDto[];
  createdAt: string;
}

/** Body của POST /api/stations và PUT /api/stations/{id}. */
export interface StationUpsertDto {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber: string | null;
  isActive: boolean;
  /**
   * Bắt buộc gửi cả khi sửa: backend không giữ giá trị cũ, thiếu trường này sẽ bị đặt về mặc định 10 km.
   */
  coverageRadiusKm: number;
  /**
   * Bắt buộc gửi cả khi sửa: backend ghi đè theo giá trị gửi lên, thiếu trường này sẽ gỡ Operator phụ trách hiện tại.
   */
  headOperatorId: string | null;
}

/** Giới hạn của CreateStationDto / UpdateStationDto (FR-AD-01). */
export const COVERAGE_RADIUS_KM = { min: 5, max: 50, default: 10 };
