import type { ComponentType } from 'react';
import { Ambulance, ShieldCheck, Truck } from 'lucide-react';
import { FireTruckIcon, type FireTruckIconProps } from '../components/common/FireTruckIcon';
import type { DispatchVehicleType, Station, Vehicle, VehicleStatus, VehicleType } from '../types/vehicle';

export const VEHICLE_STATUS_META: Record<VehicleStatus, { label: string; color: string }> = {
  available: { label: 'Sẵn sàng', color: '#10B981' },
  awaiting_ack: { label: 'Chờ xác nhận', color: '#A855F7' },
  accepted: { label: 'Đã nhận', color: '#0EA5E9' },
  en_route: { label: 'Đang di chuyển', color: '#2563EB' },
  on_scene: { label: 'Tại hiện trường', color: '#F97316' },
  recovering: { label: 'Hồi sức', color: '#64748B' },
};

// Mô phỏng phản hồi của đội cứu hộ (thay cho Staff App khi chưa nối backend).
// Mặc định đội chấp nhận sau vài giây; một số xe được cài sẵn để demo ca từ chối / quá hạn 120s.
export type MockCrewResponse =
  | { kind: 'accept'; afterMs: number }
  | { kind: 'reject'; afterMs: number; reason: string }
  | { kind: 'ignore' };

export const DEFAULT_CREW_RESPONSE: MockCrewResponse = { kind: 'accept', afterMs: 6000 };

export const MOCK_CREW_RESPONSES: Record<string, MockCrewResponse> = {
  'veh-5': { kind: 'reject', afterMs: 8000, reason: 'Xe đang kiểm tra hệ thống phanh, không thể xuất phát' },
  'veh-9': { kind: 'ignore' },
};

// Thời gian đội làm việc tại hiện trường trước khi nộp báo cáo kết thúc (mock).
export const MOCK_ON_SCENE_DURATION_MS = 40 * 1000;

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

export const stations: Station[] = [
  { id: 'st-1', name: 'Trạm PCCC Khu Công nghệ cao', area: 'Phân khu 1', lat: 10.8452, lng: 106.7955, vehicleIds: ['veh-1', 'veh-2', 'veh-3'] },
  { id: 'st-2', name: 'Trạm Y tế – Cấp cứu Khu CNC', area: 'Phân khu 2', lat: 10.8381, lng: 106.8048, vehicleIds: ['veh-4', 'veh-5'] },
  { id: 'st-3', name: 'Trạm PCCC & CNCH Long Thạnh Mỹ', area: 'Phân khu 3', lat: 10.8468, lng: 106.8172, vehicleIds: ['veh-6', 'veh-7'] },
  { id: 'st-4', name: 'Trạm Cứu hộ Tăng Nhơn Phú', area: 'Phân khu 4', lat: 10.8306, lng: 106.7878, vehicleIds: ['veh-8', 'veh-9', 'veh-10'] },
];

// `target` simulates the incident coordinate an en-route vehicle is streaming toward over SignalR.
export interface VehicleSeed extends Vehicle {
  target?: { lat: number; lng: number };
}

export const vehicleSeeds: VehicleSeed[] = [
  {
    id: 'veh-1', plate: '51D-123.45', type: 'fire_truck', status: 'on_scene', driver: 'Nguyễn Văn An',
    stationId: 'st-1', area: 'Phân khu 1', lat: 10.8429, lng: 106.8001, heading: 45, etaMinutes: null,
    incidentId: 'inc-2041', lastUpdated: new Date().toISOString(),
  },
  {
    id: 'veh-2', plate: '51D-123.46', type: 'fire_truck', status: 'available', driver: 'Trần Văn Bình',
    stationId: 'st-1', area: 'Phân khu 1', lat: 10.8452, lng: 106.7955, heading: 0, etaMinutes: null,
    incidentId: null, lastUpdated: new Date().toISOString(),
  },
  {
    id: 'veh-3', plate: '51D-123.47', type: 'rescue', status: 'available', driver: 'Lê Hoàng Cường',
    stationId: 'st-1', area: 'Phân khu 1', lat: 10.8455, lng: 106.7960, heading: 0, etaMinutes: null,
    incidentId: null, lastUpdated: new Date().toISOString(),
  },
  {
    id: 'veh-4', plate: '51B-234.56', type: 'ambulance', status: 'en_route', driver: 'Lê Thị Cẩm',
    stationId: 'st-2', area: 'Phân khu 2', lat: 10.8390, lng: 106.8060, heading: 60, etaMinutes: 5,
    incidentId: 'inc-2039', lastUpdated: new Date().toISOString(),
    target: { lat: 10.8420, lng: 106.8105 },
  },
  {
    id: 'veh-5', plate: '51B-234.57', type: 'ambulance', status: 'available', driver: 'Phạm Thị Dung',
    stationId: 'st-2', area: 'Phân khu 2', lat: 10.8381, lng: 106.8048, heading: 0, etaMinutes: null,
    incidentId: null, lastUpdated: new Date().toISOString(),
  },
  {
    id: 'veh-6', plate: '51D-345.67', type: 'fire_truck', status: 'available', driver: 'Hoàng Văn Em',
    stationId: 'st-3', area: 'Phân khu 3', lat: 10.8468, lng: 106.8172, heading: 0, etaMinutes: null,
    incidentId: null, lastUpdated: new Date().toISOString(),
  },
  {
    id: 'veh-7', plate: '51B-345.68', type: 'ambulance', status: 'en_route', driver: 'Vũ Thị Giang',
    stationId: 'st-3', area: 'Phân khu 3', lat: 10.8460, lng: 106.8150, heading: 230, etaMinutes: 4,
    incidentId: 'inc-2041', lastUpdated: new Date().toISOString(),
    target: { lat: 10.8429, lng: 106.8001 },
  },
  {
    id: 'veh-8', plate: '51D-456.78', type: 'rescue', status: 'on_scene', driver: 'Đặng Văn Hải',
    stationId: 'st-4', area: 'Phân khu 4', lat: 10.8335, lng: 106.7952, heading: 300, etaMinutes: null,
    incidentId: 'inc-2035', lastUpdated: new Date().toISOString(),
  },
  {
    id: 'veh-9', plate: '51B-456.79', type: 'ambulance', status: 'available', driver: 'Bùi Thị Kim',
    stationId: 'st-4', area: 'Phân khu 4', lat: 10.8306, lng: 106.7878, heading: 0, etaMinutes: null,
    incidentId: null, lastUpdated: new Date().toISOString(),
  },
  {
    id: 'veh-10', plate: '51D-567.90', type: 'fire_truck', status: 'available', driver: 'Đinh Văn Long',
    stationId: 'st-4', area: 'Phân khu 4', lat: 10.8302, lng: 106.7885, heading: 0, etaMinutes: null,
    incidentId: null, lastUpdated: new Date().toISOString(),
  },
];
