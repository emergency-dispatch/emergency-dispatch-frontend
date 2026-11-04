import type { IncidentSeverity } from './dashboard';
import type { DispatchAssignmentResponseDto } from './dispatch';

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

// Hai nhánh sự kiện có chấm cấp độ; 'unknown' = AI không xác định và không suy được từ loại SOS người dân chọn
// (Operator phải chọn khi duyệt).
export type IncidentCategory = 'fire' | 'accident' | 'unknown';

// #Traffic_Jam chỉ là cảnh báo trên bản đồ, không vào hàng đợi / không chấm cấp.
export type HazardTag = 'fire' | 'accident' | 'traffic_jam';

/** IncidentEventType của backend. */
export type BackendEventType = 'None' | 'FireExplosion' | 'TrafficAccident';

/**
 * Kênh tiếp nhận sự cố. CitizenApp = người dân gửi SOS qua app; còn lại = Operator tự tạo khi biết tin
 * từ bên ngoài (POST /api/incidents/operator).
 */
export type IncidentSource = 'CitizenApp' | 'PhoneCall' | 'Radio' | 'Cctv' | 'FieldObservation' | 'Other';
export type OperatorIncidentSource = Exclude<IncidentSource, 'CitizenApp'>;
export const OPERATOR_INCIDENT_SOURCES: OperatorIncidentSource[] = ['PhoneCall', 'Radio', 'Cctv', 'FieldObservation', 'Other'];

/** CancellationReason của backend; Operator chỉ gửi được 4 mã đầu. */
export type CancellationReasonCode = 'FalseReport' | 'Duplicate' | 'TestReport' | 'Other' | 'CitizenCancelled' | 'AutoExpired';
export type OperatorCancellationCode = 'FalseReport' | 'Duplicate' | 'TestReport' | 'Other';

// Gộp trạng thái backend cho UI Operator: pending = chờ thẩm định (Pending/AiProcessing/AiProcessed),
// approved = đã xác minh, đang điều phối (Verified/Dispatched/InProgress), completed = đã đóng.
// Escalated không phải một trạng thái riêng ở đây — xem Incident.escalated.
export type IncidentStatus = 'pending' | 'approved' | 'completed';

// Đội cứu hộ từ chối nhiệm vụ → nhiệm vụ trả về trung tâm, Operator giao lại.
export interface CrewResponseNotice {
  id: string;
  vehicleId: string;
  plate: string;
  kind: 'rejected' | 'timeout';
  reason: string;
  at: string;
}

export type IncidentMediaType = 'image' | 'video';

export interface IncidentMedia {
  url: string;
  type: IncidentMediaType;
}

