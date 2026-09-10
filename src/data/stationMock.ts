import type { MaintenanceStatus, StationAsset, StationRecord } from '../types/station';

export const AREAS = ['Quận 1', 'Quận 3', 'Quận 5', 'Quận 7', 'Bình Thạnh'];

export const stationRecordsSeed: StationRecord[] = [
  {
    id: 'st-1', name: 'Trạm PCCC Quận 1', address: '123 Nguyễn Huệ, Phường Bến Nghé',
    area: 'Quận 1', lat: 10.7769, lng: 106.7009, coverageRadiusKm: 4, status: 'active',
  },
  {
    id: 'st-2', name: 'Trạm Cứu thương Quận 3', address: '45 Võ Văn Tần, Phường 6',
    area: 'Quận 3', lat: 10.7843, lng: 106.6907, coverageRadiusKm: 3.5, status: 'active',
  },
  {
    id: 'st-3', name: 'Trạm PCCC Quận 5', address: '78 Trần Hưng Đạo, Phường 7',
    area: 'Quận 5', lat: 10.7546, lng: 106.6633, coverageRadiusKm: 4.5, status: 'active',
  },
  {
    id: 'st-4', name: 'Trạm CSGT Quận 7', address: '12 Nguyễn Thị Thập, Phường Tân Phú',
    area: 'Quận 7', lat: 10.7325, lng: 106.7217, coverageRadiusKm: 5, status: 'active',
  },
  {
    id: 'st-5', name: 'Trạm Cứu hộ Bình Thạnh', address: '234 Xô Viết Nghệ Tĩnh, Phường 21',
    area: 'Bình Thạnh', lat: 10.8105, lng: 106.7091, coverageRadiusKm: 3, status: 'inactive',
  },
];

const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();

export const stationAssetsSeed: StationAsset[] = [
  { id: 'ast-1', stationId: 'st-1', name: '51D-123.45', category: 'vehicle', type: 'Xe cứu hỏa', maintenanceDueDate: daysFromNow(-5) },
  { id: 'ast-2', stationId: 'st-1', name: '51D-123.46', category: 'vehicle', type: 'Xe cứu hỏa', maintenanceDueDate: daysFromNow(60) },
  { id: 'ast-3', stationId: 'st-1', name: 'Bình chữa cháy CO2 #A12', category: 'equipment', type: 'Bình chữa cháy', maintenanceDueDate: daysFromNow(15) },
  { id: 'ast-4', stationId: 'st-1', name: 'Máy cắt thủy lực #H03', category: 'equipment', type: 'Dụng cụ cứu hộ', maintenanceDueDate: daysFromNow(90) },

  { id: 'ast-5', stationId: 'st-2', name: '51B-234.56', category: 'vehicle', type: 'Xe cứu thương', maintenanceDueDate: daysFromNow(10) },
  { id: 'ast-6', stationId: 'st-2', name: '51B-234.57', category: 'vehicle', type: 'Xe cứu thương', maintenanceDueDate: daysFromNow(45) },
  { id: 'ast-7', stationId: 'st-2', name: 'Cáng cứu thương #C07', category: 'equipment', type: 'Thiết bị y tế', maintenanceDueDate: daysFromNow(-2) },

  { id: 'ast-8', stationId: 'st-3', name: '51D-345.67', category: 'vehicle', type: 'Xe cứu hộ', maintenanceDueDate: daysFromNow(20) },
  { id: 'ast-9', stationId: 'st-3', name: '51D-345.68', category: 'vehicle', type: 'Xe cứu hỏa', maintenanceDueDate: daysFromNow(120) },
  { id: 'ast-10', stationId: 'st-3', name: 'Bình dưỡng khí #O5', category: 'equipment', type: 'Thiết bị hô hấp', maintenanceDueDate: daysFromNow(-12) },

  { id: 'ast-11', stationId: 'st-4', name: '51A-456.78', category: 'vehicle', type: 'Xe cảnh sát', maintenanceDueDate: daysFromNow(25) },
  { id: 'ast-12', stationId: 'st-4', name: '51A-456.79', category: 'vehicle', type: 'Xe cảnh sát', maintenanceDueDate: daysFromNow(200) },

  { id: 'ast-13', stationId: 'st-5', name: '51D-567.89', category: 'vehicle', type: 'Xe cứu hộ', maintenanceDueDate: daysFromNow(5) },
  { id: 'ast-14', stationId: 'st-5', name: '51B-567.90', category: 'vehicle', type: 'Xe cứu thương', maintenanceDueDate: daysFromNow(-1) },
  { id: 'ast-15', stationId: 'st-5', name: 'Đèn pin chiến thuật #L20', category: 'equipment', type: 'Thiết bị chiếu sáng', maintenanceDueDate: daysFromNow(300) },
];

export function getMaintenanceStatus(dueDateIso: string): MaintenanceStatus {
  const daysLeft = (new Date(dueDateIso).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 30) return 'expiring_soon';
  return 'ok';
}

export const MAINTENANCE_META: Record<MaintenanceStatus, { label: string; badgeClass: string }> = {
  ok: { label: 'Còn hạn', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expiring_soon: { label: 'Sắp hết hạn', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue: { label: 'Quá hạn', badgeClass: 'bg-red-50 text-red-700 border-red-200' },
};
