import type { ComponentType } from 'react';
import { Ambulance, Construction, Ship, ShieldCheck, Truck } from 'lucide-react';
import i18n, { getLanguage } from '../../i18n';
import { FireTruckIcon, type FireTruckIconProps } from '../common/FireTruckIcon';
import { MAP_CENTER, VEHICLE_STATUS_META } from '../../data/liveMapMeta';
import type { RescueUnitStatus, RescueUnitType, SystemRescueUnitType } from '../../types/rescueUnit';
import type { RescueUnitTypeDto } from '../../types/typeCatalog';

// Nhãn/icon/màu hiển thị cho Đội xe theo enum backend (không phải dữ liệu mock).
export { MAP_CENTER };

export const RESCUE_UNIT_TYPE_META: Record<SystemRescueUnitType, { label: string; icon: ComponentType<FireTruckIconProps> }> = {
  FireTruck: { label: 'Xe chữa cháy', icon: FireTruckIcon },
  LadderTruck: { label: 'Xe thang', icon: Construction },
  Ambulance: { label: 'Xe cứu thương', icon: Ambulance },
  HeavyRescueVehicle: { label: 'Xe cứu hộ', icon: Truck },
  RescueBoat: { label: 'Cano cứu nạn', icon: Ship },
  PolicePatrol: { label: 'Xe tuần tra', icon: ShieldCheck },
};

const isSystemUnitType = (code: string): code is SystemRescueUnitType =>
  Object.prototype.hasOwnProperty.call(RESCUE_UNIT_TYPE_META, code);

/** Icon theo mã loại xe; loại Admin tự thêm dùng icon xe tải chung. */
export const unitTypeIcon = (code: RescueUnitType): ComponentType<FireTruckIconProps> =>
  isSystemUnitType(code) ? RESCUE_UNIT_TYPE_META[code].icon : Truck;

/**
 * Tên loại xe theo ngôn ngữ đang chọn: ưu tiên danh mục (Admin có thể đổi tên / thêm loại), chưa có danh mục thì dùng
 * nhãn dịch của 6 loại hệ thống, còn lại hiện nguyên mã.
 */
export function unitTypeLabel(code: RescueUnitType, catalog?: readonly RescueUnitTypeDto[] | null): string {
  const entry = catalog?.find((c) => c.code === code);
  if (entry) return (getLanguage() === 'en' ? entry.nameEn : entry.nameVi) || entry.name || code;
  return isSystemUnitType(code) ? i18n.t(`enums.unitType.${code}`) : code;
}

export const RESCUE_UNIT_STATUS_META: Record<RescueUnitStatus, { label: string; color: string }> = {
  Available: { label: 'Sẵn sàng', color: VEHICLE_STATUS_META.available.color },
  Dispatched: { label: 'Đã điều động', color: VEHICLE_STATUS_META.en_route.color },
  OnScene: { label: 'Tại hiện trường', color: VEHICLE_STATUS_META.on_scene.color },
  Returning: { label: 'Đang quay về', color: VEHICLE_STATUS_META.accepted.color },
  CoolDown: { label: 'Hồi sức', color: VEHICLE_STATUS_META.recovering.color },
  Maintenance: { label: 'Bảo trì', color: '#D97706' },
  OutOfService: { label: 'Ngừng hoạt động', color: '#94A3B8' },
};