/** Hồ sơ y tế & danh bạ người thân của người báo (chỉ có khi người báo có tài khoản). SĐT đã bị backend che. */
export interface ReporterMedicalProfile {
  bloodType: string | null;
  medicalNotes: string | null;
  chronicConditions: string[];
  allergies: string[];
  currentMedications: string[];
  mobilityLimitations: string[];
  preferredLanguage: string | null;
  dependentsNote: string | null;
  householdMembersCount: number;
  // Backend chỉ còn một người liên hệ khẩn cấp (bỏ danh bạ ICE nhiều người).
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
}

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
  /** Kênh tiếp nhận — khác CitizenApp là Operator tự tạo (không qua AI). */
  source: IncidentSource;
  /**
   * Backend chưa có loại sự cố đã xác nhận (eventType = None) → khi duyệt bắt buộc gửi confirmedEventType.
   * `category` lúc này chỉ là gợi ý suy từ tiêu đề SOS (hoặc 'unknown').
   */
  needsEventType: boolean;
  hazardTags: string[];
  severity: SeverityLevel;
  /** % tin cậy của AI (0–100). Vô nghĩa khi aiPending. */
  confidenceScore: number;
  /** AI chưa trả kết quả (sự cố vừa gửi / đang phân tích). */
  aiPending: boolean;
  /** AI chạy lỗi / quá thời gian chờ (aiClassification.isSuccess = false) — % tin cậy và cấp đề xuất vô nghĩa. */
  aiFailed: boolean;
  /** Tóm tắt AI theo ngôn ngữ giao diện (summaryVi / summaryEn), có thể nhiều dòng. */
  aiSummary: string | null;
  /** Giao diện tiếng Anh nhưng mô hình chưa sinh bản dịch → aiSummary chỉ là câu thay thế (summaryEnIsFallback). */
  aiSummaryIsFallback: boolean;
  /** Bộ máy AI đã chạy (YOLO + Qwen-VL); null = không có kết quả AI. */
  aiEngine: AiEngineInfo | null;
  /** Cảnh báo hệ thống AI tự gắn (rút từ hazardTags, không phải mối nguy thật). */
  aiFlags: AiFlags;
  /** Tình trạng ùn tắc tại hiện trường; null = không có kết quả AI / không có dấu hiệu (NoEvidence). */
  trafficJam: IncidentTrafficJam | null;
  status: IncidentStatus;
  /** Backend đã leo thang (status Escalated): sự cố quá ngưỡng chưa có đội nhận. */
  escalated: boolean;
  /** AI không phân loại được (severity Unclassified) — hiển thị như Cấp 1 nhưng xếp đầu hàng đợi. */
  aiUnclassified: boolean;
  area: string;
  lat: number;
  lng: number;
  /** Trạm phụ trách sự cố (vận hành theo trạm). */
  responsibleStationId: string | null;
  responsibleStationName: string | null;
  /** SOS nằm ngoài khu vực phục vụ. */
  isOutOfServiceArea: boolean;
  distanceOutsideAreaKm: number | null;
  reporterName: string;
  reporterPhone: string;
  createdAt: string;
  /** Media đầu tiên — dùng cho ảnh thu nhỏ. */
  mediaType: IncidentMediaType;
  mediaUrl: string | null;
  media: IncidentMedia[];
  reporterMedical: ReporterMedicalProfile | null;
  /** Nhật ký SMS khẩn cấp đã tự gửi tới người thân (nếu người báo bật). */
  emergencySmsLog: string | null;
  assignedVehicleIds: string[];
  /** Xe đã nộp báo cáo kết thúc — ca nhiều xe chỉ đóng khi tất cả xe đã nộp. */
  reportedVehicleIds: string[];
  responseNotices: CrewResponseNotice[];
  completedAt?: string;
  lock: IncidentLock | null;
  /** BR-07: số báo cáo trùng backend đang gom vào sự cố này (0 = không có). */
  linkedReportCount: number;
}

/**
 * Trạng thái ùn tắc (backend TrafficJamStatus). AI chỉ dừng ở Suspected / Disputed / Unverified;
 * Confirmed / Dismissed chỉ do Operator / Admin chốt.
 */
export type TrafficJamStatus = 'NoEvidence' | 'Suspected' | 'Disputed' | 'Confirmed' | 'Dismissed' | 'Unverified';

/** Hai quyết định Operator được gửi (PUT /traffic-jam-status, hoặc confirmedTrafficJamStatus khi verify). */
export type TrafficJamDecision = Extract<TrafficJamStatus, 'Confirmed' | 'Dismissed'>;

export interface IncidentTrafficJam {
  status: TrafficJamStatus;
  /** Căn cứ của AI, hoặc ghi chú của Operator sau khi đã thẩm định (theo ngôn ngữ giao diện). */
  evidence: string | null;
  /** Đã có người thẩm định (Confirmed / Dismissed). */
  reviewed: boolean;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
}

/**
 * Cách Dual-Engine đã chạy (suy từ modelName):
 * dual = YOLO + Qwen-VL; dualJamOnly = Qwen-VL + YOLO chỉ chạy được phần ùn tắc;
 * yoloOnly / qwenOnly = engine kia lỗi; bothFailed = cả hai lỗi; legacy = mô hình đơn đời cũ.
 */
export type AiEngineMode = 'dual' | 'dualJamOnly' | 'yoloOnly' | 'qwenOnly' | 'bothFailed' | 'legacy';

export interface AiEngineInfo {
  mode: AiEngineMode;
  /** modelName gốc (hiện trong tooltip). */
  modelName: string;
}

