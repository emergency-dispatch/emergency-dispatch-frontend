import type { StaffMission, MissionStatus, DigitalClosureReport } from '../../../types/staff';
import type { DispatchAssignmentResponseDto } from '../../../types/dispatch';
import type { RouteResult } from '../../../services/routingService';
import type { IncidentCategory, SeverityLevel } from '../../../types/incident';
import type { DispatchVehicleType, VehicleStatus } from '../../../types/vehicle';
import type { ServiceAreaDto } from '../../../services/liveMapService';
import { circlePolygon } from '../../../components/operator/livemap/MapServiceAreaLayer';

export { formatShortId } from '../../../utils/incidentFormat';

/** Phân loại danh mục sự cố sang IncidentCategory tương thích Live Map Operator */
export function resolveIncidentCategory(
  title?: string,
  description?: string,
  hazardTags?: string[]
): IncidentCategory {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  if (
    hazardTags?.some((h) => h.includes('fire') || h.includes('flame')) ||
    text.includes('cháy') ||
    text.includes('hỏa hoạn') ||
    text.includes('khói') ||
    text.includes('nổ') ||
    text.includes('fire')
  ) {
    return 'fire';
  }
  if (
    hazardTags?.some((h) => h.includes('accident') || h.includes('traffic')) ||
    text.includes('tai nạn') ||
    text.includes('va chạm') ||
    text.includes('đâm') ||
    text.includes('lật') ||
    text.includes('accident')
  ) {
    return 'accident';
  }
  if (text.includes('sos') || text.includes('cứu hộ') || text.includes('mắc kẹt') || text.includes('chìm')) {
    return 'unknown';
  }
  return 'other';
}

/** Chuyển đổi mã loại phương tiện sang DispatchVehicleType dùng icon 3D của Operator */
export function resolveDispatchVehicleType(type?: string): DispatchVehicleType {
  if (!type) return 'rescue';
  const t = type.toLowerCase();
  if (t.includes('fire') || t.includes('cháy') || t.includes('ladder')) return 'fire_truck';
  if (t.includes('ambulance') || t.includes('thương') || t.includes('cấp cứu') || t.includes('y tế')) return 'ambulance';
  return 'rescue';
}

/** Chuyển đổi trạng thái nhiệm vụ sang VehicleStatus hiển thị chấm trạng thái xe 3D */
export function resolveDispatchVehicleStatus(status?: string): VehicleStatus {
  if (status === 'on_scene') return 'on_scene';
  if (status === 'en_route') return 'en_route';
  if (status === 'accepted') return 'accepted';
  if (status === 'completed') return 'recovering';
  return 'en_route';
}

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
    code?: string | null;
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
    incidentCode: incidentDetails?.code || (dto as any).incidentCode,
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

/**
 * Phân giải chuỗi hoặc object GeoJSON từ backend / OSM / Admin settings thành danh sách đa giác.
 * Hỗ trợ Polygon, MultiPolygon, Feature, FeatureCollection, GeometryCollection và bỏ cao độ z nếu có.
 */
export function parseStaffBoundaryGeoJson(input: unknown): [number, number][][][] {
  if (!input) return [];
  let geo: unknown = input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
      geo = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (!geo || typeof geo !== 'object') return [];

  const isPos = (p: unknown): p is [number, number] =>
    Array.isArray(p) && p.length >= 2 && !isNaN(Number(p[0])) && !isNaN(Number(p[1]));
  const isRing = (r: unknown): r is [number, number][] => Array.isArray(r) && r.every(isPos);
  const isPoly = (p: unknown): p is [number, number][][] => Array.isArray(p) && p.length > 0 && p.every(isRing);

  const collect = (node: unknown): [number, number][][][] => {
    if (!node || typeof node !== 'object') return [];
    const { type, coordinates, geometry, features, geometries } = node as {
      type?: string;
      coordinates?: unknown;
      geometry?: unknown;
      features?: unknown;
      geometries?: unknown;
    };
    if (type === 'Polygon') return isPoly(coordinates) ? [coordinates] : [];
    if (type === 'MultiPolygon' && Array.isArray(coordinates)) return coordinates.filter(isPoly);
    if (type === 'Feature') return collect(geometry);
    if (type === 'FeatureCollection' && Array.isArray(features)) return features.flatMap(collect);
    if (type === 'GeometryCollection' && Array.isArray(geometries)) return geometries.flatMap(collect);
    return [];
  };

  const rawPolygons = collect(geo);
  if (rawPolygons.length === 0) return [];

  // Chuẩn hóa tọa độ [lng, lat]:
  // 1. Chuyển sang number và loại bỏ cao độ z nếu có
  // 2. Tự động hoán vị nếu dữ liệu OSM bị nghịch đảo [lat, lng] thay vì [lng, lat]
  const normalizeCoord = ([x, y]: [unknown, unknown]): [number, number] => {
    const numX = Number(x);
    const numY = Number(y);
    if (numX >= 8 && numX <= 24 && numY >= 102 && numY <= 110) {
      return [numY, numX]; // Lat/Lng bị đảo chiều tại Việt Nam
    }
    return [numX, numY];
  };

  return rawPolygons
    .map((p) => p.map((ring) => ring.map(([lng, lat]) => normalizeCoord([lng, lat]))))
    .filter((p) => p.length > 0 && (p[0]?.length ?? 0) >= 3);
}

