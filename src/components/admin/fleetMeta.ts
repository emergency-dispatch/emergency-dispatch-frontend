import type { ComponentType } from 'react';
import { Ambulance, Construction, Ship, ShieldCheck, Truck } from 'lucide-react';
import { FireTruckIcon, type FireTruckIconProps } from '../common/FireTruckIcon';
import { MAP_CENTER, VEHICLE_STATUS_META } from '../../data/liveMapMeta';
import type { RescueUnitStatus, RescueUnitType } from '../../types/rescueUnit';

// Nhãn/icon/màu hiển thị cho Đội xe theo enum backend (không phải dữ liệu mock).
export { MAP_CENTER };

export const RESCUE_UNIT_TYPE_META: Record<RescueUnitType, { label: string; icon: ComponentType<FireTruckIconProps> }> = {
  FireTruck: { label: 'Xe chữa cháy', icon: FireTruckIcon },
  LadderTruck: { label: 'Xe thang', icon: Construction },
  Ambulance: { label: 'Xe cứu thương', icon: Ambulance },
  HeavyRescueVehicle: { label: 'Xe cứu hộ', icon: Truck },
  RescueBoat: { label: 'Cano cứu nạn', icon: Ship },
  PolicePatrol: { label: 'Xe tuần tra', icon: ShieldCheck },
};

export const RESCUE_UNIT_STATUS_META: Record<RescueUnitStatus, { label: string; color: string }> = {
  Available: { label: 'Sẵn sàng', color: VEHICLE_STATUS_META.available.color },
  Dispatched: { label: 'Đã điều động', color: VEHICLE_STATUS_META.en_route.color },
  OnScene: { label: 'Tại hiện trường', color: VEHICLE_STATUS_META.on_scene.color },
  Returning: { label: 'Đang quay về', color: VEHICLE_STATUS_META.accepted.color },
  CoolDown: { label: 'Hồi sức', color: VEHICLE_STATUS_META.recovering.color },
  Maintenance: { label: 'Bảo trì', color: '#D97706' },
  OutOfService: { label: 'Ngừng hoạt động', color: '#94A3B8' },
};
