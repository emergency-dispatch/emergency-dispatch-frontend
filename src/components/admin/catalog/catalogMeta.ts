import type { ComponentType } from 'react';
import {
  Ambulance,
  Biohazard,
  Building2,
  CarFront,
  Construction,
  Droplets,
  FlaskConical,
  Flame,
  HeartPulse,
  Mountain,
  Ship,
  ShieldCheck,
  Tag,
  TreePine,
  TriangleAlert,
  Truck,
  Wind,
  Zap,
} from 'lucide-react';
import { FireTruckIcon } from '../../common/FireTruckIcon';
import i18n, { getLanguage } from '../../../i18n';
import {
  CATALOG_CODE_PATTERN,
  type DispatchPlanLevelDto,
  type DispatchPlanSeverity,
  type IncidentTypeCategory,
  type IncidentTypeDto,
  type RescueUnitTypeDto,
} from '../../../types/typeCatalog';

// Danh mục loại xe / loại sự cố (FE_MOBILE_HANDOFF §31–32): icon, nhóm, kiểm tra form, bản nháp kế hoạch điều xe.

type IconComponent = ComponentType<{ className?: string }>;

/**
 * Mã icon lưu ở backend (chuỗi tự do ≤ 50 ký tự, mobile dùng chung) → icon hiển thị trên web.
 * Gồm các mã seed sẵn (ambulance, fire-truck, ladder, boat, crane, patrol, fire, car-crash, alert, water) và vài mã bổ sung.
 */
export const CATALOG_ICONS: Record<string, IconComponent> = {
  ambulance: Ambulance,
  'fire-truck': FireTruckIcon,
  ladder: Construction,
  boat: Ship,
  crane: Truck,
  patrol: ShieldCheck,
  truck: Truck,
  fire: Flame,
  'car-crash': CarFront,
  alert: TriangleAlert,
  water: Droplets,
  electric: Zap,
  chemical: FlaskConical,
  biohazard: Biohazard,
  building: Building2,
  landslide: Mountain,
  storm: Wind,
  tree: TreePine,
  medical: HeartPulse,
};

export const CATALOG_ICON_KEYS = Object.keys(CATALOG_ICONS);

/** Icon của một dòng danh mục; mã lạ / bỏ trống → icon nhãn chung. */
export const catalogIcon = (key: string | null | undefined): IconComponent =>
  (key && CATALOG_ICONS[key]) || Tag;

/** Tên theo ngôn ngữ đang chọn (không dùng `name` vì đó là tên theo Accept-Language lúc gọi API). */
export const catalogName = (entry: Pick<RescueUnitTypeDto, 'nameVi' | 'nameEn' | 'name' | 'code'>) =>
  (getLanguage() === 'en' ? entry.nameEn : entry.nameVi) || entry.name || entry.code;

/** Màu hợp lệ (#RGB / #RRGGBB) mới dùng để tô; còn lại dùng màu trung tính. */
export const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const catalogColor = (color: string | null | undefined) =>
  color && HEX_COLOR_PATTERN.test(color) ? color : '#64748B';

export const INCIDENT_TYPE_CATEGORIES: IncidentTypeCategory[] = ['FireExplosion', 'TrafficAccident', 'Other'];

// ---------------------------------------------------------------------------
// Form thêm / sửa (dùng chung loại xe + loại sự cố)
// ---------------------------------------------------------------------------

/** Giới hạn độ dài của UpsertRescueUnitTypeDto / UpsertIncidentTypeDto. */
export const CATALOG_LIMITS = { name: 100, description: 500 } as const;

export interface CatalogFormDraft {
  code: string;
  nameVi: string;
  nameEn: string;
  description: string;
  icon: string;
  color: string;
  displayOrder: string;
  isActive: boolean;
  category: IncidentTypeCategory;
}

export type CatalogFormErrors = Partial<Record<'code' | 'nameVi' | 'nameEn' | 'description' | 'color' | 'displayOrder', string>>;

export const catalogToDraft = (entry: RescueUnitTypeDto | IncidentTypeDto | null, nextOrder: number): CatalogFormDraft => ({
  code: entry?.code ?? '',
  nameVi: entry?.nameVi ?? '',
  nameEn: entry?.nameEn ?? '',
  description: entry?.description ?? '',
  icon: entry?.icon ?? '',
  color: entry?.color ?? '',
  displayOrder: String(entry?.displayOrder ?? nextOrder),
  isActive: entry?.isActive ?? true,
  category: entry && 'category' in entry ? entry.category : 'Other',
});

/** Bản nháp → body POST / PUT (chuỗi rỗng → null; PUT bỏ qua `code`). */
export const draftToUpsert = (d: CatalogFormDraft) => ({
  code: d.code.trim(),
  nameVi: d.nameVi.trim(),
  nameEn: d.nameEn.trim(),
  description: d.description.trim() || null,
  icon: d.icon || null,
  color: d.color.trim() || null,
  isActive: d.isActive,
  displayOrder: Number(d.displayOrder),
  category: d.category,
});

/** PUT ghi đè cả object → ẩn / dùng lại phải gửi lại đủ các trường đang có. */
export const entryToUpsert = (entry: RescueUnitTypeDto | IncidentTypeDto, isActive: boolean) => ({
  nameVi: entry.nameVi,
  nameEn: entry.nameEn,
  description: entry.description,
  icon: entry.icon,
  color: entry.color,
  isActive,
  displayOrder: entry.displayOrder,
  category: 'category' in entry ? entry.category : 'Other',
});