export interface AiFlags {
  /** Chỉ có kết quả sơ bộ của YOLO (Qwen-VL không khả dụng) — AI không đề xuất mức độ. */
  preliminaryYolo: boolean;
  /** YOLO và Qwen-VL không thống nhất (loại sự cố hoặc ùn tắc). */
  engineDisagreement: boolean;
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
  | 'Escalated'
  /** BR-07: báo cáo trùng đã được backend tự gom vào một sự cố gốc (linkedToIncidentId) — không phải ca riêng. */
  | 'Linked';

export type BackendSeverityLevel = 'Unclassified' | 'Level1' | 'Level2' | 'Level3';

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
  eventType?: BackendEventType;
  /** Chỉ true khi trafficJamStatus = Confirmed (Operator đã xác nhận). */
  isTrafficJam?: boolean;
  trafficJamStatus?: TrafficJamStatus;
  /** Bản theo Accept-Language của request; qua SignalR thì dùng bản Vi / En tường minh. */
  trafficJamEvidence?: string | null;
  trafficJamEvidenceVi?: string | null;
  trafficJamEvidenceEn?: string | null;
  trafficJamVerifiedByUserId?: string | null;
  trafficJamVerifiedAt?: string | null;
  summary?: string;
  summaryVi?: string | null;
  summaryEn?: string | null;
  /** Mô hình chưa sinh tiếng Anh → summaryEn chỉ là câu thay thế, không phải bản dịch. */
  summaryEnIsFallback?: boolean;
  confidenceScore?: number;
  isSuccess: boolean;
  modelName?: string;
  rawResponse?: string;
  errorMessage?: string;
  errorMessageVi?: string | null;
  errorMessageEn?: string | null;
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
  responsibleStationId?: string | null;
  responsibleStationName?: string | null;
  isOutOfServiceArea?: boolean;
  distanceOutsideAreaKm?: number | null;
  /** Loại sự cố đã xác nhận (Operator chọn khi verify, hoặc AI xác định); None = chưa rõ. */
  eventType?: BackendEventType;
  /** Backend cũ không gửi → coi như CitizenApp. */
  source?: IncidentSource;
  cancellationReason?: CancellationReasonCode | null;
  cancelledAt?: string | null;
  cancelledByUserId?: string | null;
  cancelledByName?: string | null;
  cancellationNote?: string | null;
  mediaItems: IncidentMediaDto[];
  aiClassification?: AiClassificationResultDto | null;
  reporterMedicalProfile?: (ReporterMedicalProfile & { userId: string; fullName: string; phoneNumber: string }) | null;
  emergencySmsDispatchLog?: string | null;
  /** Loại sự cố người báo tự chọn khi gửi SOS (nếu có). */
  reportedEventType?: BackendEventType | null;
  /** (Sự cố gốc) Số báo cáo đang được gom vào sự cố này — hiện "+N người cùng báo". */
  linkedReportCount?: number;
  /** (Báo cáo đã gom / đã xác nhận trùng) Sự cố gốc. */
  linkedToIncidentId?: string | null;
}

/**
 * Mirror LinkedReportDto (GET /api/incidents/{id}/linked-reports): một báo cáo đã gom vào sự cố gốc (BR-07).
 * Danh sách gồm cả báo cáo đang gom (`Linked`) và đã xác nhận trùng (`Cancelled`), cũ nhất trước.
 */
export interface LinkedReportDto {
  incidentId: string;
  status: BackendIncidentStatus;
  reportedAt: string;
  linkedAt?: string | null;
  /** Khoảng cách tới sự cố gốc (m). */
  distanceMeters?: number | null;
  description: string;
  locationAddress: string;
  latitude: number;
  longitude: number;
  reporterName?: string | null;
  maskedReporterPhone?: string | null;
  reportedEventType?: BackendEventType | null;
  /** Kết quả YOLO kiểm tra nhanh ảnh; null = chưa kiểm tra / không có ảnh. */
  quickCheckEventType?: BackendEventType | null;
  /** Backend nghi gom nhầm: ở rìa bán kính, hoặc loại tự chọn / YOLO khác loại sự cố gốc. */
  isOutlier: boolean;
  mediaUrls: string[];
}

/** AuditAction của backend (nhật ký thao tác trên sự cố). */
export type IncidentAuditAction =
  | 'Created'
  | 'AiAnalyzed'
  | 'Verified'
  | 'SeverityOverridden'
  | 'Dispatched'
  | 'AssignmentAccepted'
  | 'AssignmentRejected'
  | 'StatusChanged'
  | 'Escalated'
  | 'DeEscalated'
  | 'Cancelled'
  | 'Completed'
  | 'Closed'
  | 'ReDispatched'
  | 'PhoneRevealed'
  | 'ReporterBlocked'
  | 'TransferredStation'
  | 'OutOfServiceArea'
  | 'CreatedByOperator'
  // 19–25 (đổi mức độ, yêu cầu hiện trường) và 29 (người báo bổ sung) chưa có trên web → hiện "Thao tác khác".
  // BR-07 gom báo cáo trùng:
  | 'ReportLinked'
  | 'ReportUnlinked'
  | 'DuplicateConfirmed'
  | 'LinkedReportsRestored';

