import type { StaffMission, MissionStatus, DigitalClosureReport } from '../../../types/staff';
import type { DispatchAssignmentResponseDto } from '../../../types/dispatch';
import type { RouteResult } from '../../../services/routingService';

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

/**
 * Chuyển đổi chuỗi base64 (DataURL) từ canvas chữ ký sang đối tượng File để upload lên /api/media/upload
 */
export function dataUrlToFile(dataUrl: string, filename = 'signature.png'): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export function mapAssignmentDtoToMission(
  dto: DispatchAssignmentResponseDto,
  fallbackVehiclePlate?: string,
  routeResult?: RouteResult,
  incidentDetails?: {
    reporterName?: string | null;
    reporterPhone?: string | null;
    verifiedByName?: string | null;
  }
): StaffMission {
  const savedReports = getSavedClosureReports();
  const localClosureReport = savedReports[dto.id] || savedReports[dto.incidentId];

  // Nếu backend trả về completionReport đã nộp, ưu tiên đồng bộ dữ liệu từ server
  let effectiveClosureReport: DigitalClosureReport | undefined = localClosureReport;
  if (dto.completionReport) {
    const cr = dto.completionReport;
    effectiveClosureReport = {
      missionId: dto.id,
      incidentId: dto.incidentId,
      vehiclePlate: dto.rescueUnit?.plateNumber || fallbackVehiclePlate || 'Chưa gán xe',
      teamLeader: cr.signerName || localClosureReport?.teamLeader || 'Chỉ huy kíp xe',
      completedAt: cr.submittedAt || dto.completedAt || new Date().toISOString(),
      actionSummary: cr.actionsSummary || localClosureReport?.actionSummary || '',
      casualtiesTreated: cr.victimsAssistedCount ?? localClosureReport?.casualtiesTreated ?? 0,
      casualtiesHospitalized: localClosureReport?.casualtiesHospitalized ?? 0,
      fireExtinguished: localClosureReport?.fireExtinguished ?? true,
      hazardsNeutralized: localClosureReport?.hazardsNeutralized ?? true,
      resourcesUsed: (cr.equipmentUsed || []).map((eq: string) => {
        const parts = eq.split(':');
        return {
          name: parts[0]?.trim() || eq,
          quantity: 1,
          unit: parts[1]?.trim() || 'Cái',
        };
      }),
      photos: (cr.evidenceMediaUrls || []).map((url: string, idx: number) => ({
        id: `photo-be-${idx}`,
        url,
        category: 'after_action',
        label: `Ảnh nghiệm thu #${idx + 1}`,
        timestamp: new Date(cr.submittedAt || Date.now()).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })),
      handoverEntity: cr.handoverEntity || localClosureReport?.handoverEntity || '',
      handoverContactName: cr.handoverContactName || localClosureReport?.handoverContactName || '',
      handoverContactPhone: cr.handoverContactPhone || localClosureReport?.handoverContactPhone || '',
      handoverNotes: cr.handoverNotes || localClosureReport?.handoverNotes,
      handoverQrData: '',
      signatureDataUrl: localClosureReport?.signatureDataUrl || cr.signatureUrl || '',
      signatureUrl: cr.signatureUrl || localClosureReport?.signatureUrl,
      signerName: cr.signerName || localClosureReport?.signerName,
      signedAt: cr.signedAt || localClosureReport?.signedAt,
      dispatchApprovalStatus: 'verified',
    };
    saveClosureReportLocally(effectiveClosureReport);
  }

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
    callerName: incidentDetails?.reporterName || 'Người dân báo tin',
    callerPhone: incidentDetails?.reporterPhone || '114',
    dispatcherName: incidentDetails?.verifiedByName || 'Điều phối viên CAD',
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
    closureReport: effectiveClosureReport || undefined,
    timeline: [
      {
        id: `tl-disp-${dto.id}`,
        timestamp: new Date(dto.dispatchedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'accepted',
        label: `${incidentDetails?.verifiedByName || 'Tổng đài viên CAD'} điều phối kíp xe ${plate} tới hiện trường`,
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
