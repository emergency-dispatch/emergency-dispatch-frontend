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
    const sanitizedReport: DigitalClosureReport = {
      ...report,
      signatureDataUrl: report.signatureUrl ? '' : report.signatureDataUrl,
    };
    if (report.missionId) existing[report.missionId] = sanitizedReport;
    if (report.incidentId) existing[report.incidentId] = sanitizedReport;
    localStorage.setItem(STAFF_REPORTS_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('Failed to save closure report to localStorage:', err);
    try {
      const existing = getSavedClosureReports();
      const pruned: DigitalClosureReport = {
        ...report,
        photos: (report.photos || []).filter((p) => !p.url.startsWith('data:image')),
        signatureDataUrl: '',
      };
      if (report.missionId) existing[report.missionId] = pruned;
      if (report.incidentId) existing[report.incidentId] = pruned;
      localStorage.setItem(STAFF_REPORTS_STORAGE_KEY, JSON.stringify(existing));
    } catch (fallbackErr) {
      console.warn('Fallback save also failed:', fallbackErr);
    }
  }
};

/**
 * Chuyển đổi CompletionReportDto từ Backend sang DigitalClosureReport của Frontend
 */
export function mapCompletionReportDtoToClosureReport(
  cr: any,
  missionId: string,
  incidentId: string,
  fallbackPlate?: string,
  existingLocal?: DigitalClosureReport
): DigitalClosureReport {
  const actionsSummary =
    cr.actionsSummary ||
    cr.ActionsSummary ||
    cr.resolutionSummary ||
    existingLocal?.actionSummary ||
    '';
  const victimsCount =
    cr.victimsAssistedCount ??
    cr.VictimsAssistedCount ??
    existingLocal?.casualtiesTreated ??
    0;
  const eqList = cr.equipmentUsed || cr.EquipmentUsed || [];
  const mediaUrls = cr.evidenceMediaUrls || cr.EvidenceMediaUrls || cr.mediaUrls || [];
  const handoverEnt = cr.handoverEntity || cr.HandoverEntity || existingLocal?.handoverEntity || '';
  const handoverContact = cr.handoverContactName || cr.HandoverContactName || existingLocal?.handoverContactName || '';
  const handoverPhone = cr.handoverContactPhone || cr.HandoverContactPhone || existingLocal?.handoverContactPhone || '';
  const handoverNote = cr.handoverNotes || cr.HandoverNotes || existingLocal?.handoverNotes;
  const sigUrl = cr.signatureUrl || cr.SignatureUrl || existingLocal?.signatureUrl || '';
  const signer = cr.signerName || cr.SignerName || existingLocal?.signerName || 'Chỉ huy kíp xe';
  const signedDate = cr.signedAt || cr.SignedAt || existingLocal?.signedAt;
  const submittedDate = cr.submittedAt || cr.SubmittedAt || existingLocal?.completedAt || new Date().toISOString();

  return {
    missionId,
    incidentId,
    vehiclePlate: fallbackPlate || existingLocal?.vehiclePlate || 'Chưa gán xe',
    teamLeader: signer,
    completedAt: submittedDate,
    actionSummary: actionsSummary,
    casualtiesTreated: victimsCount,
    casualtiesHospitalized: existingLocal?.casualtiesHospitalized ?? 0,
    fireExtinguished: existingLocal?.fireExtinguished ?? true,
    hazardsNeutralized: existingLocal?.hazardsNeutralized ?? true,
    resourcesUsed: Array.isArray(eqList) && eqList.length > 0
      ? eqList.map((eq: string) => {
          const parts = eq.split(':');
          return {
            name: parts[0]?.trim() || eq,
            quantity: 1,
            unit: parts[1]?.trim() || 'Cái',
          };
        })
      : existingLocal?.resourcesUsed || [],
    photos: Array.isArray(mediaUrls) && mediaUrls.length > 0
      ? mediaUrls.map((url: string, idx: number) => ({
          id: `photo-be-${idx}`,
          url,
          category: 'after_action',
          label: `Ảnh nghiệm thu #${idx + 1}`,
          timestamp: new Date(submittedDate).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }))
      : existingLocal?.photos || [],
    handoverEntity: handoverEnt,
    handoverContactName: handoverContact,
    handoverContactPhone: handoverPhone,
    handoverNotes: handoverNote,
    handoverQrData: '',
    signatureDataUrl: existingLocal?.signatureDataUrl || sigUrl,
    signatureUrl: sigUrl,
    signerName: signer,
    signedAt: signedDate,
    dispatchApprovalStatus: 'verified',
  };
}

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

/**
 * Tính khoảng cách trắc địa đường chim bay giữa 2 điểm GPS (lat/lng) theo công thức Haversine (đơn vị: km)
 */
export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Bán kính trái đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function mapAssignmentDtoToMission(
  dto: DispatchAssignmentResponseDto,
  fallbackVehiclePlate?: string,
  routeResult?: RouteResult,
  incidentDetails?: {
    reporterName?: string | null;
    reporterPhone?: string | null;
    verifiedByName?: string | null;
  },
  existingMission?: StaffMission
): StaffMission {
  const savedReports = getSavedClosureReports();
  const localClosureReport =
    existingMission?.closureReport ||
    savedReports[dto.id] ||
    savedReports[dto.incidentId];

  const plate = dto.rescueUnit?.plateNumber || fallbackVehiclePlate || 'Chưa gán xe';

  // Nếu backend trả về completionReport đã nộp, ưu tiên đồng bộ dữ liệu từ server
  let effectiveClosureReport: DigitalClosureReport | undefined = localClosureReport;
  if (dto.completionReport) {
    effectiveClosureReport = mapCompletionReportDtoToClosureReport(
      dto.completionReport,
      dto.id,
      dto.incidentId,
      plate,
      localClosureReport
    );
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

  const isAiDispatched = dto.assignedByUserId === null;
  const dispatcherLabel = isAiDispatched
    ? 'AI tự điều phối'
    : (incidentDetails?.verifiedByName || 'Điều phối viên CAD');

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
    dispatcherName: dispatcherLabel,
    assignedByUserId: dto.assignedByUserId,
    isAiDispatched,
    stationTeamName: dto.completionReport?.stationTeamName || undefined,
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
        label: isAiDispatched
          ? `Hệ thống AI tự động điều phối kíp xe ${plate} tới hiện trường`
          : `${dispatcherLabel} điều phối kíp xe ${plate} tới hiện trường`,
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
