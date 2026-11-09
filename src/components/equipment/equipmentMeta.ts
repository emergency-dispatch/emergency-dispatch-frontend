import axios from 'axios';
import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FireExtinguisher, HardHat, HeartPulse, LifeBuoy, Package, Radio } from 'lucide-react';
import { normalizeText } from '../../services/admin/listUtils';
import { formatWaitDuration } from '../../utils/incidentFormat';
import i18n from '../../i18n';
import type { EquipmentCategory, EquipmentDto, EquipmentStatus } from '../../types/equipment';

/** Icon + class màu (Tailwind) cho từng nhóm thiết bị. Nhãn: `vehicles.equipment.category.*`. */
export const EQUIPMENT_CATEGORY_META: Record<
  EquipmentCategory,
  { icon: LucideIcon; text: string; bg: string; border: string; activeBg: string }
> = {
  FireFighting: { icon: FireExtinguisher, text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', activeBg: 'bg-red-600' },
  Medical: { icon: HeartPulse, text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', activeBg: 'bg-rose-600' },
  Rescue: { icon: LifeBuoy, text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', activeBg: 'bg-orange-600' },
  Protective: { icon: HardHat, text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', activeBg: 'bg-amber-600' },
  Communication: { icon: Radio, text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200', activeBg: 'bg-sky-600' },
  Other: { icon: Package, text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', activeBg: 'bg-slate-600' },
};

/** Lý do bảo trì gợi ý (key `vehicles.equipment.status.quickReasons.*`) — bấm để điền nhanh. */
export const EQUIPMENT_QUICK_REASONS = ['broken', 'inspection', 'service', 'missingParts'] as const;

/**
 * Một xe có thể giữ thiết bị — dạng chung để Operator (Vehicle của Live Map) và Admin (RescueUnitResponseDto)
 * dùng cùng bảng / form. Nhãn đã dịch sẵn khi tạo.
 */
export interface EquipmentUnitOption {
  id: string;
  plate: string;
  stationId: string;
  icon: ComponentType<{ className?: string }>;
  typeLabel: string;
  statusLabel: string;
  statusColor: string;
}

/** Trạm chọn được trong form (Admin). */
export interface EquipmentStationOption {
  id: string;
  code: string | null;
  name: string;
}

export const stationOptionLabel = (s: EquipmentStationOption) => (s.code ? `${s.code} · ${s.name}` : s.name);

/**
 * Thiết bị gắn xe nhưng backend không còn trả biển số (xe đã bị xóa mềm — navigation bị query filter loại bỏ)
 * → phải chọn vị trí khác mới lưu được (backend 404 với xe đã xóa).
 */
export const isOnDeletedUnit = (e: EquipmentDto) => !!e.rescueUnitId && !e.rescueUnitPlate;

// ---------- Lọc / sắp xếp dùng chung giữa trang Đội xe (Operator) và trang Thiết bị (Admin) ----------

/** Giá trị bộ lọc vị trí cho thiết bị để ở kho trạm (không gắn xe). */
export const STOCK_KEY = 'stock';

export interface EquipmentFilters {
  category: EquipmentCategory | '';
  status: EquipmentStatus | '';
  /** '' = mọi vị trí · STOCK_KEY = kho trạm · id xe. */
  unit: string;
  /** Đã chuẩn hóa bằng normalizeText. */
  query: string;
  /** Chỉ Admin: '' = mọi trạm. */
  station?: string;
}

export type EquipmentFilterKey = keyof EquipmentFilters;

/** `skip`: bỏ qua một tiêu chí — để đếm số trên chip của chính tiêu chí đó (đếm theo các bộ lọc còn lại). */
export function matchesEquipment(e: EquipmentDto, f: EquipmentFilters, skip?: EquipmentFilterKey): boolean {
  if (skip !== 'category' && f.category && e.category !== f.category) return false;
  if (skip !== 'status' && f.status && e.status !== f.status) return false;
  if (skip !== 'unit' && f.unit && (e.rescueUnitId ?? STOCK_KEY) !== f.unit) return false;
  if (skip !== 'station' && f.station && e.stationId !== f.station) return false;
  if (
    skip !== 'query' &&
    f.query &&
    !normalizeText(`${e.name} ${e.notes ?? ''} ${e.statusNote ?? ''} ${e.rescueUnitPlate ?? ''} ${e.stationName ?? ''}`).includes(
      f.query
    )
  )
    return false;
  return true;
}

/** Bảo trì lên đầu (cần xử lý), rồi theo tên. */
export const compareEquipment = (a: EquipmentDto, b: EquipmentDto) =>
  a.status !== b.status ? (a.status === 'Maintenance' ? -1 : 1) : a.name.localeCompare(b.name, 'vi');

/** Backend 404 khi sửa / đổi trạng thái / xóa → thiết bị đã bị xóa ở nơi khác (Admin, Operator khác ca). */
export const isNotFoundError = (err: unknown) => axios.isAxiosError(err) && err.response?.status === 404;

/** "3 ngày trước" kể từ lúc đổi trạng thái; dưới 1 phút → "Vừa xong". */
export function sinceText(iso: string, now: number): string {
  const elapsed = now - new Date(iso).getTime();
  return elapsed < 60_000
    ? i18n.t('common.duration.justNow')
    : i18n.t('vehicles.equipment.since', { duration: formatWaitDuration(elapsed) });
}
