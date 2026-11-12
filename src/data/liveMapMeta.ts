import type { ComponentType } from 'react';
import { Ambulance, ShieldCheck, Truck } from 'lucide-react';
import { FireTruckIcon, type FireTruckIconProps } from '../components/common/FireTruckIcon';
import type { DispatchVehicleType, VehicleStatus, VehicleType } from '../types/vehicle';
import type { IncidentCategory, SeverityLevel } from '../types/incident';

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

// §20/§24: màu điểm ùn tắc theo trạng thái — chưa có đội (cam), đang có đội giải tỏa (xanh dương),
// tê liệt quá ngưỡng chưa có đội (viền đỏ nhấp nháy).
export const TRAFFIC_JAM_STATUS_COLOR = {
  active: '#EA580C',
  assigned: '#2563EB',
  escalated: '#DC2626',
} as const;

/**
 * Màu marker kiểu "Quầng sáng" của Live Map Operator (lõi tối + vòng màu + quầng sáng), dùng trong glowMarkers.ts.
 * Màu chính của loại sự cố / trạng thái xe vẫn lấy từ INCIDENT_CATEGORY_META / VEHICLE_STATUS_META;
 * ở đây là các tông sáng để hình bên trong và vòng cấp độ nổi trên lõi tối.
 */
export const GLOW_MARKER_COLORS: {
  core: string;
  arcIdle: string;
  categoryGlyph: Record<IncidentCategory, string>;
  severityArc: Record<SeverityLevel, string>;
  station: { mine: string; mineHalo: string; other: string };
  trafficJam: Record<'active' | 'assigned' | 'escalated', { ring: string; glyph: string }>;
  pulse: string;
} = {
  core: '#0F172A',
  arcIdle: 'rgba(203,213,225,0.75)',
  categoryGlyph: { fire: '#FF7A6E', accident: '#FDBA74', unknown: '#FF7A6E' },
  severityArc: { 1: '#34D399', 2: '#FBBF24', 3: '#F87171' },
  station: { mine: '#F87171', mineHalo: '#DC2626', other: '#CBD5E1' },
  trafficJam: {
    active: { ring: '#FB923C', glyph: '#FDBA74' },
    assigned: { ring: '#60A5FA', glyph: '#93C5FD' },
    escalated: { ring: '#F87171', glyph: '#FCA5A5' },
  },
  pulse: '#DC2626',
};

// Khu Công nghệ cao TP. HCM (TP. Thủ Đức) — bối cảnh triển khai của đề tài.
export const MAP_CENTER: [number, number] = [10.8405, 106.8035];
