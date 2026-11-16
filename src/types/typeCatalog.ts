// Mirror EmergencyDispatch.Application.DTOs.Catalog (FE_MOBILE_HANDOFF §31–32): danh mục loại xe / loại sự cố do Admin quản lý.
// Mã (`code`) là khóa nối với RescueUnit.unitType, FieldRequest.requestedUnitType, Incident.incidentTypeCode.

/** Mức độ có kế hoạch điều xe (Level1–Level3). */
export type DispatchPlanSeverity = 'Level1' | 'Level2' | 'Level3';

/** Nhóm của loại sự cố (IncidentEventType, trừ None). */
export type IncidentTypeCategory = 'FireExplosion' | 'TrafficAccident' | 'Other';

/** GET /api/rescue-unit-types */
export interface RescueUnitTypeDto {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  /** Tên theo Accept-Language lúc gọi API — đổi ngôn ngữ trên FE thì dùng nameVi / nameEn. */
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  /** Loại seed sẵn (6 loại cũ): không xóa được. */
  isSystem: boolean;
  /** false = đã ẩn: không chọn được cho xe mới, xe cũ vẫn giữ. */
  isActive: boolean;
  displayOrder: number;
}

/** Body POST / PUT /api/rescue-unit-types — PUT bỏ qua `code`. */
export interface UpsertRescueUnitTypeDto {
  code?: string;
  nameVi: string;
  nameEn: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface DispatchPlanUnitDto {
  unitTypeCode: string;
  /** Chỉ có ở response. */
  unitTypeName?: string | null;
  /** 1–5. */
  quantity: number;
  priority?: number | null;
}

export interface DispatchPlanLevelDto {
  severity: DispatchPlanSeverity;
  /** Chỉ có ở response; 0 = mức chưa cấu hình (dùng mức thấp hơn gần nhất). */
  totalUnits?: number;
  units: DispatchPlanUnitDto[];
}

/** GET /api/incident-types (công khai) */
export interface IncidentTypeDto {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  category: IncidentTypeCategory;
  /** AI nhận diện được (nhóm Cháy nổ / Tai nạn) — nhóm Khác không bao giờ được AI tự điều phối. */
  aiRecognizable: boolean;
  isSystem: boolean;
  isActive: boolean;
  displayOrder: number;
  /** Luôn đủ 3 phần tử Level1, Level2, Level3. */
  dispatchPlan: DispatchPlanLevelDto[];
}

/** Body POST / PUT /api/incident-types — PUT bỏ qua `code`; loại hệ thống không đổi được `category`. */
export interface UpsertIncidentTypeDto extends UpsertRescueUnitTypeDto {
  category: IncidentTypeCategory;
}

/** Body PUT /api/incident-types/{id}/dispatch-plan — tổng mỗi mức ≤ 5, một loại xe không lặp trong cùng mức. */
export interface UpdateDispatchPlanDto {
  levels: DispatchPlanLevelDto[];
}

/** Quy tắc mã: chữ cái không dấu, số, `_`, bắt đầu bằng chữ cái, tối đa 50 ký tự; không đổi sau khi tạo. */
export const CATALOG_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,49}$/;