/**
 * Sinh FeatureCollection chuẩn cho Mapbox GL trên giao diện Staff:
 * - Có đa giác ranh giới (boundaryGeoJson): vẽ đúng hình dáng đa giác / lục giác / ranh giới phường quận.
 * - Không có đa giác: vẽ vòng tròn quanh tâm bán kính radiusKm.
 * Tương thích cả camelCase và PascalCase (từ C# backend).
 */
export function buildStaffServiceAreaFeatureCollection(area?: ServiceAreaDto | null): {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: { name: string };
    geometry:
      | { type: 'MultiPolygon'; coordinates: [number, number][][][] }
      | { type: 'Polygon'; coordinates: [number, number][][] };
  }>;
} {
  if (!area) return { type: 'FeatureCollection', features: [] };
  const raw = area as any;
  const boundaryRaw = area.boundaryGeoJson ?? raw.BoundaryGeoJson;
  const centerLat = typeof area.centerLat === 'number' && area.centerLat !== 0 ? area.centerLat : (raw.CenterLat ?? 10.8441);
  const centerLng = typeof area.centerLng === 'number' && area.centerLng !== 0 ? area.centerLng : (raw.CenterLng ?? 106.8089);
  const radiusKm = typeof area.radiusKm === 'number' && area.radiusKm > 0 ? area.radiusKm : (raw.RadiusKm ?? 4.5);
  const name = area.name ?? raw.Name ?? 'Ranh giới phục vụ trạm';

  const polygons = parseStaffBoundaryGeoJson(boundaryRaw);
  if (polygons.length > 0) {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name },
          geometry: {
            type: 'MultiPolygon',
            coordinates: polygons,
          },
        },
      ],
    };
  }

  if (radiusKm > 0) {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name },
          geometry: {
            type: 'Polygon',
            coordinates: [circlePolygon(centerLat, centerLng, radiusKm)],
          },
        },
      ],
    };
  }

  return { type: 'FeatureCollection', features: [] };
}

/**
 * Tính khung bao [minLng, minLat, maxLng, maxLat] của vùng phục vụ trạm để zoom trọn vẹn ranh giới.
 */
export function getStaffServiceAreaBounds(area?: ServiceAreaDto | null): [number, number, number, number] | null {
  if (!area) return null;
  const raw = area as any;
  const boundaryRaw = area.boundaryGeoJson ?? raw.BoundaryGeoJson;
  const polygons = parseStaffBoundaryGeoJson(boundaryRaw);
  if (polygons.length > 0) {
    const points = polygons.flatMap((p) => p[0] ?? []);
    if (points.length > 0) {
      return points.reduce<[number, number, number, number]>(
        ([minX, minY, maxX, maxY], [lng, lat]) => [
          Math.min(minX, lng),
          Math.min(minY, lat),
          Math.max(maxX, lng),
          Math.max(maxY, lat),
        ],
        [Infinity, Infinity, -Infinity, -Infinity]
      );
    }
  }

  const centerLat = typeof area.centerLat === 'number' && area.centerLat !== 0 ? area.centerLat : (raw.CenterLat ?? 10.8441);
  const centerLng = typeof area.centerLng === 'number' && area.centerLng !== 0 ? area.centerLng : (raw.CenterLng ?? 106.8089);
  const radiusKm = typeof area.radiusKm === 'number' && area.radiusKm > 0 ? area.radiusKm : (raw.RadiusKm ?? 4.5);
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));
  return [centerLng - lngDelta, centerLat - latDelta, centerLng + lngDelta, centerLat + latDelta];
}