export function validateCatalogDraft(d: CatalogFormDraft, isNew: boolean): CatalogFormErrors {
  const errors: CatalogFormErrors = {};
  const tooLong = (max: number) => i18n.t('admin.catalog.validation.tooLong', { max });
  if (isNew && !CATALOG_CODE_PATTERN.test(d.code.trim())) errors.code = i18n.t('admin.catalog.validation.code');
  if (!d.nameVi.trim()) errors.nameVi = i18n.t('admin.catalog.validation.nameRequired');
  else if (d.nameVi.trim().length > CATALOG_LIMITS.name) errors.nameVi = tooLong(CATALOG_LIMITS.name);
  if (!d.nameEn.trim()) errors.nameEn = i18n.t('admin.catalog.validation.nameRequired');
  else if (d.nameEn.trim().length > CATALOG_LIMITS.name) errors.nameEn = tooLong(CATALOG_LIMITS.name);
  if (d.description.trim().length > CATALOG_LIMITS.description) errors.description = tooLong(CATALOG_LIMITS.description);
  if (d.color.trim() && !HEX_COLOR_PATTERN.test(d.color.trim())) errors.color = i18n.t('admin.catalog.validation.color');
  const order = Number(d.displayOrder);
  if (d.displayOrder.trim() === '' || !Number.isInteger(order) || order < 0) {
    errors.displayOrder = i18n.t('admin.catalog.validation.displayOrder');
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Kế hoạch điều xe theo mức (§32)
// ---------------------------------------------------------------------------

export const PLAN_LEVELS: DispatchPlanSeverity[] = ['Level1', 'Level2', 'Level3'];
/** BR-14: tổng số xe mỗi mức tối đa 5; mỗi loại 1–5 xe. */
export const MAX_UNITS_PER_LEVEL = 5;

export const levelNumber = (level: DispatchPlanSeverity) => PLAN_LEVELS.indexOf(level) + 1;

export interface PlanRowDraft {
  /** Khóa React ổn định khi đổi thứ tự / xóa dòng. */
  key: string;
  unitTypeCode: string;
  quantity: number;
}

export type PlanDraft = Record<DispatchPlanSeverity, PlanRowDraft[]>;

let rowSeq = 0;
export const newPlanRowKey = () => `row-${++rowSeq}`;

export function planToDraft(plan: DispatchPlanLevelDto[]): PlanDraft {
  const draft: PlanDraft = { Level1: [], Level2: [], Level3: [] };
  for (const level of plan) {
    if (!(level.severity in draft)) continue;
    // Thứ tự trong danh sách = thứ tự ưu tiên khi thiếu xe.
    draft[level.severity] = [...level.units]
      .sort((a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER))
      .map((u) => ({ key: newPlanRowKey(), unitTypeCode: u.unitTypeCode, quantity: u.quantity }));
  }
  return draft;
}

/** Luôn gửi đủ 3 mức; mức rỗng = chưa cấu hình. Ưu tiên = vị trí trong danh sách. */
export const draftToPlan = (draft: PlanDraft): DispatchPlanLevelDto[] =>
  PLAN_LEVELS.map((severity) => ({
    severity,
    units: draft[severity].map((r, i) => ({ unitTypeCode: r.unitTypeCode, quantity: r.quantity, priority: i + 1 })),
  }));

export const levelTotal = (rows: PlanRowDraft[]) => rows.reduce((sum, r) => sum + r.quantity, 0);

/** Lỗi theo mức (cùng quy tắc với TypeCatalogService.UpdateDispatchPlanAsync). */
export function validatePlanDraft(draft: PlanDraft): Partial<Record<DispatchPlanSeverity, string>> {
  const errors: Partial<Record<DispatchPlanSeverity, string>> = {};
  for (const level of PLAN_LEVELS) {
    const rows = draft[level];
    const codes = rows.map((r) => r.unitTypeCode);
    if (rows.some((r) => !r.unitTypeCode)) errors[level] = i18n.t('admin.catalog.plan.errors.missingType');
    else if (new Set(codes).size !== codes.length) errors[level] = i18n.t('admin.catalog.plan.errors.duplicate');
    else if (rows.some((r) => !Number.isInteger(r.quantity) || r.quantity < 1 || r.quantity > MAX_UNITS_PER_LEVEL)) {
      errors[level] = i18n.t('admin.catalog.plan.errors.quantity', { max: MAX_UNITS_PER_LEVEL });
    } else if (levelTotal(rows) > MAX_UNITS_PER_LEVEL) {
      errors[level] = i18n.t('admin.catalog.plan.errors.total', { max: MAX_UNITS_PER_LEVEL });
    }
  }
  return errors;
}

/**
 * Mức đang trống thì backend dùng mức nào (DispatchScoring.ApplicableRules): mức thấp hơn gần nhất đã cấu hình;
 * không có thì mức thấp nhất đã cấu hình; không mức nào có thì null (dùng giới hạn cũ).
 */
export function fallbackLevel(draft: PlanDraft, level: DispatchPlanSeverity): DispatchPlanSeverity | null {
  const configured = PLAN_LEVELS.filter((l) => draft[l].length > 0);
  if (configured.length === 0) return null;
  const lower = configured.filter((l) => levelNumber(l) <= levelNumber(level));
  return lower.length > 0 ? lower[lower.length - 1] : configured[0];
}

/** Tóm tắt "1 · 2 · 5" (tổng xe từng mức) cho bảng; mức trống hiện "—". */
export const planSummary = (plan: DispatchPlanLevelDto[]) =>
  PLAN_LEVELS.map((severity) => {
    const level = plan.find((l) => l.severity === severity);
    const total = level?.totalUnits ?? level?.units.reduce((s, u) => s + u.quantity, 0) ?? 0;
    return { severity, total };
  });