/** Mirror AuditTrailEntryDto (GET /api/incidents/{id}/audit-trail). */
export interface IncidentAuditEntryDto {
  id: string;
  incidentId: string;
  incidentTitle?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: IncidentAuditAction;
  description?: string | null;
  /** Chuỗi JSON trạng thái trước / sau thao tác. */
  oldStateJson?: string | null;
  newStateJson?: string | null;
  timestamp: string;
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

/** Body POST /api/incidents/operator — sự cố được xác minh ngay theo loại / mức Operator chọn. */
export interface CreateOperatorIncidentDto {
  title?: string;
  description?: string;
  latitude: number;
  longitude: number;
  locationAddress: string;
  source: OperatorIncidentSource;
  eventType: Exclude<BackendEventType, 'None'>;
  severity: Exclude<BackendSeverityLevel, 'Unclassified'>;
  /** Nội dung tin báo / căn cứ đánh giá, ≥ 5 ký tự. */
  operatorNotes: string;
  reporterName?: string;
  reporterPhone?: string;
  mediaUrls?: string[];
  /** Điều xe luôn khi tạo; bỏ trống thì điều xe sau qua POST /api/dispatch/assign. */
  rescueUnitIds?: string[];
  algorithm?: 'NearestAvailable' | 'LoadAware';
  dispatchNotes?: string;
}

export interface OperatorIncidentResultDto {
  incident: IncidentResponseDto;
  assignments: DispatchAssignmentResponseDto[];
  /** null = không yêu cầu điều xe; false = điều xe thất bại nhưng sự cố vẫn được tạo. */
  dispatchSucceeded: boolean | null;
  dispatchMessage?: string | null;
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

export interface MyReportUnitDto {
  plateNumber: string;
  unitType: number | string;
  stationName?: string;
  status: string;
}

export interface MyReportDto {
  id: string;
  title: string;
  description: string;
  locationAddress: string;
  latitude?: number;
  longitude?: number;
  status: BackendIncidentStatus;
  severity: BackendSeverityLevel;
  resolutionSummary?: string;
  cancellationReason?: string;
  mediaUrls: string[];
  reportedAt: string;
  verifiedAt?: string;
  dispatchedAt?: string;
  onSceneAt?: string;
  completedAt?: string;
  dispatchedUnits?: MyReportUnitDto[];
}

export interface VerifyIncidentRequestDto {
  confirmedSeverity: BackendSeverityLevel;
  /** Bắt buộc khi sự cố đang có eventType = None. */
  confirmedEventType?: Exclude<BackendEventType, 'None'>;
  adjustedTitle?: string;
  operatorNotes?: string;
  /** Thẩm định ùn tắc cùng lúc với xác minh; bỏ trống = giữ nguyên nhận định hiện tại. */
  confirmedTrafficJamStatus?: TrafficJamDecision;
}

/** Body PUT /api/incidents/{id}/traffic-jam-status. */
export interface UpdateTrafficJamStatusDto {
  status: TrafficJamDecision;
  notes?: string;
}

// Unclassified (AI không phân loại được) giữ số 1 cho kiểu dữ liệu, UI hiện "Chưa phân loại" qua Incident.aiUnclassified.
const SEVERITY_FROM_BACKEND: Record<BackendSeverityLevel, SeverityLevel> = {
  Unclassified: 1,
  Level1: 1,
  Level2: 2,
  Level3: 3,
};

export const CATEGORY_FROM_EVENT_TYPE: Partial<Record<BackendEventType, Exclude<IncidentCategory, 'unknown'>>> = {
  FireExplosion: 'fire',
  TrafficAccident: 'accident',
};

export const EVENT_TYPE_FROM_CATEGORY: Record<Exclude<IncidentCategory, 'unknown'>, Exclude<BackendEventType, 'None'>> = {
  fire: 'FireExplosion',
  accident: 'TrafficAccident',
};

/**
 * Loại SOS người dân chọn khi gửi chỉ nằm trong tiêu đề ("Hỏa hoạn & Khói…", "Tai nạn & Va chạm…") →
 * suy ra để gợi ý khi AI không xác định được. Không suy được → null.
 */
export function inferCategoryFromTitle(title: string): Exclude<IncidentCategory, 'unknown'> | null {
  const t = title.toLowerCase();
  if (/hỏa hoạn|cháy|khói|nổ|fire|smoke|explosion/.test(t)) return 'fire';
  if (/tai nạn|va chạm|accident|crash|collision/.test(t)) return 'accident';
  return null;
}

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

/**
 * Tag backend tự gắn khi AI không phân loại được (AiClassificationResultDto.CreateFallback:
 * "Unclassified", "NeedsHumanReview"), đã chuẩn hóa. Không phải mối nguy thật → ẩn khỏi danh sách tag.
 */
export const AI_FALLBACK_TAGS: ReadonlySet<string> = new Set(['unclassified', 'needshumanreview', 'needs_human_review']);

/**
 * Tag Dual-Engine (YOLO + Qwen-VL) tự gắn để báo trạng thái xử lý, đã chuẩn hóa. Đã thể hiện bằng khối "Tình trạng
 * giao thông" / cảnh báo AI → không hiện như thẻ nguy cơ.
 */
const AI_ENGINE_TAGS = {
  suspectedTrafficJam: 'suspectedtrafficjam',
  trafficJamDisputed: 'trafficjamdisputed',
  trafficJamUnverified: 'trafficjamunverified',
  preliminaryYolo: 'preliminaryyolodetection',
  yoloAccidentFireUnverified: 'yoloaccidentfireunverified',
  engineDisagreement: 'enginedisagreement',
} as const;

const AI_SYSTEM_TAGS: ReadonlySet<string> = new Set([...AI_FALLBACK_TAGS, ...Object.values(AI_ENGINE_TAGS)]);

export const isAiFallbackTag = (tag: string) => AI_SYSTEM_TAGS.has(normalizeHazardTag(tag));

/** modelName của DualEngineAiService → cách các engine đã chạy. */
function parseAiEngine(modelName: string | undefined): AiEngineInfo | null {
  if (!modelName) return null;
  const name = modelName.toLowerCase();
  const mode: AiEngineMode = name.startsWith('dual-engine (both failed)')
    ? 'bothFailed'
    : name.startsWith('dual-engine (qwen-vl + yolo jam only)')
      ? 'dualJamOnly'
      : name.startsWith('dual-engine')
        ? 'dual'
        : name.startsWith('yolo only')
          ? 'yoloOnly'
          : name.startsWith('qwen-vl only')
            ? 'qwenOnly'
            : 'legacy';
  return { mode, modelName };
}

/** Văn bản AI theo ngôn ngữ giao diện: ưu tiên bản tường minh (SignalR luôn gửi cả hai), rồi tới bản theo Accept-Language. */
const pickLocalized = (
  language: 'vi' | 'en',
  vi: string | null | undefined,
  en: string | null | undefined,
  selected: string | null | undefined
): string | null => (language === 'en' ? en || selected || vi : vi || selected || en) || null;

const ACTIVE_DISPATCH_STATUSES: BackendIncidentStatus[] = ['Verified', 'Dispatched', 'InProgress'];

/** null = sự cố đã hủy (không còn hiện ở phân hệ Operator). */
export function toOperatorStatus(dto: Pick<IncidentResponseDto, 'status' | 'verifiedAt'>): IncidentStatus | null {
  // Linked: báo cáo trùng đã gom vào sự cố gốc — không phải ca riêng, chỉ xem / tách từ sự cố gốc.
  if (dto.status === 'Cancelled' || dto.status === 'Linked') return null;
  if (dto.status === 'Completed') return 'completed';
  if (ACTIVE_DISPATCH_STATUSES.includes(dto.status)) return 'approved';
  if (dto.status === 'Escalated') return dto.verifiedAt ? 'approved' : 'pending';
  return 'pending';
}

/**
 * Maps an incident from GET /api/Incidents/queue, GET /api/Incidents or a SignalR push
 * to the UI's Incident shape. Xe đã giao / báo cáo / phản hồi đội được DispatchContext
 * ghép từ các lượt phân công (DispatchAssignment).
 * `language` chọn bản tóm tắt / căn cứ ùn tắc của AI (backend trả cả tiếng Việt và tiếng Anh).
 */
export function mapIncidentResponseToIncident(dto: IncidentResponseDto, language: 'vi' | 'en' = 'vi'): Incident {
  const firstMedia = dto.mediaItems[0] ?? null;
  const ai = dto.aiClassification;
  const allTags = (ai?.hazardTags ?? []).map(normalizeHazardTag);
  const hazardTags = allTags.filter((tag) => !AI_SYSTEM_TAGS.has(tag));
  const jamStatus = ai?.trafficJamStatus ?? 'NoEvidence';
  const jamReviewed = jamStatus === 'Confirmed' || jamStatus === 'Dismissed';
  // Loại sự cố: đã xác nhận / AI xác định → dùng luôn; chưa rõ → gợi ý theo loại SOS người dân chọn; không suy được → 'unknown'.
  const knownCategory =
    CATEGORY_FROM_EVENT_TYPE[dto.eventType ?? 'None'] ??
    (ai?.isSuccess !== false ? CATEGORY_FROM_EVENT_TYPE[ai?.eventType ?? 'None'] : undefined);
  const category: IncidentCategory = knownCategory ?? inferCategoryFromTitle(dto.title) ?? 'unknown';
  const hasActiveLock =
    !!dto.lockedByOperatorId && !!dto.lockExpiresAt && new Date(dto.lockExpiresAt).getTime() > Date.now();

  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    category,
    source: dto.source ?? 'CitizenApp',
    needsEventType: !CATEGORY_FROM_EVENT_TYPE[dto.eventType ?? 'None'],
    hazardTags,
    severity: SEVERITY_FROM_BACKEND[dto.severity] ?? 1,
    confidenceScore: Math.round((ai?.confidenceScore ?? 0) * 100),
    aiPending: !ai && (dto.status === 'Pending' || dto.status === 'AiProcessing'),
    aiFailed: !!ai && ai.isSuccess === false,
    aiSummary: ai ? pickLocalized(language, ai.summaryVi, ai.summaryEn, ai.summary) : null,
    aiSummaryIsFallback: language === 'en' && !!ai?.summaryEnIsFallback,
    aiEngine: parseAiEngine(ai?.modelName),
    aiFlags: {
      preliminaryYolo: allTags.includes(AI_ENGINE_TAGS.preliminaryYolo),
      engineDisagreement: allTags.includes(AI_ENGINE_TAGS.engineDisagreement),
    },
    trafficJam:
      ai && jamStatus !== 'NoEvidence'
        ? {
            status: jamStatus,
            evidence: pickLocalized(language, ai.trafficJamEvidenceVi, ai.trafficJamEvidenceEn, ai.trafficJamEvidence),
            reviewed: jamReviewed,
            verifiedByUserId: ai.trafficJamVerifiedByUserId ?? null,
            verifiedAt: ai.trafficJamVerifiedAt ?? null,
          }
        : null,
    status: toOperatorStatus(dto) ?? 'pending',
    escalated: dto.status === 'Escalated',
    aiUnclassified: dto.severity === 'Unclassified',
    area: dto.locationAddress,
    lat: dto.latitude,
    lng: dto.longitude,
    responsibleStationId: dto.responsibleStationId ?? null,
    responsibleStationName: dto.responsibleStationName ?? null,
    isOutOfServiceArea: !!dto.isOutOfServiceArea,
    distanceOutsideAreaKm: dto.distanceOutsideAreaKm ?? null,
    reporterName: dto.reporterName || 'Không rõ danh tính',
    reporterPhone: dto.reporterPhone || '—',
    createdAt: dto.createdAt,
    mediaType: firstMedia?.mediaType === 'Video' ? 'video' : 'image',
    mediaUrl: firstMedia?.mediaUrl ?? null,
    media: dto.mediaItems.map((m) => ({ url: m.mediaUrl, type: m.mediaType === 'Video' ? 'video' : 'image' })),
    reporterMedical: dto.reporterMedicalProfile ?? null,
    emergencySmsLog: dto.emergencySmsDispatchLog || null,
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
    linkedReportCount: dto.linkedReportCount ?? 0,
  };
}
