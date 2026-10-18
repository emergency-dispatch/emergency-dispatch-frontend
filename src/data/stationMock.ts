import type { MaintenanceStatus, StationAsset, StationRecord } from '../types/station';

export const AREAS = ['Phân khu 1', 'Phân khu 2', 'Phân khu 3', 'Phân khu 4', 'Cổng an ninh'];

export const stationRecordsSeed: StationRecord[] = [
  {
    id: 'st-1', name: 'Trạm PCCC Khu Công nghệ cao', address: 'Lô I-1, Đường D1, Phân khu 1',
    area: 'Phân khu 1', lat: 10.8452, lng: 106.7955, coverageRadiusKm: 5, status: 'active',
  },
  {
    id: 'st-2', name: 'Trạm Y tế – Cấp cứu Khu CNC', address: 'Lô T2, Đường D2, Phân khu 2',
    area: 'Phân khu 2', lat: 10.8381, lng: 106.8048, coverageRadiusKm: 4.5, status: 'active',
  },
  {
    id: 'st-3', name: 'Trạm PCCC & CNCH Long Thạnh Mỹ', address: 'Lô E2, Đường D3, Phân khu 3',
    area: 'Phân khu 3', lat: 10.8468, lng: 106.8172, coverageRadiusKm: 5, status: 'active',
  },
  {
    id: 'st-4', name: 'Trạm Cứu hộ Tăng Nhơn Phú', address: 'Đường Võ Chí Công, Phân khu 4',
    area: 'Phân khu 4', lat: 10.8306, lng: 106.7878, coverageRadiusKm: 4, status: 'active',
  },
  {
    id: 'st-5', name: 'Chốt An ninh & Tuần tra Cổng chính', address: 'Cổng 1, Xa lộ Hà Nội, Khu CNC',
    area: 'Cổng an ninh', lat: 10.8520, lng: 106.7910, coverageRadiusKm: 3, status: 'active',
  },
];

const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();

export const stationAssetsSeed: StationAsset[] = [
  { id: 'ast-1', stationId: 'st-1', name: '51D-123.45', category: 'vehicle', type: 'Xe chữa cháy mini', maintenanceDueDate: daysFromNow(-5) },
  { id: 'ast-2', stationId: 'st-1', name: '51D-123.46', category: 'vehicle', type: 'Xe cứu hỏa KCN', maintenanceDueDate: daysFromNow(60) },
  { id: 'ast-3', stationId: 'st-1', name: 'Bình bọt chữa cháy AFFF 50L', category: 'equipment', type: 'Bình chữa cháy bọt', maintenanceDueDate: daysFromNow(15) },
  { id: 'ast-4', stationId: 'st-1', name: 'Máy cắt thủy lực Holmatro', category: 'equipment', type: 'Kìm banh cứu hộ', maintenanceDueDate: daysFromNow(90) },

  { id: 'ast-5', stationId: 'st-2', name: '51B-234.56', category: 'vehicle', type: 'Xe cứu thương KCN', maintenanceDueDate: daysFromNow(10) },
  { id: 'ast-6', stationId: 'st-2', name: '51B-234.57', category: 'vehicle', type: 'Xe cấp cứu nội khu', maintenanceDueDate: daysFromNow(45) },
  { id: 'ast-7', stationId: 'st-2', name: 'Cáng cứu thương đa năng #C02', category: 'equipment', type: 'Thiết bị y tế', maintenanceDueDate: daysFromNow(-2) },

  { id: 'ast-8', stationId: 'st-3', name: '51D-345.67', category: 'vehicle', type: 'Xe cứu hộ công nghiệp', maintenanceDueDate: daysFromNow(20) },
  { id: 'ast-9', stationId: 'st-3', name: '51D-345.68', category: 'vehicle', type: 'Xe cứu thương KCN', maintenanceDueDate: daysFromNow(120) },
  { id: 'ast-10', stationId: 'st-3', name: 'Máy đo khí độc công nghiệp đa chỉ tiêu', category: 'equipment', type: 'Thiết bị an toàn khí', maintenanceDueDate: daysFromNow(-12) },

  { id: 'ast-11', stationId: 'st-4', name: '51A-456.78', category: 'vehicle', type: 'Xe tuần tra an ninh', maintenanceDueDate: daysFromNow(25) },
  { id: 'ast-12', stationId: 'st-4', name: '51A-456.79', category: 'vehicle', type: 'Xe tuần tra cơ động', maintenanceDueDate: daysFromNow(200) },

  { id: 'ast-13', stationId: 'st-5', name: '51D-567.89', category: 'vehicle', type: 'Xe tuần tra cổng an ninh', maintenanceDueDate: daysFromNow(5) },
  { id: 'ast-14', stationId: 'st-5', name: 'Rào chắn & biển phân luồng khẩn cấp', category: 'equipment', type: 'Phân luồng chống ùn tắc', maintenanceDueDate: daysFromNow(180) },
  { id: 'ast-15', stationId: 'st-5', name: 'Đèn tín hiệu & loa phát thanh di động', category: 'equipment', type: 'Thiết bị điều tiết', maintenanceDueDate: daysFromNow(300) },
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
