import type { RescueUnitResponseDto } from './rescueUnit';

// Mirror EmergencyDispatch.Application.DTOs.Station.
// Backend chưa có: bán kính phủ sóng, trưởng trạm, phân khu. Trạm đã xóa mềm không bao giờ được trả về.

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
}
