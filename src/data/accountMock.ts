import type { Permission, PermissionMatrix, RoleId, UserAccount } from '../types/account';

export const ROLE_META: Record<RoleId, { label: string; color: string }> = {
  admin: { label: 'Quản trị viên', color: '#8B5CF6' },
  dispatcher: { label: 'Điều hành viên', color: '#2563EB' },
  station_manager: { label: 'Trưởng trạm', color: '#06B6D4' },
  rescue_staff: { label: 'Đội cứu hộ', color: '#10B981' },
  viewer: { label: 'Người xem', color: '#64748B' },
};

export const ROLE_ORDER: RoleId[] = ['admin', 'dispatcher', 'station_manager', 'rescue_staff', 'viewer'];

export const PERMISSIONS: Permission[] = [
  { id: 'view_live_map', label: 'Xem bản đồ trực tiếp', group: 'Command Center' },
  { id: 'dispatch_vehicles', label: 'Điều phối xe cứu hộ', group: 'Command Center' },
  { id: 'review_incidents', label: 'Duyệt / từ chối sự cố', group: 'Command Center' },
  { id: 'view_analytics', label: 'Xem thống kê & báo cáo', group: 'Command Center' },
  { id: 'manage_stations', label: 'Quản lý trạm cứu hộ', group: 'Back-office' },
  { id: 'manage_vehicles', label: 'Quản lý xe & thiết bị', group: 'Back-office' },
  { id: 'manage_accounts', label: 'Quản lý tài khoản', group: 'Back-office' },
  { id: 'manage_permissions', label: 'Cấp quyền hệ thống', group: 'Back-office' },
  { id: 'manage_escalation', label: 'Cấu hình leo thang tự động', group: 'Back-office' },
];

export const defaultPermissionMatrix: PermissionMatrix = {
  admin: Object.fromEntries(PERMISSIONS.map((p) => [p.id, true])),
  dispatcher: {
    view_live_map: true, dispatch_vehicles: true, review_incidents: true, view_analytics: true,
    manage_stations: false, manage_vehicles: false, manage_accounts: false, manage_permissions: false, manage_escalation: false,
  },
  station_manager: {
    view_live_map: true, dispatch_vehicles: false, review_incidents: false, view_analytics: true,
    manage_stations: true, manage_vehicles: true, manage_accounts: false, manage_permissions: false, manage_escalation: false,
  },
  rescue_staff: {
    view_live_map: true, dispatch_vehicles: false, review_incidents: false, view_analytics: false,
    manage_stations: false, manage_vehicles: false, manage_accounts: false, manage_permissions: false, manage_escalation: false,
  },
  viewer: {
    view_live_map: true, dispatch_vehicles: false, review_incidents: false, view_analytics: true,
    manage_stations: false, manage_vehicles: false, manage_accounts: false, manage_permissions: false, manage_escalation: false,
  },
};

export const userAccountsSeed: UserAccount[] = [
  { id: 'u-1', name: 'Phạm Trung Tín', email: 'tin.pham@resq-ai.vn', role: 'dispatcher', stationId: 'st-1', active: true, avatarInitials: 'PT' },
  { id: 'u-2', name: 'Nguyễn Văn An', email: 'an.nguyen@resq-ai.vn', role: 'admin', stationId: null, active: true, avatarInitials: 'NA' },
  { id: 'u-3', name: 'Trần Thị Hạnh', email: 'hanh.tran@resq-ai.vn', role: 'station_manager', stationId: 'st-2', active: true, avatarInitials: 'TH' },
  { id: 'u-4', name: 'Lê Hoàng Nam', email: 'nam.le@resq-ai.vn', role: 'rescue_staff', stationId: 'st-3', active: true, avatarInitials: 'LN' },
  { id: 'u-5', name: 'Phạm Thu Trang', email: 'trang.pham@resq-ai.vn', role: 'rescue_staff', stationId: 'st-4', active: false, avatarInitials: 'PT' },
  { id: 'u-6', name: 'Đỗ Minh Quân', email: 'quan.do@resq-ai.vn', role: 'station_manager', stationId: 'st-5', active: true, avatarInitials: 'DQ' },
  { id: 'u-7', name: 'Vũ Thị Lan', email: 'lan.vu@resq-ai.vn', role: 'dispatcher', stationId: 'st-1', active: true, avatarInitials: 'VL' },
  { id: 'u-8', name: 'Bùi Anh Tuấn', email: 'tuan.bui@resq-ai.vn', role: 'viewer', stationId: null, active: true, avatarInitials: 'BT' },
];
