import type { IncidentSeverity } from './dashboard';

// Legacy thang 0–5 + hazard keys cũ — vẫn được Staff portal & Admin (escalation) import.
// Phân hệ Operator dùng SeverityLevel / HazardTag bên dưới.
export type { IncidentSeverity };

export type HazardTagKey =
  | 'fire'
  | 'accident'
  | 'traffic_jam'
  | 'oil_spill'
  | 'vehicle_rollover'
  | 'injury'
  | 'structural_collapse'
  | 'flooding'
  | 'security_threat';

// Thang cấp độ mới (Cấp 1–3, không có Cấp 0). AI không phân loại được → Cấp 1 + % tin cậy thấp.
export type SeverityLevel = 1 | 2 | 3;

// Hai nhánh sự kiện có chấm cấp độ.
export type IncidentCategory = 'fire' | 'accident';

// #Traffic_Jam chỉ là cảnh báo trên bản đồ, không vào hàng đợi / không chấm cấp.
export type HazardTag = IncidentCategory | 'traffic_jam';

// Gộp trạng thái backend cho UI Operator: pending = chờ thẩm định (Pending/AiProcessing/AiProcessed),
// approved = đã xác minh, đang điều phối (Verified/Dispatched/InProgress), completed = đã đóng.
// Escalated không phải một trạng thái riêng ở đây — xem Incident.escalated.
export type IncidentStatus = 'pending' | 'approved' | 'completed';

// Đội cứu hộ từ chối hoặc quá 120s không phản hồi → nhiệm vụ trả về trung tâm, Operator giao lại.
export interface CrewResponseNotice {
  id: string;
  vehicleId: string;
  plate: string;
  kind: 'rejected' | 'timeout';
  reason: string;
  at: string;
}

export type IncidentMediaType = 'image' | 'video';

// Khóa mềm 2 phút khi một Operator mở ca (FR-OP-02).
export interface IncidentLock {
  operatorId: string;
  operatorName: string;
  expiresAt: string;
}

// Thời hạn chặn số điện thoại báo khống (BlockedPhoneNumberList).
export type BlockDuration = '7d' | '30d' | '1y' | 'permanent';

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  hazardTags: string[];
  severity: SeverityLevel;
  /** % tin cậy của AI (0–100). */
  confidenceScore: number;
  aiSummary: string | null;
  status: IncidentStatus;
  /** Backend đã leo thang (status Escalated): Cấp 3 quá ngưỡng chưa có đội nhận. */
  escalated: boolean;
  area: string;
  lat: number;
  lng: number;
  reporterName: string;
  reporterPhone: string;
  createdAt: string;
  mediaType: IncidentMediaType;
  mediaUrl: string | null;
  assignedVehicleIds: string[];
  /** Xe đã nộp báo cáo kết thúc — ca nhiều xe chỉ đóng khi tất cả xe đã nộp. */
  reportedVehicleIds: string[];
  responseNotices: CrewResponseNotice[];
  completedAt?: string;
  lock: IncidentLock | null;
}

export interface TrafficJamReport {
  id: string;
  area: string;
  lat: number;
  lng: number;
  note: string;
  reportedAt: string;
  mediaUrl: string | null;
}

// ---------------------------------------------------------------------------
// Backend API DTOs — mirror EmergencyDispatch.Application.DTOs.Incident / Ai
// (enums serialize as strings: Program.cs registers JsonStringEnumConverter)
// ---------------------------------------------------------------------------

export type BackendIncidentStatus =
  | 'Pending'
  | 'AiProcessing'
  | 'AiProcessed'
  | 'Verified'
  | 'Dispatched'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled'
  | 'Escalated';

export type BackendSeverityLevel = 'Unclassified' | 'Level1' | 'Level2' | 'Level3' | 'Level4' | 'Level5';

export interface IncidentMediaDto {
  id: string;
  mediaUrl: string;
  mediaType: 'Photo' | 'Video';
  fileSizeBytes?: number;
  mimeType?: string;
}

export interface AiClassificationResultDto {
  hazardTags: string[];
  severityScore: number;
  incidentType?: string | null;
  eventType?: 'None' | 'FireExplosion' | 'TrafficAccident';
  isTrafficJam?: boolean;
  summary?: string;
  confidenceScore?: number;
  isSuccess: boolean;
  modelName?: string;
  rawResponse?: string;
  errorMessage?: string;
  processingDurationMs: number;
}

