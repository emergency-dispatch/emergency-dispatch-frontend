import type { ComponentType } from 'react';
import { Ambulance, ShieldCheck, Truck } from 'lucide-react';
import { FireTruckIcon, type FireTruckIconProps } from '../components/common/FireTruckIcon';
import type { DispatchVehicleType, VehicleStatus, VehicleType } from '../types/vehicle';

export const VEHICLE_STATUS_META: Record<VehicleStatus, { label: string; color: string }> = {
  available: { label: 'Sẵn sàng', color: '#10B981' },
  awaiting_ack: { label: 'Chờ đội xác nhận', color: '#A855F7' },
  accepted: { label: 'Đã nhận', color: '#0EA5E9' },
  en_route: { label: 'Đang di chuyển', color: '#2563EB' },
  on_scene: { label: 'Tại hiện trường', color: '#F97316' },
  recovering: { label: 'Hồi sức', color: '#64748B' },
  unavailable: { label: 'Bảo trì', color: '#D97706' },
};

// A shared shape covering both lucide-react icons and the hand-drawn FireTruckIcon
// (lucide has no dedicated fire-truck glyph) so both plug into the same meta map.
type VehicleTypeIconComponent = ComponentType<FireTruckIconProps>;

export const VEHICLE_TYPE_META: Record<VehicleType, { label: string; icon: VehicleTypeIconComponent }> = {
  ambulance: { label: 'Xe cứu thương', icon: Ambulance },
  fire_truck: { label: 'Xe cứu hỏa', icon: FireTruckIcon },
  police: { label: 'Xe cảnh sát', icon: ShieldCheck },
  rescue: { label: 'Xe cứu hộ', icon: Truck },
};

// Loại xe Operator điều phối (VEHICLE_TYPE_META vẫn giữ 'police' cho trang Admin).
export const DISPATCH_VEHICLE_TYPES: DispatchVehicleType[] = ['fire_truck', 'ambulance', 'rescue'];

// Khu Công nghệ cao TP. HCM (TP. Thủ Đức) — bối cảnh triển khai của đề tài.
export const MAP_CENTER: [number, number] = [10.8405, 106.8035];
