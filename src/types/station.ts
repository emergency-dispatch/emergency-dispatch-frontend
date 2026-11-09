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
  /** Mã trạm (§23), chữ in hoa, VD "ST-001". */
  code: string;
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
  /**
   * Mã trạm (§23). Tạo mới: bỏ trống → backend tự sinh "ST-xxx". Sửa: bỏ trống → giữ mã hiện tại.
   * Backend chuẩn hóa chữ in hoa; trùng mã / tên với trạm khác → 400.
   */
  code: string | null;
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

/** Định dạng mã trạm của CreateStationDto / UpdateStationDto: 2–20 ký tự chữ, số, '-' hoặc '_', ký tự đầu là chữ / số. */
export const STATION_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,19}$/;
export const STATION_CODE_MAX = 20;

/** Giới hạn của CreateStationDto / UpdateStationDto (FR-AD-01). */
export const COVERAGE_RADIUS_KM = { min: 5, max: 50, default: 10 };