export interface IncidentResponseDto {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  locationAddress: string;
  status: BackendIncidentStatus;
  severity: BackendSeverityLevel;
  reportedByUserId?: string;
  reporterName?: string;
  reporterPhone?: string;
  verifiedByUserId?: string;
  verifiedByUserName?: string;
  verifiedAt?: string;
  operatorNotes?: string;
  lockedByOperatorId?: string;
  lockedByOperatorName?: string;
  lockExpiresAt?: string;
  createdAt: string;
  updatedAt?: string;
  mediaItems: IncidentMediaDto[];
  aiClassification?: AiClassificationResultDto | null;
}

export interface CreateIncidentDto {
  title?: string;
  description: string;
  latitude: number;
  longitude: number;
  locationAddress: string;
  reporterName?: string;
  reporterPhone?: string;
  mediaUrls?: string[];
}

export interface PaginatedResultDto<T> {
  items: T[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface VerifyIncidentRequestDto {
  confirmedSeverity: BackendSeverityLevel;
  adjustedTitle?: string;
  operatorNotes?: string;
}

// Unclassified (AI không phân loại được) hiển thị như Cấp 1 + % tin cậy thấp; Level4/5 chỉ còn ở dữ liệu cũ.
const SEVERITY_FROM_BACKEND: Record<BackendSeverityLevel, SeverityLevel> = {
  Unclassified: 1,
  Level1: 1,
  Level2: 2,
  Level3: 3,
  Level4: 3,
  Level5: 3,
};

const SEVERITY_TO_BACKEND: Record<SeverityLevel, BackendSeverityLevel> = {
  1: 'Level1',
  2: 'Level2',
  3: 'Level3',
};

export function severityToBackend(severity: SeverityLevel): BackendSeverityLevel {
  return SEVERITY_TO_BACKEND[severity];
}

/** AI trả tag dạng tự do ("#Fire", "Accident"...) → chuẩn hóa về key "fire", "accident", "traffic_jam". */
export function normalizeHazardTag(tag: string): string {
  return tag.replace(/^#/, '').trim().toLowerCase();
}

const ACTIVE_DISPATCH_STATUSES: BackendIncidentStatus[] = ['Verified', 'Dispatched', 'InProgress'];

/** null = sự cố đã hủy (không còn hiện ở phân hệ Operator). */
export function toOperatorStatus(dto: Pick<IncidentResponseDto, 'status' | 'verifiedAt'>): IncidentStatus | null {
  if (dto.status === 'Cancelled') return null;
  if (dto.status === 'Completed') return 'completed';
  if (ACTIVE_DISPATCH_STATUSES.includes(dto.status)) return 'approved';
  if (dto.status === 'Escalated') return dto.verifiedAt ? 'approved' : 'pending';
  return 'pending';
}

/**
 * Maps an incident from GET /api/Incidents/queue, GET /api/Incidents or a SignalR push
 * to the UI's Incident shape. Xe đã giao / báo cáo / phản hồi đội được DispatchContext
 * ghép từ các lượt phân công (DispatchAssignment).
 */
export function mapIncidentResponseToIncident(dto: IncidentResponseDto): Incident {
  const firstMedia = dto.mediaItems[0] ?? null;
  const ai = dto.aiClassification;
  const hazardTags = (ai?.hazardTags ?? []).map(normalizeHazardTag);
  const category: IncidentCategory =
    ai?.eventType === 'FireExplosion'
      ? 'fire'
      : ai?.eventType === 'TrafficAccident'
        ? 'accident'
        : hazardTags.includes('fire')
          ? 'fire'
          : 'accident';
  const hasActiveLock =
    !!dto.lockedByOperatorId && !!dto.lockExpiresAt && new Date(dto.lockExpiresAt).getTime() > Date.now();

  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    category,
    hazardTags,
    severity: SEVERITY_FROM_BACKEND[dto.severity] ?? 1,
    confidenceScore: Math.round((ai?.confidenceScore ?? 0) * 100),
    aiSummary: ai?.summary ?? null,
    status: toOperatorStatus(dto) ?? 'pending',
    escalated: dto.status === 'Escalated',
    area: dto.locationAddress,
    lat: dto.latitude,
    lng: dto.longitude,
    reporterName: dto.reporterName || 'Không rõ danh tính',
    reporterPhone: dto.reporterPhone || '—',
    createdAt: dto.createdAt,
    mediaType: firstMedia?.mediaType === 'Video' ? 'video' : 'image',
    mediaUrl: firstMedia?.mediaUrl ?? null,
    assignedVehicleIds: [],
    reportedVehicleIds: [],
    responseNotices: [],
    lock: hasActiveLock
      ? {
          operatorId: dto.lockedByOperatorId!,
          operatorName: dto.lockedByOperatorName || 'Điều phối viên khác',
          expiresAt: dto.lockExpiresAt!,
        }
      : null,
  };
}
