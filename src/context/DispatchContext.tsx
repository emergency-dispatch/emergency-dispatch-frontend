import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { dispatchVehicleLimit, type DispatchVehicleLimit } from '../data/dispatchConfig';
import { incidentService } from '../services/incidentService';
import { dispatchService } from '../services/dispatchService';
import {
  DEFAULT_ESCALATION_SETTINGS,
  liveMapService,
  mapTrafficHotspot,
  type AutoDispatchSettings,
  type EscalationSettingsDto,
  type ServiceAreaDto,
  type TrafficHotspotResponseDto,
  type TrafficTaskEventDto,
} from '../services/liveMapService';
import { stationTeamService } from '../services/stationTeamService';
import { fieldRequestService } from '../services/fieldRequestService';
import { isOpenFieldRequest, type FieldRequestDto, type FieldRequestEventDto } from '../types/fieldRequest';
import { staffAudioService } from '../services/staffAudioService';
import { HubEvents, incidentHubService, trackingHubService } from '../services/realtime/incidentHubService';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import i18n, { dateLocale, getLanguage, useTranslation } from '../i18n';
import {
  EVENT_TYPE_FROM_CATEGORY,
  mapIncidentResponseToIncident,
  severityToBackend,
  toOperatorStatus,
  type BlockDuration,
  type CreateOperatorIncidentDto,
  type CrewResponseNotice,
  type Incident,
  type IncidentCategory,
  type IncidentResponseDto,
  type IncidentStatus,
  type IncidentSupplementDto,
  type OperatorCancellationCode,
  type SeverityLevel,
  type TrafficJamDecision,
  type TrafficJamReport,
  type AutoDispatchEventDto,
} from '../types/incident';
import { aiVoteTally } from '../types/aiVote';
import type { BackendDispatchStatus, DispatchAssignmentResponseDto } from '../types/dispatch';
import type { RescueUnitResponseDto, RescueUnitType } from '../types/rescueUnit';
import type { IncidentTypeDto, RescueUnitTypeDto } from '../types/typeCatalog';
import { unitTypeLabel as catalogUnitTypeLabel } from '../components/admin/fleetMeta';
import { typeCatalogService } from '../services/typeCatalogService';
import type { DispatchAlgorithm, DispatchVehicleType, Station, Vehicle, VehicleStatus } from '../types/vehicle';

// Poll dự phòng: sự cố, lượt phân công, trạng thái xe, khóa mềm đều có sự kiện SignalR — poll chỉ để bù khi mất kết nối.
const POLL_MS = 60000;
// Còi leo thang cấp 2 (cần trạm khác hỗ trợ) kêu trong khoảng này rồi tự tắt.
const TIER2_SIREN_MS = 4000;
// Thông báo "xe trạm bạn đi hỗ trợ" / "sự cố đã chuyển trạm" tự đóng sau khoảng này; cảnh báo ngoài khu vực giữ tới khi đóng.
const INFO_ALERT_MS = 15000;
/** Giữ tối đa bấy nhiêu nghiệm thu "chưa xem" (ca cũ nhất bị bỏ). */
const MAX_UNSEEN_COMPLETIONS = 100;

