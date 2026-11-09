// Thiết bị cứu hộ của trạm (FE_MOBILE_HANDOFF §25, Phiếu đăng ký §3.2.c). Mirror DTO backend `EquipmentDtos.cs`.

export const EQUIPMENT_CATEGORIES = [
  'FireFighting',
  'Medical',
  'Rescue',
  'Protective',
  'Communication',
  'Other',
] as const;
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export const EQUIPMENT_STATUSES = ['Available', 'Maintenance'] as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export interface EquipmentDto {
  id: string;
  name: string;
  category: EquipmentCategory;
  status: EquipmentStatus;
  quantity: number;
  stationId: string;
  stationName: string | null;
  /** null = để ở kho trạm (không gắn xe). */
  rescueUnitId: string | null;
  rescueUnitPlate: string | null;
  notes: string | null;
  /** Lý do bảo trì — backend xóa khi về Available. */
  statusNote: string | null;
  statusChangedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * Body POST / PUT. `stationId` bắt buộc ở cả hai (backend `[Required] Guid`) — chỉ GET danh sách mới tự lấy
 * trạm của Operator khi để trống. Chỉ Admin được đổi trạm khi sửa.
 */
export interface EquipmentInput {
  name: string;
  category: EquipmentCategory;
  quantity: number;
  stationId: string;
  rescueUnitId: string | null;
  notes: string | null;
}

// Giới hạn kiểm tra của backend.
export const EQUIPMENT_NAME_MAX = 200;
export const EQUIPMENT_NOTES_MAX = 500;
export const EQUIPMENT_QUANTITY_MIN = 1;
export const EQUIPMENT_QUANTITY_MAX = 1000;
/** Lý do chuyển sang Bảo trì tối thiểu 5 ký tự (sau khi bỏ khoảng trắng đầu cuối). */
export const EQUIPMENT_REASON_MIN = 5;
