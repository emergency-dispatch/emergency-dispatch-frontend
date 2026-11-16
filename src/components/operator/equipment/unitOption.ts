import { VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../../data/liveMapMeta';
import type { EquipmentUnitOption } from '../../equipment/equipmentMeta';
import type { Vehicle } from '../../../types/vehicle';
import i18n from '../../../i18n';

/**
 * Xe của Live Map → dạng "vị trí đặt" dùng chung với trang Thiết bị của Admin.
 * `unitTypeLabel`: tên loại xe theo danh mục (store) — loại Admin tự thêm không có nhãn dịch.
 */
export const vehicleToUnitOption = (v: Vehicle, unitTypeLabel: (code: string) => string): EquipmentUnitOption => ({
  id: v.id,
  plate: v.plate,
  stationId: v.stationId,
  icon: VEHICLE_TYPE_META[v.type].icon,
  typeLabel: unitTypeLabel(v.unitType),
  statusLabel: i18n.t(`enums.vehicleStatus.${v.status}`),
  statusColor: VEHICLE_STATUS_META[v.status].color,
});