/** Đọc / ghi danh sách id trong localStorage; storage bị chặn (ẩn danh, chính sách) → bỏ qua. */
function readStoredIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
function writeStoredIds(key: string, ids: string[]) {
  try {
    if (ids.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Không lưu được → chỉ giữ trong phiên.
  }
}
// Độ dài ghi chú bổ sung hiện trong thông báo; xem đủ trong chi tiết sự cố.
const SUPPLEMENT_PREVIEW_CHARS = 120;
const HIGHLIGHT_DURATION_MS = 2200;
// Thời gian giữ đánh dấu "mình vừa tách" chờ ReceiveNewIncident (BR-07).
const SELF_UNLINK_MARK_MS = 30000;

const ACTIVE_ASSIGNMENT_STATUSES: BackendDispatchStatus[] = ['Dispatched', 'Accepted', 'EnRoute', 'OnScene'];
const ASSIGNMENT_TO_VEHICLE_STATUS: Partial<Record<BackendDispatchStatus, VehicleStatus>> = {
  Dispatched: 'awaiting_ack',
  Accepted: 'accepted',
  EnRoute: 'en_route',
  OnScene: 'on_scene',
};
// Chuỗi enum backend; CoolDown / OutOfService chưa có trong RescueUnitStatus của Admin nên khóa theo string.
const UNIT_STATUS_TO_VEHICLE_STATUS: Record<string, VehicleStatus> = {
  Available: 'available',
  Dispatched: 'en_route',
  OnScene: 'on_scene',
  Returning: 'recovering',
  CoolDown: 'recovering',
  Maintenance: 'unavailable',
  OutOfService: 'unavailable',
};
// Bối cảnh KCN/Khu CNC: Operator không điều xe tuần tra (PolicePatrol bị ẩn khỏi Live Map).
const UNIT_TYPE_TO_VEHICLE_TYPE: Record<string, DispatchVehicleType | null> = {
  Ambulance: 'ambulance',
  FireTruck: 'fire_truck',
  LadderTruck: 'fire_truck',
  HeavyRescueVehicle: 'rescue',
  RescueBoat: 'rescue',
  PolicePatrol: null,
};
/**
 * §31: loại xe là danh mục do Admin quản lý — loại mới (VD "WaterTanker") vẫn phải hiện và điều được trên Live Map
 * → xếp vào nhóm cứu hộ chung (icon / bộ lọc), tên hiển thị lấy từ danh mục theo mã.
 */
const vehicleTypeOfUnit = (unitType: string): DispatchVehicleType | null =>
  unitType in UNIT_TYPE_TO_VEHICLE_TYPE ? UNIT_TYPE_TO_VEHICLE_TYPE[unitType] : 'rescue';
const BACKEND_ALGORITHM = { nearest: 'NearestAvailable', load_aware: 'LoadAware' } as const;

/**
 * Sau giao xe / đổi trạng thái nhiệm vụ, backend (DispatchService.MapIncidentToSlimDto) phát ReceiveIncidentUpdate bằng
 * bản rút gọn: thiếu eventType, media, kết quả AI, nguồn, khóa, số báo cáo gộp… Ghi đè nguyên bản sẽ làm mất ảnh / loại /
 * tóm tắt AI và cả thông tin khóa. Sự cố đã xác minh luôn có eventType ≠ None, nên "đã xác minh mà eventType = None"
 * là dấu hiệu bản rút gọn → chỉ ghép các trường bản rút gọn thực sự mang lên bản đầy đủ đang có.
 */
const SLIM_INCIDENT_FIELDS = [
  'title',
  'description',
  'latitude',
  'longitude',
  'locationAddress',
  'status',
  'severity',
  'reporterName',
  'reporterPhone',
  'verifiedAt',
  'operatorNotes',
  'createdAt',
  'updatedAt',
  'responsibleStationId',
  'responsibleStationName',
  'isOutOfServiceArea',
  'distanceOutsideAreaKm',
] as const satisfies readonly (keyof IncidentResponseDto)[];

function mergeSlimIncidentDto(prev: IncidentResponseDto | undefined, dto: IncidentResponseDto): IncidentResponseDto {
  const isSlim = !!dto.verifiedAt && (dto.eventType ?? 'None') === 'None';
  if (!prev || !isSlim) return dto;
  const merged: IncidentResponseDto = { ...prev };
  for (const key of SLIM_INCIDENT_FIELDS) {
    if (key in dto) (merged as unknown as Record<string, unknown>)[key] = dto[key];
  }
  return merged;
}


interface LivePosition {
  lat: number;
  lng: number;
  heading: number | null;
  at: string;
  /** Giờ máy này lúc nhận — tính mất tín hiệu GPS mà không lệ thuộc đồng hồ server. */
  receivedAt: number;
}

interface UnitLocationMessage {
  rescueUnitId: string;
  latitude: number;
  longitude: number;
  headingDegrees?: number | null;
  timestampUtc: string;
}

interface EscalationAlertMessage {
  incidentId: string;
  /** 1 = quá ngưỡng (trạm phụ trách + Admin) · 2 = quá gấp đôi ngưỡng, báo mọi Operator. */
  tier?: number;
}

interface RescueUnitStatusEvent {
  rescueUnitId: string;
  stationId: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  isDeleted?: boolean;
}

interface IncidentLockEvent {
  incidentId: string;
  lockedByOperatorId: string | null;
  lockedByOperatorName: string | null;
  lockExpiresAt: string | null;
}

interface TeamChangedEvent {
  stationId: string;
  action: 'Created' | 'Updated' | 'Deleted' | 'MembersChanged';
}

interface SettingsChangedEvent {
  key: 'escalation' | 'dispatch' | 'serviceArea';
}

interface OutOfAreaAlertEvent {
  incidentId: string;
  incidentTitle: string;
  locationAddress: string;
  distanceOutsideAreaKm: number;
  serviceAreaName?: string | null;
}

interface IncidentTransferredEvent {
  incidentId: string;
  incidentTitle: string;
  fromStationId?: string | null;
  fromStationName?: string | null;
  toStationId: string;
  toStationName?: string | null;
  reason: string;
  transferredByName?: string | null;
}

/** Sự cố trạm khác chuyển tới trạm mình: hiện trong modal tin báo mới. */
export interface IncomingTransferNote {
  fromStationName?: string | null;
  transferredByName?: string | null;
  reason: string;
}

/**
 * Thông báo vận hành theo trạm (ngoài tin báo mới): SOS ngoài khu vực, xe đi hỗ trợ, sự cố chuyển trạm,
 * người báo bổ sung, điểm ùn tắc tê liệt chưa có đội (§24).
 */
export interface OperatorAlert {
  id: string;
  kind:
    | 'out_of_area'
    | 'support_dispatched'
    | 'transferred'
    | 'transferred_in'
    | 'supplement'
    | 'traffic_escalation'
    | 'field_request'
    | 'field_request_escalated'
    /** §26.2: một tổ vừa nộp báo cáo nghiệm thu (chữ ký đại diện). */
    | 'team_completed'
    /** BR-21: đội từ chối / không phản hồi lệnh — trả về Operator để giao lại (báo ở mọi trang). */
    | 'crew_rejected'
    /** §31.E: AI đã tự xác minh + điều xe. */
    | 'auto_dispatched'
    /** §31.E: AI đủ tin cậy nhưng bỏ qua (nghi trùng, hết xe…) → Operator xử lý. */
    | 'auto_dispatch_skipped';
  /** Sự cố liên quan; `traffic_escalation` dùng `trafficJamId` (incidentId = id điểm ùn tắc). */
  incidentId: string;
  trafficJamId?: string;
  /** §21.2: yêu cầu hiện trường — đóng / đã xử lý thì gỡ thông báo. */
  fieldRequestId?: string;
  title: string;
  message: string;
  at: string;
}

/** §34: tổ được giao + chức năng (mã loại xe) tổ đảm nhận; `teamName` chỉ để ghép vào câu báo lỗi. */
export interface TeamAssignTarget {
  teamId: string;
  teamName: string;
  unitType: string;
}

/**
 * `allowExtraUnits`: giao thêm tổ cho sự cố Cấp 1–2 (backend cho phép khi có lý do ≥ 5 ký tự ở `notes`).
 * `notes` đi một mình = lý do giao tổ ngoài kế hoạch (lưu vào lượt điều xe).
 */
export interface AssignOptions {
  allowExtraUnits?: boolean;
  notes?: string;
}

/** `notice`: câu backend trả khi thành công mà Operator cần biết hệ quả (VD thu hồi lượt cuối → sự cố tự đóng). */
export type ActionResult = { ok: boolean; message?: string; notice?: string };

/** Kết quả Operator tự tạo sự cố: `errors` = lỗi kiểm tra từng trường backend trả kèm HTTP 400. */
export type CreateIncidentResult =
  | { ok: true; incidentId: string; message?: string; dispatchSucceeded: boolean | null; dispatchMessage?: string | null }
  | { ok: false; message: string; errors: string[] };

/** Body thêm / sửa xe từ màn Đội xe. Khi sửa, `stationId` bị bỏ qua (giữ trạm hiện tại của xe). */
export interface VehicleSaveInput {
  plateNumber: string;
  unitType: RescueUnitType;
  stationId: string;
}

// Hàng đợi chờ duyệt: đúng quy tắc của GET /api/incidents/queue (FR-OP-02) — Cấp 3 và sự cố AI không
// phân loại được cùng nhóm đầu, rồi Cấp 2, Cấp 1; cùng nhóm thì FIFO. Áp lại ở client chỉ để chèn đúng
// chỗ các sự cố mới nhận qua SignalR, không đổi thứ tự backend trả về.
const queueRank = (i: Incident) => (i.severity === 3 || i.aiUnclassified ? 0 : i.severity === 2 ? 1 : 2);

function sortByPriority(incidents: Incident[]): Incident[] {
  const byCreatedAt = (a: Incident, b: Incident) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  return [...incidents].sort((a, b) => {
    if (a.status === 'pending' && b.status === 'pending') return queueRank(a) - queueRank(b) || byCreatedAt(a, b);
    // Bảng điều phối: sự cố leo thang trước, rồi Cấp cao trước.
    if (a.escalated !== b.escalated) return Number(b.escalated) - Number(a.escalated);
    return b.severity - a.severity || byCreatedAt(a, b);
  });
}

const isActiveAssignment = (a: DispatchAssignmentResponseDto) => ACTIVE_ASSIGNMENT_STATUSES.includes(a.status);
/** HTTP 409: sự cố / lượt điều phối vừa bị người khác (hoặc worker) sửa trước — cần tải lại rồi thao tác lại. */
const isConflict = (err: unknown) => isAxiosError(err) && err.response?.status === 409;

const upsert = <T extends { id: string }>(map: Map<string, T>, items: T[]) => {
  const next = new Map(map);
  items.forEach((item) => next.set(item.id, item));
  return next;
};

interface DispatchContextValue {
  currentOperatorId: string;
  vehicles: Vehicle[];
  stations: Station[];
  trafficJams: TrafficJamReport[];
  /** Đánh dấu điểm ùn tắc đã giải tỏa (PUT /api/traffic/{id}/resolve), ghi chú tùy chọn. */
  resolveTrafficJam: (id: string, note?: string) => Promise<ActionResult>;
  /** §20: giao xe giải tỏa điểm ùn tắc (PUT /api/traffic/{id}/assign). 409 → tải lại điểm ùn tắc. */
  assignTrafficJam: (id: string, rescueUnitId: string, notes?: string) => Promise<ActionResult>;
  /** §20: rút xe khỏi điểm ùn tắc (lý do ≥ 5 ký tự). */
  unassignTrafficJam: (id: string, reason: string) => Promise<ActionResult>;
  /**
   * Xe Sẵn sàng của trạm mình để giao giải tỏa ùn tắc — gồm cả PolicePatrol (ẩn khỏi Live Map nhưng là loại xe
   * backend gợi ý cho việc phân luồng), xếp PolicePatrol trước.
   */
  trafficAssignableUnits: RescueUnitResponseDto[];
  /** §21.2: yêu cầu từ hiện trường đang mở (Open / Acknowledged), cũ nhất trước. */
  fieldRequests: FieldRequestDto[];
  acknowledgeFieldRequest: (id: string) => Promise<ActionResult>;
  /** Đánh dấu đã đáp ứng (ghi chú tùy chọn). */
  fulfillFieldRequest: (id: string, note?: string) => Promise<ActionResult>;
  /** Từ chối (lý do ≥ 5 ký tự). */
  declineFieldRequest: (id: string, note: string) => Promise<ActionResult>;
  /**
   * Giao xe đáp ứng yêu cầu chi viện (POST /dispatch/assign kèm fieldRequestId, nhiều xe một lần) — vượt giới hạn
   * Cấp 1–2 không cần lý do, yêu cầu tự Fulfilled. Thành công → `message` của backend.
   */
  assignForFieldRequest: (
    requestId: string,
    incidentId: string,
    teams: TeamAssignTarget[],
    algorithm: DispatchAlgorithm
  ) => Promise<ActionResult>;
  /** Màn Đội xe: đặt xe Bảo trì / đưa trở lại Sẵn sàng (xe đang làm nhiệm vụ bị backend chặn). */
  setVehicleStatus: (id: string, status: 'Available' | 'Maintenance') => Promise<ActionResult>;
  /**
   * Màn Đội xe: thêm xe vào trạm mình (không truyền `id`) hoặc sửa biển số / chủng loại.
   * Xóa xe và chuyển trạm chỉ Admin làm.
   */
  saveVehicle: (input: VehicleSaveInput, id?: string) => Promise<ActionResult>;
  escalationSettings: EscalationSettingsDto;
  /** §31.E: AI tự điều phối (bật/tắt + ngưỡng); null = chưa tải được → popup tin báo mới chạy như luồng cũ. */
  autoDispatchSettings: AutoDispatchSettings | null;
  incidents: Incident[];
  highlightIncidentIds: Set<string>;
  incidentsLoading: boolean;
  incidentsError: string | null;
  /** Sự cố backend đã leo thang (status Escalated). */
  escalatedIncidentIds: Set<string>;
  /** Live Map đang mở thẩm định / Hồ sơ ca — banner leo thang tự thu gọn và né sang phần bản đồ. */
  incidentDrawerOpen: boolean;
  setIncidentDrawerOpen: (open: boolean) => void;
  /**
   * Duyệt sự cố. `category` bắt buộc khi sự cố chưa có loại đã xác nhận (Incident.needsEventType) → gửi
   * confirmedEventType.
   */
  approveIncident: (
    id: string,
    confirmedSeverity: SeverityLevel,
    operatorNotes?: string,
    category?: IncidentCategory,
    /** Thẩm định ùn tắc gửi kèm (confirmedTrafficJamStatus); bỏ trống = giữ nhận định hiện tại. */
    trafficJam?: TrafficJamDecision,
    /** §31: loại chi tiết (confirmedIncidentTypeCode); bỏ trống = giữ loại hiện tại / theo nhóm. */
    incidentTypeCode?: string
  ) => Promise<ActionResult>;
  /** Chốt cảnh báo ùn tắc của một sự cố đã xác minh (PUT /api/incidents/{id}/traffic-jam-status). */
  reviewTrafficJam: (id: string, decision: TrafficJamDecision, notes?: string) => Promise<ActionResult>;
  rejectIncident: (
    id: string,
    reason: string,
    blockDuration?: BlockDuration | null,
    reasonCode?: OperatorCancellationCode
  ) => Promise<ActionResult>;
  /** Chuyển sự cố sang trạm khác phụ trách (lý do ≥ 5 ký tự). */
  transferIncident: (id: string, stationId: string, reason: string) => Promise<ActionResult>;
  /**
   * BR-07: tách báo cáo đã gộp khỏi sự cố gốc (PUT /api/incidents/{id}/unlink). Báo cáo quay lại hàng đợi qua
   * ReceiveNewIncident — người vừa tách không bị bật popup "tin báo mới" / bíp.
   */
  unlinkLinkedReport: (reportId: string, reason?: string) => Promise<ActionResult>;
  /**
   * §21.1: đổi mức độ (và tùy chọn loại) sự cố đã xác minh (PUT /api/incidents/{id}/severity), lý do ≥ 5 ký tự.
   * Thành công → `message` là câu backend trả (có thể nhắc rút bớt xe khi hạ mức).
   */
  changeIncidentSeverity: (
    id: string,
    severity: SeverityLevel,
    category: Exclude<IncidentCategory, 'unknown'> | undefined,
    reason: string,
    /** §31: loại chi tiết mới (newIncidentTypeCode); bỏ trống = giữ loại / theo nhóm mới. */
    incidentTypeCode?: string
  ) => Promise<ActionResult>;
  lockIncident: (id: string) => Promise<ActionResult>;
  releaseIncident: (id: string) => void;
  /** Operator tự tạo sự cố (tin báo qua điện thoại, bộ đàm, camera…) — sự cố được xác minh ngay. */
  createOperatorIncident: (dto: CreateOperatorIncidentDto) => Promise<CreateIncidentResult>;
  /** Ghi chú của Operator: nội dung tin báo (ca Operator tạo) hoặc căn cứ lúc duyệt; null = không có. */
  operatorNotesOf: (id: string) => string | null;
  /** Số điện thoại đầy đủ (backend ghi vết), null nếu thất bại. */
  revealReporterPhone: (id: string) => Promise<string | null>;
  /**
   * §34: giao các tổ cho sự cố trong một lệnh (tất cả hoặc không tổ nào) — backend chọn xe sẵn sàng gần nhất đúng chức
   * năng của tổ. Số tổ tối đa theo kế hoạch điều xe (BR-14); Cấp 3 tối đa 5 tổ.
   */
  assignTeams: (
    targets: TeamAssignTarget[],
    incidentId: string,
    algorithm?: DispatchAlgorithm,
    options?: AssignOptions
  ) => Promise<ActionResult>;
  cancelAssignment: (vehicleId: string) => Promise<ActionResult>;
  dismissResponseNotice: (incidentId: string, noticeId: string) => void;
  /** Sự cố mới báo tới, còn chờ duyệt và Operator chưa đóng thông báo (mới nhất trước). */
  incomingIncidents: Incident[];
  /**
   * Nghiệm thu: sự cố vừa chuyển sang Hoàn tất trong lúc Operator đang trực mà chưa mở xem (badge tab "Đã hoàn tất",
   * chấm "mới" trên dòng). Mở đúng ca → `markCompletionSeen`.
   */
  unseenCompletionIds: string[];
  markCompletionSeen: (incidentId: string) => void;
  dismissIncomingIncident: (id: string) => void;
  /** Thông tin chuyển trạm của tin báo mới (theo incidentId) — chỉ có khi sự cố được trạm khác chuyển tới. */
  incomingTransferNotes: Map<string, IncomingTransferNote>;
  /** Cấp leo thang mới nhất theo sự cố (1 hoặc 2); không có = chưa nhận cảnh báo leo thang nào. */
  escalationTiers: Map<string, number>;
  /** Khu vực phục vụ (vẽ vòng trên Live Map khi enabled). */
  serviceArea: ServiceAreaDto | null;
  /** §31–32: danh mục loại sự cố đang dùng (kèm kế hoạch điều xe theo mức); null = chưa tải được. */
  incidentTypes: IncidentTypeDto[] | null;
  /** §31: danh mục loại xe đang dùng; null = chưa tải được (tên loại xe dùng nhãn dịch / mã). */
  rescueUnitTypes: RescueUnitTypeDto[] | null;
  /** Tên loại xe theo ngôn ngữ đang chọn: danh mục → nhãn dịch của 6 loại hệ thống → mã. */
  unitTypeLabel: (code: string) => string;
  /** §31: các loại sự cố (đang dùng) thuộc một nhóm, theo thứ tự hiển thị; danh mục chưa tải được → []. */
  incidentTypesOf: (category: Exclude<IncidentCategory, 'unknown'>) => IncidentTypeDto[];
  /**
   * Nhãn loại sự cố để hiển thị: tên nhóm, kèm tên loại chi tiết nếu không phải loại chung của nhóm
   * (VD "Khác · Tràn dầu"). Không có trong danh mục (đã ẩn) → chỉ tên nhóm.
   */
  incidentKindLabel: (incident: Pick<Incident, 'category' | 'incidentTypeCode'>) => string;
  /**
   * BR-14 theo kế hoạch điều xe (§32): số xe tối đa không cần lý do + thành phần kế hoạch của mức đang áp dụng.
   * Chưa có kế hoạch / chưa tải được danh mục → giới hạn cũ (Cấp 1–2: 1 xe, Cấp 3: 5 xe).
   */
  vehicleLimitFor: (incident: Pick<Incident, 'severity' | 'incidentTypeCode' | 'category' | 'needsEventType'>) => DispatchVehicleLimit;
  operatorAlerts: OperatorAlert[];
  dismissOperatorAlert: (id: string) => void;
  /**
   * §21.4: số lần nhận ReceiveIncidentSupplement theo sự cố gốc trong phiên — dùng làm khóa tải lại
   * danh sách "Thông tin bổ sung từ người báo" (backend không trả bộ đếm trong IncidentResponseDto).
   */
  supplementVersions: Map<string, number>;
  /** Tài khoản chưa được Admin gán trạm phụ trách → các màn Operator hiện hướng dẫn thay vì dữ liệu. */
  stationNotAssigned: string | null;
  /** Lượt điều phối đã biết theo sự cố (đang chạy + đã kết thúc) — màn Nghiệm thu nhóm theo tổ (§26.2). */
  assignmentsByIncident: Map<string, DispatchAssignmentResponseDto[]>;
}

const DispatchContext = createContext<DispatchContextValue | null>(null);

/**
 * Dữ liệu Command Center từ backend: hàng đợi + sự cố đang điều phối (/api/Incidents),
 * xe (/api/rescue-units), lượt phân công (/api/dispatch), trạm, điểm ùn tắc; cập nhật realtime qua
 * SignalR (/hubs/incidents, /hubs/tracking) kèm poll dự phòng.
 * Mounted once in OperatorLayout so data stays live across page navigation.
 */
export const DispatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Dùng trong listener SignalR (đăng ký một lần) → giữ bản mới nhất qua ref.
  const forceLogoutRef = useRef<(reason: string) => void>(() => undefined);
  forceLogoutRef.current = (reason: string) => {
    // Đăng xuất như bình thường rồi đưa lý do sang trang đăng nhập (LoginPage sẵn hiện `state.message`).
    logout('/login').finally(() => navigate('/login', { replace: true, state: { message: reason } }));
  };
  // Đổi ngôn ngữ → tính lại các nhãn dựng sẵn trong view model (VD lý do đội từ chối).
  const { t } = useTranslation();
  const operator = { id: user?.id ?? '', name: user?.fullName ?? t('common.you') };

  const [incidentDtos, setIncidentDtos] = useState<Map<string, IncidentResponseDto>>(new Map());
  const [assignments, setAssignments] = useState<Map<string, DispatchAssignmentResponseDto>>(new Map());
  const [units, setUnits] = useState<RescueUnitResponseDto[]>([]);
  const [positions, setPositions] = useState<Map<string, LivePosition>>(new Map());
  const [stations, setStations] = useState<Station[]>([]);
  const [trafficJams, setTrafficJams] = useState<TrafficJamReport[]>([]);
  const [escalationSettings, setEscalationSettings] = useState<EscalationSettingsDto>(DEFAULT_ESCALATION_SETTINGS);
  const [autoDispatchSettings, setAutoDispatchSettings] = useState<AutoDispatchSettings | null>(null);
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<Set<string>>(new Set());
  const [highlightIncidentIds, setHighlightIncidentIds] = useState<Set<string>>(new Set());
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [incidentDrawerOpen, setIncidentDrawerOpen] = useState(false);
  const [incomingIds, setIncomingIds] = useState<string[]>([]);
  const [escalationTiers, setEscalationTiers] = useState<Map<string, number>>(new Map());
  const [serviceArea, setServiceArea] = useState<ServiceAreaDto | null>(null);
  const [incidentTypes, setIncidentTypes] = useState<IncidentTypeDto[] | null>(null);
  const [rescueUnitTypes, setRescueUnitTypes] = useState<RescueUnitTypeDto[] | null>(null);
  // Handler SignalR đăng ký một lần → đọc danh mục mới nhất qua ref.
  const rescueUnitTypesRef = useRef(rescueUnitTypes);
  rescueUnitTypesRef.current = rescueUnitTypes;
  const [operatorAlerts, setOperatorAlerts] = useState<OperatorAlert[]>([]);
  const [supplementVersions, setSupplementVersions] = useState<Map<string, number>>(new Map());
  const [fieldRequests, setFieldRequests] = useState<FieldRequestDto[]>([]);
  const [stationNotAssigned, setStationNotAssigned] = useState<string | null>(null);
  const knownIncidentIdsRef = useRef<Set<string> | null>(null);
  const [incomingTransferNotes, setIncomingTransferNotes] = useState<Map<string, IncomingTransferNote>>(new Map());
  // Chuyển trạm tới mình, đang chờ ReceiveNewIncident (backend gửi ngay sau) để biết sự cố có lên modal không.
  const awaitingTransferredRef = useRef<Map<string, IncomingTransferNote>>(new Map());
  // Báo cáo chính mình vừa tách (BR-07): ReceiveNewIncident của nó không bật popup / bíp.
  // Ghi trước khi gọi API vì event có thể tới trước HTTP response.
  const selfUnlinkedIdsRef = useRef<Set<string>>(new Set());
  const myStationIdRef = useRef(user?.stationId ?? null);
  myStationIdRef.current = user?.stationId ?? null;
  const myUserIdRef = useRef(user?.id ?? null);
  myUserIdRef.current = user?.id ?? null;
  // Lượt điều phối hiện có — để biết lượt nào vừa kết thúc giữa hai lần poll.
  const assignmentsRef = useRef(assignments);
  assignmentsRef.current = assignments;
  // Sự cố hiện có — handler SignalR cần tiêu đề sự cố (payload bổ sung thông tin không kèm tiêu đề).
  const incidentDtosRef = useRef(incidentDtos);
  incidentDtosRef.current = incidentDtos;
  // §26.2: một báo cáo nghiệm thu hoàn tất nhiều xe → nhiều event cùng report id; chỉ báo một lần.
  const announcedReportIdsRef = useRef<Set<string>>(new Set());
  // Lần tải đầu / sau khi nối lại SignalR: tải đủ lịch sử lượt điều phối từng sự cố (cả lượt đã xong / bị từ chối).
  const fullAssignmentSyncRef = useRef(true);

  const highlight = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setHighlightIncidentIds((h) => new Set([...h, ...ids]));
    setTimeout(() => {
      setHighlightIncidentIds((h) => {
        const next = new Set(h);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, HIGHLIGHT_DURATION_MS);
  }, []);

  /** Sự cố mới báo tới → hiện thông báo nổi + bíp (Operator có thể đang ở trang khác). */
  const announceIncoming = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setIncomingIds((prev) => [...ids.filter((id) => !prev.includes(id)), ...prev]);
    staffAudioService.playPriorityBeep();
  }, []);

  const pushOperatorAlert = useCallback((alert: Omit<OperatorAlert, 'id' | 'at'>, autoDismissMs?: number) => {
    const id = `${alert.kind}-${alert.incidentId}-${Date.now()}`;
    setOperatorAlerts((prev) => [{ ...alert, id, at: new Date().toISOString() }, ...prev].slice(0, 5));
    if (autoDismissMs) setTimeout(() => setOperatorAlerts((prev) => prev.filter((a) => a.id !== id)), autoDismissMs);
  }, []);

  /** Áp điểm ùn tắc mới nhất từ API / SignalR; hết trên bản đồ hoặc đã có đội → gỡ cảnh báo leo thang của nó. */
  const applyTrafficHotspot = useCallback((dto: TrafficHotspotResponseDto) => {
    setTrafficJams((prev) => {
      const rest = prev.filter((j) => j.id !== dto.id);
      return dto.isActive ? [...rest, mapTrafficHotspot(dto)] : rest;
    });
    const stillEscalated = dto.isActive && (dto.status ?? 'Active') === 'Active' && !!dto.escalatedAt;
    if (!stillEscalated) setOperatorAlerts((prev) => prev.filter((a) => a.trafficJamId !== dto.id));
  }, []);

  const reloadTrafficJams = useCallback(() => {
    liveMapService
      .getActiveTrafficJams()
      .then(setTrafficJams)
      .catch(() => undefined);
  }, []);

  /** §21.2: áp yêu cầu hiện trường mới nhất — còn mở thì thêm / cập nhật, đã đóng thì gỡ (kèm thông báo của nó). */
  const applyFieldRequest = useCallback((request: FieldRequestDto) => {
    setFieldRequests((prev) => {
      const rest = prev.filter((r) => r.id !== request.id);
      if (!isOpenFieldRequest(request)) return rest;
      return [...rest, request].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
    if (!isOpenFieldRequest(request)) {
      setOperatorAlerts((prev) => prev.filter((a) => a.fieldRequestId !== request.id));
    }
  }, []);

  const reloadFieldRequests = useCallback(() => {
    fieldRequestService
      .getOpen()
      .then(setFieldRequests)
      .catch(() => undefined);
  }, []);

  const setIncidentLock = useCallback(
    (id: string, lock: Pick<IncidentResponseDto, 'lockedByOperatorId' | 'lockedByOperatorName' | 'lockExpiresAt'>) => {
      setIncidentDtos((prev) => {
        const dto = prev.get(id);
        return dto ? new Map(prev).set(id, { ...dto, ...lock }) : prev;
      });
    },
    []
  );

  const removeIncident = useCallback((id: string) => {
    setIncidentDtos((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setIncomingIds((prev) => prev.filter((x) => x !== id));
  }, []);

  /** Ghi đè / thêm sự cố từ API hoặc SignalR; sự cố đã hủy bị gỡ khỏi bảng. */
  const upsertIncidents = useCallback((dtos: IncidentResponseDto[]) => {
    setIncidentDtos((prev) => {
      const next = new Map(prev);
      dtos.forEach((dto) => {
        if (toOperatorStatus(dto) === null) next.delete(dto.id);
        else next.set(dto.id, mergeSlimIncidentDto(prev.get(dto.id), dto));
      });
      return next;
    });
  }, []);

  const refreshUnits = useCallback(async () => {
    try {
      setUnits(await liveMapService.getRescueUnits());
    } catch (err) {
      console.warn('Không tải được danh sách xe:', err);
    }
  }, []);

  const refreshBoard = useCallback(async () => {
    try {
      const [queueRes, board] = await Promise.all([incidentService.getQueue(), incidentService.getDispatchBoard()]);
      if (!queueRes.success) throw new Error(queueRes.message || i18n.t('context.loadQueueFailed'));

      const fresh = [...queueRes.data, ...board];
      const freshIds = new Set(fresh.map((dto) => dto.id));
      const byIncident = (ids: string[]) =>
        Promise.all(
          ids.map((id) => dispatchService.getAssignmentsByIncident(id).then((res) => (res.success ? res.data : [])))
        ).then((lists) => lists.flat());

      // Lượt điều phối:
      // - Lần đầu / sau khi nối lại: tải đủ lịch sử từng sự cố trên bảng (cần lượt đã xong để hiện "đã báo cáo",
      //   lượt bị từ chối để hiện thông báo đội từ chối).
      // - Các lần poll sau: chỉ `assignments/active` (1 request); sự cố có lượt vừa kết thúc mới tải lại lịch sử.
      let updates: DispatchAssignmentResponseDto[];
      const full = fullAssignmentSyncRef.current;
      if (full) {
        updates = await byIncident(board.map((dto) => dto.id));
        fullAssignmentSyncRef.current = false;
      } else {
        const activeRes = await dispatchService.getActiveAssignments();
        const active = activeRes.success ? activeRes.data : [];
        const activeIds = new Set(active.map((a) => a.id));
        const endedIncidentIds = [
          ...new Set(
            [...assignmentsRef.current.values()]
              .filter((a) => isActiveAssignment(a) && !activeIds.has(a.id) && freshIds.has(a.incidentId))
              .map((a) => a.incidentId)
          ),
        ];
        updates = [...active, ...(await byIncident(endedIncidentIds))];
      }

      setIncidentDtos((prev) => {
        // Sự cố vừa hoàn tất (nhận qua SignalR) không còn trong các danh sách đang mở —
        // giữ lại tới khi tải lại trang để Operator thấy kết quả.
        const keptCompleted = [...prev.values()].filter((dto) => dto.status === 'Completed' && !freshIds.has(dto.id));
        return new Map([...keptCompleted, ...fresh].map((dto) => [dto.id, dto]));
      });
      setAssignments((prev) => {
        const kept = [...prev.values()].filter((a) =>
          full
            ? !freshIds.has(a.incidentId)
            : // Giữ lượt đã kết thúc của sự cố còn mở; lượt đang chạy lấy lại từ `active`.
              !isActiveAssignment(a)
        );
        return new Map([...kept, ...updates].map((a) => [a.id, a]));
      });

      // Sự cố mới xuất hiện giữa hai lần poll (khi SignalR rớt) → nháy sáng.
      if (knownIncidentIdsRef.current) {
        const known = knownIncidentIdsRef.current;
        const arrived = queueRes.data.filter((dto) => !known.has(dto.id)).map((dto) => dto.id);
        highlight(arrived);
        // Báo cáo chính mình vừa tách (BR-07) → không bật popup.
        announceIncoming(arrived.filter((id) => !selfUnlinkedIdsRef.current.delete(id)));
      }
      knownIncidentIdsRef.current = new Set([...(knownIncidentIdsRef.current ?? []), ...freshIds]);
      setIncidentsError(null);
      setStationNotAssigned(null);
    } catch (err) {
      // Vận hành theo trạm: tài khoản chưa được gán trạm → 403 kèm hướng dẫn, không phải lỗi tải.
      if (isAxiosError(err) && err.response?.status === 403) {
        setStationNotAssigned(getApiErrorMessage(err, i18n.t('context.stationNotAssigned')));
        setIncidentsError(null);
      } else {
        setIncidentsError(getApiErrorMessage(err, i18n.t('context.loadQueueFailed')));
      }
    } finally {
      setIncidentsLoading(false);
    }
  }, [highlight, announceIncoming]);

  // Poll dự phòng + sau khi nối lại SignalR: tải lại cả điểm ùn tắc và yêu cầu hiện trường (có thể lỡ sự kiện).
  // Danh mục loại sự cố (+ kế hoạch điều xe) và loại xe: Admin sửa không phát sự kiện realtime → tải lại theo nhịp poll.
  // Lỗi thì giữ bản cũ (null = dùng giới hạn cũ / nhãn dịch).
  const reloadCatalogs = useCallback(() => {
    typeCatalogService
      .listIncidentTypes(false)
      .then(setIncidentTypes)
      .catch((err) => console.warn('Không tải được danh mục loại sự cố:', err));
    typeCatalogService
      .listUnitTypes(false)
      .then(setRescueUnitTypes)
      .catch((err) => console.warn('Không tải được danh mục loại xe:', err));
  }, []);

  const refreshAll = useCallback(() => {
    refreshBoard();
    refreshUnits();
    reloadTrafficJams();
    reloadFieldRequests();
    reloadCatalogs();
  }, [refreshBoard, refreshUnits, reloadTrafficJams, reloadFieldRequests, reloadCatalogs]);

  const unitTypeLabel = useCallback((code: string) => catalogUnitTypeLabel(code, rescueUnitTypes), [rescueUnitTypes]);

  // Danh mục loại sự cố đã xếp theo displayOrder (typeCatalogService) → lọc theo nhóm giữ nguyên thứ tự.
  const incidentTypesOf = useCallback<DispatchContextValue['incidentTypesOf']>(
    (category) => (incidentTypes ?? []).filter((t) => t.category === EVENT_TYPE_FROM_CATEGORY[category]),
    [incidentTypes]
  );

  const incidentKindLabel = useCallback<DispatchContextValue['incidentKindLabel']>(
    (incident) => {
      const categoryLabel = i18n.t(`enums.category.${incident.category}`);
      const code = incident.incidentTypeCode;
      // Mã loại chung trùng tên nhóm (FireExplosion / TrafficAccident / Other) → không lặp lại tên.
      if (!code || (Object.values(EVENT_TYPE_FROM_CATEGORY) as string[]).includes(code)) return categoryLabel;
      const type = incidentTypes?.find((t) => t.code === code);
      if (!type) return categoryLabel;
      const name = (getLanguage() === 'en' ? type.nameEn : type.nameVi) || type.name || type.code;
      return `${categoryLabel} · ${name}`;
    },
    [incidentTypes]
  );

  const vehicleLimitFor = useCallback<DispatchContextValue['vehicleLimitFor']>(
    (incident) => dispatchVehicleLimit(incident, incidentTypes),
    [incidentTypes]
  );

  // Dữ liệu ít thay đổi: trạm, tổ của các trạm, điểm ùn tắc, ngưỡng leo thang.
  useEffect(() => {
    liveMapService
      .getStations()
      .then((list) => {
        setStations(list);
        return stationTeamService.loadTeams(list.map((s) => s.id));
      })
      .catch((err) => console.warn('Không tải được trạm / tổ:', err));
    liveMapService
      .getEscalationSettings()
      .then(setEscalationSettings)
      .catch(() => undefined);
    liveMapService
      .getAutoDispatchSettings()
      .then(setAutoDispatchSettings)
      .catch(() => undefined);
    liveMapService
      .getServiceArea()
      .then(setServiceArea)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, POLL_MS);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Ngôn ngữ lỗi của hub (?culture=). Effect này chạy trước effect mở kết nối bên dưới; đổi ngôn ngữ → nối lại.
  const language = getLanguage();
  useEffect(() => {
    incidentHubService.setCulture(language);
    trackingHubService.setCulture(language);
  }, [language]);

  // Realtime
  useEffect(() => {
    const unsubscribers = [
      incidentHubService.on<IncidentResponseDto>(HubEvents.ReceiveNewIncident, (dto) => {
        upsertIncidents([dto]);
        knownIncidentIdsRef.current?.add(dto.id);
        highlight([dto.id]);
        // Sự cố chính mình vừa tạo (event có thể tới trước cả HTTP response) → không bíp báo tin mới.
        const createdByMe = !!dto.source && dto.source !== 'CitizenApp' && dto.verifiedByUserId === myUserIdRef.current;
        // Báo cáo chính mình vừa tách khỏi sự cố gốc → vẫn vào hàng đợi (đã tô sáng), không bật popup.
        const unlinkedByMe = selfUnlinkedIdsRef.current.delete(dto.id);
        if (!createdByMe && !unlinkedByMe) announceIncoming([dto.id]);
        // Sự cố chuyển tới đã qua thẩm định → không lên modal (chỉ hiện sự cố chờ duyệt) → báo bằng toast.
        const transfer = awaitingTransferredRef.current.get(dto.id);
        if (transfer) {
          awaitingTransferredRef.current.delete(dto.id);
          if (mapIncidentResponseToIncident(dto, getLanguage()).status !== 'pending') {
            pushOperatorAlert(
              {
                kind: 'transferred_in',
                incidentId: dto.id,
                title: i18n.t('layout.operatorAlerts.transferredInTitle'),
                message: i18n.t('layout.operatorAlerts.transferredInMessage', {
                  incident: dto.title,
                  station: transfer.fromStationName ?? i18n.t('layout.operatorAlerts.otherStation'),
                  by: transfer.transferredByName
                    ? i18n.t('layout.operatorAlerts.transferredBy', { name: transfer.transferredByName })
                    : '',
                  reason: transfer.reason,
                }),
              },
              INFO_ALERT_MS
            );
          }
        }
      }),
      incidentHubService.on<IncidentResponseDto>(HubEvents.ReceiveIncidentUpdate, (dto) => upsertIncidents([dto])),
      incidentHubService.on<EscalationAlertMessage>(HubEvents.ReceiveEscalationAlert, (alert) => {
        const tier = alert.tier ?? 1;
        setEscalationTiers((prev) => new Map(prev).set(alert.incidentId, tier));
        // Cấp 2 (quá gấp đôi ngưỡng, cần trạm khác hỗ trợ) → còi; cấp 1 → bíp.
        if (tier >= 2) {
          staffAudioService.playEmergencySiren();
          setTimeout(() => staffAudioService.stopEmergencySiren(), TIER2_SIREN_MS);
        } else {
          staffAudioService.playPriorityBeep();
        }
        incidentService
          .getById(alert.incidentId)
          .then((res) => res.success && upsertIncidents([res.data]))
          .catch(() => undefined);
      }),
      incidentHubService.on<RescueUnitStatusEvent>(HubEvents.ReceiveRescueUnitStatus, (evt) => {
        // Xe mới (chưa có trong danh sách) cần đủ thông tin trạm / loại → tải lại danh sách xe.
        let unknownUnit = false;
        setUnits((prev) => {
          if (evt.isDeleted) return prev.filter((u) => u.id !== evt.rescueUnitId);
          if (!prev.some((u) => u.id === evt.rescueUnitId)) {
            unknownUnit = true;
            return prev;
          }
          return prev.map((u) =>
            u.id === evt.rescueUnitId
              ? {
                  ...u,
                  status: evt.status as RescueUnitResponseDto['status'],
                  stationId: evt.stationId,
                  currentLat: evt.latitude ?? u.currentLat,
                  currentLng: evt.longitude ?? u.currentLng,
                }
              : u
          );
        });
        // Xe mới (tạo / chuyển trạm): chỉ tải lại xe của trạm đó rồi ghép vào danh sách, không tải lại toàn bộ.
        if (unknownUnit) {
          liveMapService
            .getRescueUnits({ stationId: evt.stationId })
            .then((stationUnits) =>
              setUnits((prev) => [...prev.filter((u) => u.stationId !== evt.stationId), ...stationUnits])
            )
            .catch(() => refreshUnits());
        }
      }),
      incidentHubService.on<IncidentLockEvent>(HubEvents.ReceiveIncidentLock, (evt) =>
        setIncidentLock(evt.incidentId, {
          lockedByOperatorId: evt.lockedByOperatorId ?? undefined,
          lockedByOperatorName: evt.lockedByOperatorName ?? undefined,
          lockExpiresAt: evt.lockExpiresAt ?? undefined,
        })
      ),
      // §21.4: người báo bổ sung ghi chú / ảnh → tải lại danh sách bổ sung + báo nhẹ (không bíp).
      incidentHubService.on<IncidentSupplementDto>(HubEvents.ReceiveIncidentSupplement, (s) => {
        const targetId = s.targetIncidentId;
        setSupplementVersions((prev) => new Map(prev).set(targetId, (prev.get(targetId) ?? 0) + 1));
        const incident = incidentDtosRef.current.get(targetId);
        if (!incident) return;
        const note = s.note.trim();
        pushOperatorAlert(
          {
            kind: 'supplement',
            incidentId: targetId,
            title: i18n.t('layout.operatorAlerts.supplementTitle'),
            message: i18n.t('layout.operatorAlerts.supplementMessage', {
              incident: incident.title,
              content: note
                ? note.length > SUPPLEMENT_PREVIEW_CHARS
                  ? `${note.slice(0, SUPPLEMENT_PREVIEW_CHARS)}…`
                  : note
                : i18n.t('layout.operatorAlerts.supplementMediaOnly', { count: s.mediaUrls.length }),
            }),
          },
          INFO_ALERT_MS
        );
      }),
      incidentHubService.on<TeamChangedEvent>(HubEvents.ReceiveTeamChanged, (evt) => {
        stationTeamService.reloadStationTeams(evt.stationId).catch(() => undefined);
        if (evt.action === 'MembersChanged') stationTeamService.loadStaff().catch(() => undefined);
      }),
      incidentHubService.on<SettingsChangedEvent>(HubEvents.ReceiveSettingsChanged, (evt) => {
        if (evt.key === 'escalation') liveMapService.getEscalationSettings().then(setEscalationSettings).catch(() => undefined);
        if (evt.key === 'serviceArea') liveMapService.getServiceArea().then(setServiceArea).catch(() => undefined);
        if (evt.key === 'dispatch')
          liveMapService.getAutoDispatchSettings().then(setAutoDispatchSettings).catch(() => undefined);
      }),
      incidentHubService.on<OutOfAreaAlertEvent>(HubEvents.ReceiveOutOfAreaAlert, (evt) => {
        staffAudioService.playEmergencySiren();
        setTimeout(() => staffAudioService.stopEmergencySiren(), TIER2_SIREN_MS);
        pushOperatorAlert({
          kind: 'out_of_area',
          incidentId: evt.incidentId,
          title: i18n.t('layout.operatorAlerts.outOfAreaTitle'),
          message: i18n.t('layout.operatorAlerts.outOfAreaMessage', {
            title: evt.incidentTitle,
            address: evt.locationAddress,
            area: evt.serviceAreaName
              ? i18n.t('layout.operatorAlerts.namedArea', { name: evt.serviceAreaName })
              : i18n.t('layout.operatorAlerts.defaultArea'),
            km: evt.distanceOutsideAreaKm.toLocaleString(dateLocale(), { maximumFractionDigits: 1 }),
          }),
        });
      }),
      // §31.E: AI tự điều phối xong (Dispatched) hoặc bỏ qua (Skipped). Lệnh giao xe vẫn đi qua sự kiện cũ, nhưng tải
      // lại bảng để có ngay sự cố đã xác minh + lượt phân công; GET sự cố để lấy tiêu đề cho thông báo.
      incidentHubService.on<AutoDispatchEventDto>(HubEvents.ReceiveAutoDispatched, (evt) => {
        // §35: NotEligible đến với hầu hết sự cố, chỉ là nhãn lý do → không toast, không tải lại bảng (backend phát kèm
        // ReceiveIncidentUpdate bản đầy đủ có autoDispatchState / autoDispatchReasonCode).
        if (evt.state === 'NotEligible') return;
        refreshBoard();
        const notify = (title: string) => {
          const dispatched = evt.state === 'Dispatched';
          pushOperatorAlert(
            {
              kind: dispatched ? 'auto_dispatched' : 'auto_dispatch_skipped',
              incidentId: evt.incidentId,
              title: i18n.t(
                dispatched ? 'layout.operatorAlerts.autoDispatchedTitle' : 'layout.operatorAlerts.autoDispatchSkippedTitle'
              ),
              message: dispatched
                ? [
                    i18n.t('layout.operatorAlerts.autoDispatchedMessage', {
                      incident: title,
                      plates: evt.plates ?? '',
                      confidence: Math.round((evt.confidence ?? 0) * 100),
                    }),
                    // §42: chế độ 3 AI bỏ phiếu.
                    evt.votes?.length ? i18n.t('incidents.aiVotes.summary', aiVoteTally(evt.votes)) : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                : i18n.t('layout.operatorAlerts.autoDispatchSkippedMessage', { incident: title, note: evt.note ?? '' }),
            },
            // Cả hai tự đóng: ca bị bỏ qua đã bật modal "AI chuyển cho bạn" (IncomingIncidentToasts) kèm lý do.
            INFO_ALERT_MS
          );
        };
        incidentService
          .getById(evt.incidentId)
          .then((res) => notify(res.success ? res.data.title : ''))
          .catch(() => notify(''));
      }),
      incidentHubService.on<DispatchAssignmentResponseDto>(HubEvents.ReceiveSupportDispatched, (a) => {
        setAssignments((prev) => upsert(prev, [a]));
        pushOperatorAlert(
          {
            kind: 'support_dispatched',
            incidentId: a.incidentId,
            title: i18n.t('layout.operatorAlerts.supportTitle'),
            message: i18n.t('layout.operatorAlerts.supportMessage', {
              plate: a.rescueUnit?.plateNumber ?? '',
              incident: a.incidentTitle,
            }),
          },
          INFO_ALERT_MS
        );
      }),
      incidentHubService.on<IncidentTransferredEvent>(HubEvents.ReceiveIncidentTransferred, (evt) => {
        // Trạm nhận: sự cố vào hàng đợi qua ReceiveNewIncident; trạm gửi + lý do hiện trong modal tin báo mới.
        if (evt.toStationId === myStationIdRef.current) {
          const note: IncomingTransferNote = {
            fromStationName: evt.fromStationName,
            transferredByName: evt.transferredByName,
            reason: evt.reason,
          };
          awaitingTransferredRef.current.set(evt.incidentId, note);
          setIncomingTransferNotes((prev) => new Map(prev).set(evt.incidentId, note));
          return;
        }
        // Trạm cũ bỏ sự cố khỏi danh sách.
        removeIncident(evt.incidentId);
        pushOperatorAlert(
          {
            kind: 'transferred',
            incidentId: evt.incidentId,
            title: i18n.t('layout.operatorAlerts.transferredTitle'),
            message: i18n.t('layout.operatorAlerts.transferredMessage', {
              incident: evt.incidentTitle,
              station: evt.toStationName ?? i18n.t('layout.operatorAlerts.otherStation'),
              by: evt.transferredByName ? i18n.t('layout.operatorAlerts.transferredBy', { name: evt.transferredByName }) : '',
              reason: evt.reason,
            }),
          },
          INFO_ALERT_MS
        );
      }),
      // Tài khoản bị khóa / xóa / đổi quyền / đổi trạm → đăng xuất kèm lý do.
      incidentHubService.on<{ reason?: string }>(HubEvents.ForceLogout, (evt) => {
        incidentHubService.stop();
        trackingHubService.stop();
        forceLogoutRef.current(evt.reason || i18n.t('context.sessionEnded'));
      }),
      incidentHubService.on<DispatchAssignmentResponseDto>(HubEvents.ReceiveJobAssigned, (a) =>
        setAssignments((prev) => upsert(prev, [a]))
      ),
      incidentHubService.on<DispatchAssignmentResponseDto>(HubEvents.ReceiveAssignmentStatus, (a) => {
        const report = a.completionReport;
        const previousStatus = assignmentsRef.current.get(a.id)?.status;
        const wasCompleted = previousStatus === 'Completed';
        const incident = incidentDtosRef.current.get(a.incidentId);
        // BR-21: đội vừa từ chối / không phản hồi → báo ở mọi trang (Operator có thể đang xem ca khác).
        if (a.status === 'Rejected' && previousStatus !== 'Rejected' && incident) {
          // §35: tổ cuối từ chối → backend tự xét sự cố: đã có tổ nghiệm thu → tự đóng; chưa → cần giao tổ thay thế.
          const others = [...assignmentsRef.current.values()].filter((x) => x.incidentId === a.incidentId && x.id !== a.id);
          const wasLast = !others.some(isActiveAssignment);
          const closed = wasLast && others.some((x) => x.status === 'Completed');
          const base = i18n.t('layout.operatorAlerts.crewRejectedMessage', {
            unit: a.rescueUnit?.plateNumber ?? '—',
            incident: incident.title,
            // §52: hệ thống tự rút → nhãn riêng (ghi chú backend chỉ có tiếng Việt).
            reason:
              a.rejectionReason === 'NoResponse'
                ? i18n.t('layout.operatorAlerts.noResponseReason')
                : a.rejectionNotes?.trim() || i18n.t(`enums.rejectionReason.${a.rejectionReason ?? 'Other'}`),
          });
          const hint = closed
            ? i18n.t('layout.operatorAlerts.crewRejectedIncidentClosed')
            : wasLast
              ? i18n.t('layout.operatorAlerts.crewRejectedNoTeamLeft')
              : null;
          if (!closed) staffAudioService.playPriorityBeep();
          pushOperatorAlert(
            {
              kind: 'crew_rejected',
              incidentId: a.incidentId,
              title: i18n.t(
                a.rejectionReason === 'NoResponse'
                  ? 'layout.operatorAlerts.crewTimeoutTitle'
                  : 'layout.operatorAlerts.crewRejectedTitle'
              ),
              message: hint ? `${base}. ${hint}` : base,
            },
            // Sự cố đã tự đóng: không còn việc phải giao lại → tự đóng như thông báo thường.
            closed ? INFO_ALERT_MS : undefined
          );
          if (wasLast) refreshBoard();
        }
        // Tổ vừa nộp nghiệm thu cho sự cố trạm mình → báo nhẹ, mở thẳng màn Nghiệm thu.
        if (a.status === 'Completed' && report && !wasCompleted && incident && !announcedReportIdsRef.current.has(report.id)) {
          announcedReportIdsRef.current.add(report.id);
          pushOperatorAlert(
            {
              kind: 'team_completed',
              incidentId: a.incidentId,
              title: i18n.t('layout.operatorAlerts.teamCompletedTitle'),
              message: i18n.t('layout.operatorAlerts.teamCompletedMessage', {
                team: report.stationTeamName || a.rescueUnit?.plateNumber || '—',
                incident: incident.title,
              }),
            },
            INFO_ALERT_MS
          );
        }
        setAssignments((prev) => upsert(prev, [a]));
        // Xe đổi trạng thái theo lượt phân công (hoàn tất → hồi sức, hủy → sẵn sàng).
        if (!isActiveAssignment(a)) refreshUnits();
      }),
      incidentHubService.on<TrafficHotspotResponseDto>(HubEvents.ReceiveTrafficHotspot, applyTrafficHotspot),
      // §21.2: đội gửi / hủy yêu cầu, Operator khác xử lý, quá hạn → cập nhật panel; yêu cầu mới / quá hạn → bíp + thông báo.
      incidentHubService.on<FieldRequestEventDto>(HubEvents.ReceiveFieldRequest, (evt) => {
        const r = evt.request;
        applyFieldRequest(r);
        if (evt.action !== 'Created' && evt.action !== 'Escalated') return;
        staffAudioService.playPriorityBeep();
        const escalated = evt.action === 'Escalated';
        setOperatorAlerts((prev) => prev.filter((a) => a.fieldRequestId !== r.id));
        pushOperatorAlert(
          {
            kind: escalated ? 'field_request_escalated' : 'field_request',
            incidentId: r.incidentId,
            fieldRequestId: r.id,
            title: i18n.t(
              escalated
                ? 'layout.operatorAlerts.fieldRequestEscalatedTitle'
                : r.type === 'Backup'
                  ? 'layout.operatorAlerts.fieldRequestBackupTitle'
                  : 'layout.operatorAlerts.fieldRequestOtherTitle'
            ),
            message: i18n.t('layout.operatorAlerts.fieldRequestMessage', {
              plate: r.plateNumber ?? '',
              incident: r.incidentTitle ?? '',
              content:
                r.type === 'Backup'
                  ? i18n
                      .t('layout.operatorAlerts.fieldRequestBackupContent', {
                        count: r.quantity,
                        type: r.requestedUnitType ? catalogUnitTypeLabel(r.requestedUnitType, rescueUnitTypesRef.current) : '',
                      })
                      .trim()
                  : (r.description ?? ''),
            }),
          },
          // Quá hạn: giữ tới khi đóng / yêu cầu được xử lý; yêu cầu mới vẫn nằm trong panel nên tự tắt.
          escalated ? undefined : INFO_ALERT_MS
        );
      }),
      // §20: giao / rút / giải tỏa — payload kèm điểm ùn tắc mới nhất (trạng thái xe tới qua ReceiveRescueUnitStatus).
      incidentHubService.on<TrafficTaskEventDto>(HubEvents.ReceiveTrafficTaskAssigned, (evt) =>
        applyTrafficHotspot(evt.hotspot)
      ),
      // §24: điểm Blocked chưa có đội quá ngưỡng → bíp + cảnh báo đỏ (giữ tới khi đóng hoặc đã giao đội).
      incidentHubService.on<TrafficHotspotResponseDto>(HubEvents.ReceiveTrafficHotspotEscalation, (dto) => {
        applyTrafficHotspot(dto);
        staffAudioService.playPriorityBeep();
        setOperatorAlerts((prev) => prev.filter((a) => a.trafficJamId !== dto.id));
        pushOperatorAlert({
          kind: 'traffic_escalation',
          incidentId: dto.id,
          trafficJamId: dto.id,
          title: i18n.t('layout.operatorAlerts.trafficEscalationTitle'),
          message: i18n.t('layout.operatorAlerts.trafficEscalationMessage', {
            area: dto.locationAddress || dto.title,
          }),
        });
      }),
      trackingHubService.on<UnitLocationMessage>(HubEvents.ReceiveRescueUnitLocation, (msg) =>
        setPositions((prev) =>
          new Map(prev).set(msg.rescueUnitId, {
            lat: msg.latitude,
            lng: msg.longitude,
            heading: msg.headingDegrees ?? null,
            at: msg.timestampUtc,
            receivedAt: Date.now(),
          })
        )
      ),
      incidentHubService.onReconnected(() => {
        fullAssignmentSyncRef.current = true;
        refreshAll();
      }),
    ];
    incidentHubService.start();
    trackingHubService.start();

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      incidentHubService.stop();
      trackingHubService.stop();
    };
  }, [
    upsertIncidents,
    highlight,
    announceIncoming,
    refreshUnits,
    refreshAll,
    refreshBoard,
    setIncidentLock,
    removeIncident,
    pushOperatorAlert,
    applyTrafficHotspot,
    applyFieldRequest,
  ]);

  // ---------------------------------------------------------------------------
  // Derived view models
  // ---------------------------------------------------------------------------

  const activeAssignmentByUnit = useMemo(() => {
    const map = new Map<string, DispatchAssignmentResponseDto>();
    assignments.forEach((a) => {
      if (!isActiveAssignment(a)) return;
      const current = map.get(a.rescueUnitId);
      if (!current || current.dispatchedAt < a.dispatchedAt) map.set(a.rescueUnitId, a);
    });
    return map;
  }, [assignments]);

  const trafficAssignableUnits = useMemo(
    () =>
      units
        .filter((u) => u.status === 'Available' && !!user?.stationId && u.stationId === user.stationId)
        .sort(
          (a, b) =>
            Number(b.unitType === 'PolicePatrol') - Number(a.unitType === 'PolicePatrol') ||
            a.plateNumber.localeCompare(b.plateNumber)
        ),
    [units, user?.stationId]
  );

  const vehicles = useMemo<Vehicle[]>(() => {
    const now = Date.now();
    return units.flatMap((unit) => {
      const type = vehicleTypeOfUnit(unit.unitType);
      if (!type) return [];
      const assignment = activeAssignmentByUnit.get(unit.id);
      const live = positions.get(unit.id);
      const status =
        (assignment && ASSIGNMENT_TO_VEHICLE_STATUS[assignment.status]) ??
        UNIT_STATUS_TO_VEHICLE_STATUS[unit.status] ??
        'unavailable';
      const elapsedMinutes = assignment ? (now - new Date(assignment.dispatchedAt).getTime()) / 60000 : 0;
      const etaMinutes =
        assignment?.estimatedArrivalMinutes != null && status !== 'on_scene'
          ? Math.max(1, Math.round(assignment.estimatedArrivalMinutes - elapsedMinutes))
          : null;

      return [
        {
          id: unit.id,
          plate: unit.plateNumber,
          type,
          unitType: unit.unitType,
          status,
          stationId: unit.stationId,
          stationName: unit.stationName,
          unitStatus: unit.status,
          lat: live?.lat ?? unit.currentLat,
          lng: live?.lng ?? unit.currentLng,
          heading: live?.heading ?? 0,
          etaMinutes,
          incidentId: assignment?.incidentId ?? null,
          lastSignalAt: Math.max(
            live?.receivedAt ?? 0,
            unit.lastLocationUpdateAt ? new Date(unit.lastLocationUpdateAt).getTime() : 0,
            // Mới xuất phát thì tính từ lúc xuất phát, không báo mất tín hiệu ngay.
            assignment ? new Date(assignment.enRouteAt ?? assignment.acceptedAt ?? assignment.dispatchedAt).getTime() : 0
          ),
          lastUpdated: live?.at ?? unit.lastLocationUpdateAt ?? unit.updatedAt ?? unit.createdAt,
          assignmentId: assignment?.id ?? null,
          hasLiveGps:
            !!live ||
            (!!assignment &&
              !!unit.lastLocationUpdateAt &&
              new Date(unit.lastLocationUpdateAt).getTime() >= new Date(assignment.dispatchedAt).getTime()),
        },
      ];
    });
  }, [units, activeAssignmentByUnit, positions]);

  const assignmentsByIncident = useMemo(() => {
    const byIncident = new Map<string, DispatchAssignmentResponseDto[]>();
    assignments.forEach((a) => byIncident.set(a.incidentId, [...(byIncident.get(a.incidentId) ?? []), a]));
    return byIncident;
  }, [assignments]);

  const incidents = useMemo<Incident[]>(() => {
    const byIncident = assignmentsByIncident;

    const list = [...incidentDtos.values()].map((dto): Incident => {
      // `t` đổi khi đổi ngôn ngữ → tính lại để chọn tóm tắt / căn cứ ùn tắc AI đúng ngôn ngữ.
      const incident = mapIncidentResponseToIncident(dto, getLanguage());
      const own = byIncident.get(dto.id) ?? [];
      const notices: CrewResponseNotice[] = own
        .filter(
          (a) =>
            a.status === 'Rejected' &&
            !dismissedNoticeIds.has(a.id) &&
            // Đã giao tổ khác sau đó → không còn việc phải làm (còn thiếu tổ thì kế hoạch vẫn báo).
            !own.some(
              (b) =>
                (isActiveAssignment(b) || b.status === 'Completed') &&
                new Date(b.dispatchedAt).getTime() > new Date(a.rejectedAt ?? a.dispatchedAt).getTime()
            )
        )
        .map((a) => ({
          id: a.id,
          vehicleId: a.rescueUnitId,
          plate: a.rescueUnit?.plateNumber ?? '—',
          kind: a.rejectionReason === 'NoResponse' ? 'timeout' : 'rejected',
          reason:
            a.rejectionReason === 'NoResponse'
              ? t('layout.operatorAlerts.noResponseReason')
              : [a.rejectionReason ? t(`enums.rejectionReason.${a.rejectionReason}`) : null, a.rejectionNotes]
                  .filter(Boolean)
                  .join(' — '),
          at: a.rejectedAt ?? a.dispatchedAt,
        }));

      return {
        ...incident,
        assignedVehicleIds: own
          .filter((a) => isActiveAssignment(a) || a.status === 'Completed')
          .map((a) => a.rescueUnitId),
        reportedVehicleIds: own.filter((a) => a.status === 'Completed').map((a) => a.rescueUnitId),
        responseNotices: notices,
        completedAt: dto.status === 'Completed' ? dto.updatedAt : undefined,
      };
    });
    return sortByPriority(list);
  }, [incidentDtos, assignmentsByIncident, dismissedNoticeIds, t]);

  // ---------- Nghiệm thu mới hoàn tất, chưa xem ----------
  // Lưu theo Operator trong localStorage (tiện ích riêng từng máy) để tải lại trang không mất; lỗi storage → chỉ giữ trong phiên.
  const unseenStorageKey = `resq.operator.unseenCompletions:${operator.id}`;
  const [unseenCompletionIds, setUnseenCompletionIds] = useState<string[]>(() => readStoredIds(unseenStorageKey));
  useEffect(() => writeStoredIds(unseenStorageKey, unseenCompletionIds), [unseenStorageKey, unseenCompletionIds]);
  // Trạng thái lần trước của từng sự cố — phát hiện chuyển sang Hoàn tất. Lần tải đầu chỉ lấy mốc (không tính ca cũ).
  const prevStatusRef = useRef<Map<string, IncidentStatus> | null>(null);
  useEffect(() => {
    if (incidentsLoading) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = new Map(incidents.map((i) => [i.id, i.status]));
    if (!prev) return;
    const fresh = incidents
      .filter((i) => i.status === 'completed' && prev.has(i.id) && prev.get(i.id) !== 'completed')
      .map((i) => i.id);
    if (fresh.length === 0) return;
    setUnseenCompletionIds((ids) => [...new Set([...fresh, ...ids])].slice(0, MAX_UNSEEN_COMPLETIONS));
  }, [incidents, incidentsLoading]);
  const markCompletionSeen = useCallback((incidentId: string) => {
    setUnseenCompletionIds((ids) => (ids.includes(incidentId) ? ids.filter((id) => id !== incidentId) : ids));
  }, []);

  // Thông báo tự biến mất khi sự cố không còn chờ duyệt (đã duyệt / bị hủy, kể cả bởi Operator khác).
  const incomingIncidents = useMemo(() => {
    const byId = new Map(incidents.map((i) => [i.id, i]));
    return incomingIds.map((id) => byId.get(id)).filter((i): i is Incident => i?.status === 'pending');
  }, [incomingIds, incidents]);

  const dismissIncomingIncident = useCallback((id: string) => {
    setIncomingIds((prev) => prev.filter((x) => x !== id));
    setIncomingTransferNotes((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const escalatedIncidentIds = useMemo(
    () => new Set(incidents.filter((i) => i.escalated).map((i) => i.id)),
    [incidents]
  );

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const approveIncident = async (
    id: string,
    confirmedSeverity: SeverityLevel,
    operatorNotes?: string,
    category?: IncidentCategory,
    trafficJam?: TrafficJamDecision,
    incidentTypeCode?: string
  ) => {
    try {
      const res = await incidentService.verify(id, {
        confirmedSeverity: severityToBackend(confirmedSeverity),
        confirmedEventType: category && category !== 'unknown' ? EVENT_TYPE_FROM_CATEGORY[category] : undefined,
        confirmedIncidentTypeCode: incidentTypeCode,
        operatorNotes,
        confirmedTrafficJamStatus: trafficJam,
      });
      if (!res.success) return { ok: false, message: res.message || i18n.t('context.verifyFailed') };
      // Không tự giao: Operator chọn tổ ở Chi tiết ca.
      upsertIncidents([res.data]);
      return { ok: true };
    } catch (err) {
      if (isConflict(err)) refreshBoard();
      return { ok: false, message: getApiErrorMessage(err, i18n.t('context.verifyFailed')) };
    }
  };

  const reviewTrafficJam = async (id: string, decision: TrafficJamDecision, notes?: string): Promise<ActionResult> => {
    try {
      const res = await incidentService.updateTrafficJamStatus(id, { status: decision, notes: notes || undefined });
      if (!res.success) return { ok: false, message: res.message || i18n.t('context.trafficJamReviewFailed') };
      upsertIncidents([res.data]);
      return { ok: true };
    } catch (err) {
      if (isConflict(err)) refreshBoard();
      return { ok: false, message: getApiErrorMessage(err, i18n.t('context.trafficJamReviewFailed')) };
    }
  };

  const rejectIncident = async (
    id: string,
    reason: string,
    blockDuration: BlockDuration | null = null,
    reasonCode: OperatorCancellationCode = 'FalseReport'
  ) => {
    try {
      const res = await incidentService.cancel(id, reason, reasonCode);
      if (!res.success) return { ok: false, message: res.message || i18n.t('context.cancelFailed') };
      removeIncident(id);
      // Backend trả các xe đang giao về Sẵn sàng.
      refreshUnits();
    } catch (err) {
      if (isConflict(err)) {
        refreshBoard();
        refreshUnits();
      }
      return { ok: false, message: getApiErrorMessage(err, i18n.t('context.cancelFailed')) };
    }

    if (!blockDuration) return { ok: true };
    try {
      const blockRes = await incidentService.blockReporterPhone(id, blockDuration, reason);
      if (!blockRes.success) {
        setIncidentsError(i18n.t('context.blockAfterCancelFailed', { message: blockRes.message }));
      }
    } catch (err) {
      setIncidentsError(i18n.t('context.blockAfterCancelFailed', { message: getApiErrorMessage(err) }));
    }
    return { ok: true };
  };

  const unlinkLinkedReport = async (reportId: string, reason?: string): Promise<ActionResult> => {
    selfUnlinkedIdsRef.current.add(reportId);
    // Không có ReceiveNewIncident (VD báo cáo thuộc trạm khác) → bỏ đánh dấu để không giữ mãi.
    setTimeout(() => selfUnlinkedIdsRef.current.delete(reportId), SELF_UNLINK_MARK_MS);
    try {
      await incidentService.unlinkReport(reportId, reason);
      return { ok: true };
    } catch (err) {
      selfUnlinkedIdsRef.current.delete(reportId);
      return { ok: false, message: getApiErrorMessage(err, i18n.t('incidents.linked.actionFailed')) };
    }
  };

  const transferIncident = async (id: string, stationId: string, reason: string): Promise<ActionResult> => {
    try {
      const res = await incidentService.transfer(id, stationId, reason);
      if (!res.success) return { ok: false, message: res.message || i18n.t('context.transferFailed') };
      removeIncident(id);
      return { ok: true };
    } catch (err) {
      if (isConflict(err)) refreshBoard();
      return { ok: false, message: getApiErrorMessage(err, i18n.t('context.transferFailed')) };
    }
  };

  const changeIncidentSeverity = async (
    id: string,
    severity: SeverityLevel,
    category: Exclude<IncidentCategory, 'unknown'> | undefined,
    reason: string,
    incidentTypeCode?: string
  ): Promise<ActionResult> => {
    try {
      const { incident, message } = await incidentService.changeSeverity(id, {
        newSeverity: severityToBackend(severity),
        newEventType: category ? EVENT_TYPE_FROM_CATEGORY[category] : undefined,
        newIncidentTypeCode: incidentTypeCode,
        reason,
      });
      upsertIncidents([incident]);
      return { ok: true, message };
    } catch (err) {
      // 409: Operator khác đang giữ khóa — tải lại để hiện đúng người giữ.
      if (isConflict(err)) refreshBoard();
      return { ok: false, message: getApiErrorMessage(err, i18n.t('liveMap.severityChange.failed')) };
    }
  };

  const lockIncident = async (id: string): Promise<ActionResult> => {
    try {
      const res = await incidentService.lock(id);
      if (!res.success) return { ok: false, message: res.message || i18n.t('context.lockedByOther') };
      setIncidentLock(id, {
        lockedByOperatorId: res.data.lockedByOperatorId,
        lockedByOperatorName: res.data.lockedByOperatorName,
        lockExpiresAt: res.data.lockExpiresAt,
      });
      return { ok: true };
    } catch (err) {
      // 409: người khác đang giữ — tải lại để hiện đúng tên người giữ khóa.
      refreshBoard();
      return { ok: false, message: getApiErrorMessage(err, i18n.t('context.lockFailed')) };
    }
  };

  const releaseIncident = (id: string) => {
    const dto = incidentDtos.get(id);
    if (!dto?.lockedByOperatorId || dto.lockedByOperatorId !== operator.id) return;
    setIncidentLock(id, { lockedByOperatorId: undefined, lockedByOperatorName: undefined, lockExpiresAt: undefined });
    incidentService.unlock(id).catch(() => undefined);
  };

  const createOperatorIncident = async (dto: CreateOperatorIncidentDto): Promise<CreateIncidentResult> => {
    try {
      const res = await incidentService.createByOperator(dto);
      if (!res.success) {
        return { ok: false, message: res.message || i18n.t('context.createIncidentFailed'), errors: res.errors ?? [] };
      }
      const { incident, assignments: created, dispatchSucceeded, dispatchMessage } = res.data;
      upsertIncidents([incident]);
      knownIncidentIdsRef.current?.add(incident.id);
      highlight([incident.id]);
      if (created.length > 0) {
        setAssignments((prev) => upsert(prev, created));
        refreshUnits();
      }
      return { ok: true, incidentId: incident.id, message: res.message, dispatchSucceeded, dispatchMessage };
    } catch (err) {
      const data = isAxiosError(err) ? (err.response?.data as { errors?: unknown } | undefined) : undefined;
      const errors = Array.isArray(data?.errors) ? data.errors.filter((e): e is string => typeof e === 'string') : [];
      return { ok: false, message: getApiErrorMessage(err, i18n.t('context.createIncidentFailed')), errors };
    }
  };

  const operatorNotesOf = (id: string) => incidentDtos.get(id)?.operatorNotes?.trim() || null;

  const revealReporterPhone = async (id: string): Promise<string | null> => {
    try {
      const res = await incidentService.revealPhone(id);
      return res.success ? (res.data.phoneNumber ?? null) : null;
    } catch {
      return null;
    }
  };

  const assignTeams = async (
    targets: TeamAssignTarget[],
    incidentId: string,
    algorithm: DispatchAlgorithm = 'nearest',
    options: AssignOptions = {}
  ): Promise<ActionResult> => {
    const incident = incidents.find((i) => i.id === incidentId);
    if (!incident || targets.length === 0) return { ok: false, message: i18n.t('context.incidentOrVehicleNotFound') };
    // Tổ không có nhân viên / đang bận / không còn xe đúng loại: backend kiểm tra và trả câu lỗi (400 / 409).

    // BR-14 theo kế hoạch điều xe của loại sự cố (§32).
    const maxVehicles = vehicleLimitFor(incident).max;
    const activeCount = incident.assignedVehicleIds.length - incident.reportedVehicleIds.length;
    // Cấp 1–2 được giao thêm khi có lý do; Cấp 3 tối đa 5 xe, không vượt được.
    const extraAllowed = !!options.allowExtraUnits && incident.severity !== 3;
    if (activeCount + targets.length > maxVehicles && !extraAllowed) {
      return {
        ok: false,
        message:
          incident.severity === 3
            ? i18n.t('context.maxVehicles', { max: maxVehicles })
            : i18n.t('context.levelVehicleLimit', { level: incident.severity, max: maxVehicles }),
      };
    }

    // Một tổ → kèm tên tổ vào câu lỗi; nhiều tổ thì câu của backend đã nêu tổ / xe bị vướng.
    const suffix = targets.length === 1 ? ` (${targets[0].teamName})` : '';
    try {
      const res = await dispatchService.assignUnit({
        incidentId,
        teams: targets.map((target) => ({ teamId: target.teamId, unitType: target.unitType })),
        algorithm: BACKEND_ALGORITHM[algorithm],
        ...(extraAllowed ? { allowExtraUnits: true } : {}),
        ...(options.notes?.trim() ? { notes: options.notes.trim() } : {}),
      });
      if (!res.success) return { ok: false, message: `${res.message || i18n.t('context.assignFailed')}${suffix}` };
      setAssignments((prev) => upsert(prev, res.data));
      return { ok: true };
    } catch (err) {
      // HTTP 409: tổ vừa được Operator khác giao / đang bận, hoặc sự cố vừa bị người khác sửa → tải lại xe và sự cố.
      refreshUnits();
      if (isConflict(err)) refreshBoard();
      return { ok: false, message: `${getApiErrorMessage(err, i18n.t('context.assignFailed'))}${suffix}` };
    }
  };

  const assignForFieldRequest = async (
    requestId: string,
    incidentId: string,
    teams: TeamAssignTarget[],
    algorithm: DispatchAlgorithm
  ): Promise<ActionResult> => {
    if (teams.length === 0) return { ok: false, message: i18n.t('context.incidentOrVehicleNotFound') };
    try {
      const res = await dispatchService.assignUnit({
        incidentId,
        teams: teams.map((team) => ({ teamId: team.teamId, unitType: team.unitType })),
        algorithm: BACKEND_ALGORITHM[algorithm],
        fieldRequestId: requestId,
      });
      if (!res.success) return { ok: false, message: res.message || i18n.t('context.assignFailed') };
      setAssignments((prev) => upsert(prev, res.data));
      // Backend đã chuyển yêu cầu sang Fulfilled (ReceiveFieldRequest tới sau) → gỡ ngay khỏi panel.
      setFieldRequests((prev) => prev.filter((r) => r.id !== requestId));
      setOperatorAlerts((prev) => prev.filter((a) => a.fieldRequestId !== requestId));
      return { ok: true, message: res.message };
    } catch (err) {
      refreshUnits();
      reloadFieldRequests();
      if (isConflict(err)) refreshBoard();
      return { ok: false, message: getApiErrorMessage(err, i18n.t('context.assignFailed')) };
    }
  };

  const respondFieldRequest = async (call: () => Promise<FieldRequestDto>): Promise<ActionResult> => {
    try {
      applyFieldRequest(await call());
      return { ok: true };
    } catch (err) {
      // Yêu cầu có thể vừa được Operator khác / đội xử lý → tải lại danh sách.
      reloadFieldRequests();
      return { ok: false, message: getApiErrorMessage(err, i18n.t('liveMap.fieldRequests.actionFailed')) };
    }
  };

  const acknowledgeFieldRequest = (id: string) =>
    respondFieldRequest(() => fieldRequestService.acknowledge(id));
  const fulfillFieldRequest = (id: string, note?: string) =>
    respondFieldRequest(() => fieldRequestService.fulfill(id, note));
  const declineFieldRequest = (id: string, note: string) =>
    respondFieldRequest(() => fieldRequestService.decline(id, note));

  // Hủy lệnh điều phối của một xe — không tự gán xe thay thế, Operator chọn lại từ gợi ý.
  // §35: thu hồi lượt cuối → backend tự xét sự cố (đã có tổ nghiệm thu → đóng; chưa → về hàng chờ / giữ leo thang).
  const cancelAssignment = async (vehicleId: string): Promise<ActionResult> => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const assignmentId = vehicle?.assignmentId;
    if (!assignmentId) return { ok: false, message: i18n.t('context.noActiveAssignment') };
    const incidentId = assignmentsRef.current.get(assignmentId)?.incidentId;
    const wasLast =
      !!incidentId &&
      ![...assignmentsRef.current.values()].some(
        (a) => a.id !== assignmentId && a.incidentId === incidentId && isActiveAssignment(a)
      );
    try {
      const res = await dispatchService.updateAssignmentStatus(assignmentId, {
        status: 'Cancelled',
        notes: 'Điều phối viên hủy giao xe.',
      });
      if (!res.success) return { ok: false, message: res.message || i18n.t('context.unassignFailed') };
      setAssignments((prev) => upsert(prev, [res.data]));
      refreshUnits();
      // Lượt cuối: sự cố vừa đóng / về hàng chờ → tải lại bảng (bản realtime rút gọn có thể đến sau) và báo câu backend.
      if (wasLast) {
        refreshBoard();
        return { ok: true, notice: res.message || undefined };
      }
      return { ok: true };
    } catch (err) {
      if (isConflict(err)) {
        refreshBoard();
        refreshUnits();
      }
      return { ok: false, message: getApiErrorMessage(err, i18n.t('context.unassignFailed')) };
    }
  };

  const setVehicleStatus = async (id: string, status: 'Available' | 'Maintenance'): Promise<ActionResult> => {
    try {
      const updated = await liveMapService.setRescueUnitStatus(id, status);
      setUnits((prev) => prev.map((u) => (u.id === id ? updated : u)));
      return { ok: true };
    } catch (err) {
      refreshUnits();
      return { ok: false, message: getApiErrorMessage(err, i18n.t('context.vehicleStatusFailed')) };
    }
  };

  const saveVehicle = async (input: VehicleSaveInput, id?: string): Promise<ActionResult> => {
    try {
      let saved: RescueUnitResponseDto;
      if (id) {
        // Đọc lại xe ngay trước khi lưu: gửi lại đúng trạm / trạng thái hiện tại để không ghi đè trạng thái
        // luồng điều phối vừa đặt (Operator không được đổi trạm).
        const current = await liveMapService.getRescueUnit(id);
        saved = await liveMapService.updateRescueUnit(id, {
          plateNumber: input.plateNumber,
          unitType: input.unitType,
          status: current.status,
          stationId: current.stationId,
        });
      } else {
        saved = await liveMapService.createRescueUnit(input);
      }
      setUnits((prev) =>
        prev.some((u) => u.id === saved.id) ? prev.map((u) => (u.id === saved.id ? saved : u)) : [...prev, saved]
      );
      return { ok: true };
    } catch (err) {
      return { ok: false, message: getApiErrorMessage(err, i18n.t(id ? 'context.vehicleUpdateFailed' : 'context.vehicleCreateFailed')) };
    }
  };

  const resolveTrafficJam = async (id: string, note?: string): Promise<ActionResult> => {
    try {
      const dto = await liveMapService.resolveTrafficJam(id, note);
      // Backend cũ không trả dữ liệu → vẫn gỡ điểm khỏi bản đồ.
      if (dto) applyTrafficHotspot(dto);
      else setTrafficJams((prev) => prev.filter((j) => j.id !== id));
      return { ok: true };
    } catch (err) {
      if (isConflict(err)) reloadTrafficJams();
      return { ok: false, message: getApiErrorMessage(err, i18n.t('context.resolveTrafficFailed')) };
    }
  };

  const assignTrafficJam = async (id: string, rescueUnitId: string, notes?: string): Promise<ActionResult> => {
    try {
      applyTrafficHotspot(await liveMapService.assignTrafficJam(id, rescueUnitId, notes));
      return { ok: true };
    } catch (err) {
      // 409: điểm đã có xe / xe vừa bận → tải lại cả điểm ùn tắc và xe.
      if (isConflict(err)) {
        reloadTrafficJams();
        refreshUnits();
      }
      return { ok: false, message: getApiErrorMessage(err, i18n.t('liveMap.traffic.assignFailed')) };
    }
  };

  const unassignTrafficJam = async (id: string, reason: string): Promise<ActionResult> => {
    try {
      applyTrafficHotspot(await liveMapService.unassignTrafficJam(id, reason));
      return { ok: true };
    } catch (err) {
      if (isConflict(err)) reloadTrafficJams();
      return { ok: false, message: getApiErrorMessage(err, i18n.t('liveMap.traffic.unassignFailed')) };
    }
  };

  const dismissOperatorAlert = useCallback((id: string) => {
    setOperatorAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const dismissResponseNotice = (_incidentId: string, noticeId: string) => {
    setDismissedNoticeIds((prev) => new Set(prev).add(noticeId));
  };

  return (
    <DispatchContext.Provider
      value={{
        currentOperatorId: operator.id,
        vehicles,
        stations,
        trafficJams,
        resolveTrafficJam,
        assignTrafficJam,
        unassignTrafficJam,
        trafficAssignableUnits,
        fieldRequests,
        acknowledgeFieldRequest,
        fulfillFieldRequest,
        declineFieldRequest,
        assignForFieldRequest,
        assignTeams,
        setVehicleStatus,
        saveVehicle,
        escalationSettings,
        autoDispatchSettings,
        incidents,
        highlightIncidentIds,
        incidentsLoading,
        incidentsError,
        escalatedIncidentIds,
        incidentDrawerOpen,
        setIncidentDrawerOpen,
        approveIncident,
        reviewTrafficJam,
        rejectIncident,
        transferIncident,
        unlinkLinkedReport,
        changeIncidentSeverity,
        lockIncident,
        releaseIncident,
        createOperatorIncident,
        operatorNotesOf,
        revealReporterPhone,
        cancelAssignment,
        dismissResponseNotice,
        incomingIncidents,
        unseenCompletionIds,
        markCompletionSeen,
        dismissIncomingIncident,
        incomingTransferNotes,
        escalationTiers,
        serviceArea,
        incidentTypes,
        vehicleLimitFor,
        rescueUnitTypes,
        unitTypeLabel,
        incidentTypesOf,
        incidentKindLabel,
        operatorAlerts,
        dismissOperatorAlert,
        supplementVersions,
        stationNotAssigned,
        assignmentsByIncident,
      }}
    >
      {children}
    </DispatchContext.Provider>
  );
};

export function useDispatchStore(): DispatchContextValue {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error('useDispatchStore must be used within DispatchProvider');
  return ctx;
}
