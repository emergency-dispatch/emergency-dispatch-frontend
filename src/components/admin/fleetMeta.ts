import { DISPATCH_VEHICLE_TYPES, MAP_CENTER, VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../data/liveMapMock';
import type { AdminVehicleStatus } from '../../types/adminFleet';

// Nhãn/icon/màu dùng chung với Live Map (chỉ là meta hiển thị, không phải dữ liệu mock).
export { MAP_CENTER, VEHICLE_TYPE_META };

/** Admin chỉ quản lý 3 chủng loại xe: cứu hỏa / cứu thương / cứu hộ. */
export const ADMIN_VEHICLE_TYPES = DISPATCH_VEHICLE_TYPES;

export const ADMIN_VEHICLE_STATUS_META: Record<AdminVehicleStatus, { label: string; color: string }> = {
  ...VEHICLE_STATUS_META,
  maintenance: { label: 'Bảo trì', color: '#D97706' },
  out_of_service: { label: 'Ngừng hoạt động', color: '#94A3B8' },
};

export const ADMIN_VEHICLE_STATUS_ORDER: AdminVehicleStatus[] = [
  'available',
  'awaiting_ack',
  'accepted',
  'en_route',
  'on_scene',
  'recovering',
  'maintenance',
  'out_of_service',
];

// Phân khu của Khu Công nghệ cao (trùng với `area` của trạm/xe trên Live Map).
export const STATION_AREAS = ['Phân khu 1', 'Phân khu 2', 'Phân khu 3', 'Phân khu 4'];
