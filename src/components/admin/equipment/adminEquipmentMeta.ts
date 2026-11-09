import { Truck } from 'lucide-react';
import { RESCUE_UNIT_STATUS_META, RESCUE_UNIT_TYPE_META } from '../fleetMeta';
import { STOCK_KEY, isOnDeletedUnit, type EquipmentUnitOption } from '../../equipment/equipmentMeta';
import type { EquipmentDto } from '../../../types/equipment';
import type { RescueUnitResponseDto } from '../../../types/rescueUnit';
import i18n from '../../../i18n';

/** Xe (DTO Admin) → dạng "vị trí đặt" dùng chung với tab Thiết bị của Operator. */
export const rescueUnitToOption = (u: RescueUnitResponseDto): EquipmentUnitOption => ({
  id: u.id,
  plate: u.plateNumber,
  stationId: u.stationId,
  icon: RESCUE_UNIT_TYPE_META[u.unitType]?.icon ?? Truck,
  typeLabel: i18n.t(`enums.unitType.${u.unitType}`, { defaultValue: u.unitTypeName }),
  statusLabel: i18n.t(`enums.unitStatus.${u.status}`, { defaultValue: u.statusName }),
  statusColor: RESCUE_UNIT_STATUS_META[u.status]?.color ?? '#94A3B8',
});

/** Bộ lọc vị trí của trang Admin: kho trạm / trên xe / xe đã bị xóa (cần xử lý). */
export const LOCATION_FILTERS = [STOCK_KEY, 'vehicle', 'deletedUnit'] as const;
export type LocationFilter = (typeof LOCATION_FILTERS)[number];

export function matchesLocation(e: EquipmentDto, location: LocationFilter | ''): boolean {
  switch (location) {
    case STOCK_KEY:
      return !e.rescueUnitId;
    case 'vehicle':
      return !!e.rescueUnitId && !isOnDeletedUnit(e);
    case 'deletedUnit':
      return isOnDeletedUnit(e);
    default:
      return true;
  }
}

export const EQUIPMENT_VIEWS = ['table', 'station'] as const;
export type EquipmentView = (typeof EQUIPMENT_VIEWS)[number];
