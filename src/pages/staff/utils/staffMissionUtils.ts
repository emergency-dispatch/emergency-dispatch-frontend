import type { StaffMission, MissionStatus, DigitalClosureReport } from '../../types/staff';
import type { DispatchAssignmentResponseDto } from '../../types/dispatch';
import type { RouteResult } from '../../services/routingService';

export const isGuid = (val?: string): boolean =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const STAFF_REPORTS_STORAGE_KEY = 'resq_staff_closure_reports';

export const getSavedClosureReports = (): Record<string, DigitalClosureReport> => {
  try {
    const raw = localStorage.getItem(STAFF_REPORTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveClosureReportLocally = (report: DigitalClosureReport) => {
  try {
    const existing = getSavedClosureReports();
    if (report.missionId) existing[report.missionId] = report;
    if (report.incidentId) existing[report.incidentId] = report;
    localStorage.setItem(STAFF_REPORTS_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('Failed to save closure report to localStorage:', err);
  }
};

export function mapAssignmentDtoToMission(
  dto: DispatchAssignmentResponseDto,
  fallbackVehiclePlate?: string,
  routeResult?: RouteResult
): StaffMission {
  const savedReports = getSavedClosureReports();
  const localClosureReport = savedReports[dto.id] || savedReports[dto.incidentId];

  let missionStatus: MissionStatus = 'accepted';
  if (dto.status === 'EnRoute') missionStatus = 'en_route';
  else if (dto.status === 'OnScene') missionStatus = 'on_scene';
  else if (dto.status === 'Completed' || dto.status === 'Cancelled' || dto.status === 'Rejected') missionStatus = 'completed';
  else if (dto.status === 'Accepted' || dto.status === 'Dispatched') missionStatus = 'accepted';

  let sev: 1 | 2 | 3 = 2;
  const s = String(dto.incidentSeverity).toLowerCase();
  if (s.includes('3') || s.includes('critical') || s.includes('high') || s.includes('level3')) sev = 3;
  else if (s.includes('1') || s.includes('low') || s.includes('level1')) sev = 1;

  const incLat = dto.incidentLat || 10.8441;
  const incLng = dto.incidentLng || 106.8089;
  const vehLat = dto.rescueUnit?.currentLat || incLat - 0.006;
  const vehLng = dto.rescueUnit?.currentLng || incLng - 0.006;

  const plate = dto.rescueUnit?.plateNumber || fallbackVehiclePlate || 'Chưa gán xe';

  return {
    id: dto.id,
    incidentId: dto.incidentId,
    title: dto.incidentTitle || 'Nhiệm vụ cứu hộ khẩn cấp',
    description: dto.notes || 'Lực lượng phản ứng nhanh tiếp cận hiện trường và xử lý cứu hộ.',
    severity: sev,
    hazardTags: ['fire', 'injury'],
    area: dto.rescueUnit?.stationName || 'Khu vực quản lý',
    address: dto.incidentAddress || 'Địa chỉ sự cố đang xử lý',
    incidentLat: incLat,
    incidentLng: incLng,
    callerName: 'Tổng đài viên điều động',
    callerPhone: '114',
    assignedAt: dto.dispatchedAt,
    acceptedAt: dto.acceptedAt || undefined,
    enRouteAt: dto.status === 'EnRoute' || dto.status === 'OnScene' || dto.status === 'Completed' ? dto.dispatchedAt : undefined,
    onSceneAt: dto.arrivedAt || undefined,
    completedAt: dto.completedAt || undefined,
    vehicleId: dto.rescueUnitId,
    vehiclePlate: plate,
    vehicleType: 'fire_truck',
    vehicleLat: vehLat,
    vehicleLng: vehLng,
    status: missionStatus,
    currentStepIndex: 0,
    routeSteps: routeResult?.steps || [],
    routePolyline: routeResult?.polyline || [],
    closureReport: localClosureReport || undefined,
    timeline: [
      {
        id: `tl-disp-${dto.id}`,
        timestamp: new Date(dto.dispatchedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'accepted',
        label: `Tổng đài điều phối kíp xe ${plate} tới hiện trường`,
      },
      ...(dto.acceptedAt ? [{
        id: `tl-acc-${dto.id}`,
        timestamp: new Date(dto.acceptedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'accepted' as MissionStatus,
        label: 'Đội xe đã xác nhận tiếp nhận lệnh',
      }] : []),
      ...(dto.arrivedAt ? [{
        id: `tl-arr-${dto.id}`,
        timestamp: new Date(dto.arrivedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'on_scene' as MissionStatus,
        label: 'Đã tiếp cận hiện trường sự cố',
      }] : []),
      ...(dto.completedAt ? [{
        id: `tl-comp-${dto.id}`,
        timestamp: new Date(dto.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'completed' as MissionStatus,
        label: 'Hoàn tất nghiệm thu & đóng nhiệm vụ',
      }] : []),
    ],
  };
}
