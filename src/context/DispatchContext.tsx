import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { MAX_VEHICLES_BY_LEVEL } from '../data/dispatchConfig';
import { incidentService } from '../services/incidentService';
import { dispatchService } from '../services/dispatchService';
import {
  DEFAULT_ESCALATION_SETTINGS,
  liveMapService,
  mapTrafficHotspot,
  type EscalationSettingsDto,
  type ServiceAreaDto,
  type TrafficHotspotResponseDto,
} from '../services/liveMapService';
import { stationTeamService } from '../services/stationTeamService';
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
  type CrewResponseNotice,
  type Incident,
  type IncidentCategory,
  type IncidentResponseDto,
  type OperatorCancellationCode,
  type SeverityLevel,
  type TrafficJamReport,
} from '../types/incident';
import type { BackendDispatchStatus, DispatchAssignmentResponseDto } from '../types/dispatch';
import type { RescueUnitResponseDto, RescueUnitType } from '../types/rescueUnit';
import type { DispatchAlgorithm, DispatchVehicleType, Station, Vehicle, VehicleStatus } from '../types/vehicle';

// Poll dự phòng: sự cố, lượt phân công, trạng thái xe, khóa mềm đều có sự kiện SignalR — poll chỉ để bù khi mất kết nối.
const POLL_MS = 60000;
// Còi leo thang cấp 2 (cần trạm khác hỗ trợ) kêu trong khoảng này rồi tự tắt.
const TIER2_SIREN_MS = 4000;
// Thông báo "xe trạm bạn đi hỗ trợ" / "sự cố đã chuyển trạm" tự đóng sau khoảng này; cảnh báo ngoài khu vực giữ tới khi đóng.
const INFO_ALERT_MS = 15000;
const HIGHLIGHT_DURATION_MS = 2200;

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
const UNIT_TYPE_TO_VEHICLE_TYPE: Record<string, DispatchVehicleType | undefined> = {
  Ambulance: 'ambulance',
  FireTruck: 'fire_truck',
  LadderTruck: 'fire_truck',
  HeavyRescueVehicle: 'rescue',
  RescueBoat: 'rescue',
};
const BACKEND_ALGORITHM = { nearest: 'NearestAvailable', load_aware: 'LoadAware' } as const;


interface LivePosition {
  lat: number;
  lng: number;
  heading: number | null;
  at: string;
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
  toStationId: string;
  toStationName?: string | null;
  reason: string;
  transferredByName?: string | null;
}

/** Thông báo vận hành theo trạm (ngoài tin báo mới): SOS ngoài khu vực, xe đi hỗ trợ, sự cố chuyển trạm. */
export interface OperatorAlert {
  id: string;
  kind: 'out_of_area' | 'support_dispatched' | 'transferred';
  incidentId: string;
  title: string;
  message: string;
  at: string;
}

/** Giao thêm tổ cho sự cố Cấp 1–2 (backend cho phép khi có lý do ≥ 5 ký tự). */
export interface AssignOptions {
  allowExtraUnits?: boolean;
  notes?: string;
}

type ActionResult = { ok: boolean; message?: string };

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
  /** Đánh dấu điểm ùn tắc đã giải tỏa (PUT /api/traffic/{id}/resolve). */
  resolveTrafficJam: (id: string) => Promise<ActionResult>;
  /** Màn Đội xe: đặt xe Bảo trì / đưa trở lại Sẵn sàng (xe đang làm nhiệm vụ bị backend chặn). */
  setVehicleStatus: (id: string, status: 'Available' | 'Maintenance') => Promise<ActionResult>;
  /**
   * Màn Đội xe: thêm xe vào trạm mình (không truyền `id`) hoặc sửa biển số / chủng loại.
   * Xóa xe và chuyển trạm chỉ Admin làm.
   */
  saveVehicle: (input: VehicleSaveInput, id?: string) => Promise<ActionResult>;
  escalationSettings: EscalationSettingsDto;
  incidents: Incident[];
  highlightIncidentIds: Set<string>;
  incidentsLoading: boolean;
  incidentsError: string | null;
  /** Sự cố backend đã leo thang (status Escalated). */
  escalatedIncidentIds: Set<string>;
  /** Drawer chi tiết sự cố đang mở — banner leo thang tự thu gọn để không che Drawer. */
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
    category?: IncidentCategory
  ) => Promise<ActionResult>;
  rejectIncident: (
    id: string,
    reason: string,
    blockDuration?: BlockDuration | null,
    reasonCode?: OperatorCancellationCode
  ) => Promise<ActionResult>;
  /** Chuyển sự cố sang trạm khác phụ trách (lý do ≥ 5 ký tự). */
  transferIncident: (id: string, stationId: string, reason: string) => Promise<ActionResult>;
  lockIncident: (id: string) => Promise<ActionResult>;
  releaseIncident: (id: string) => void;
  /** Số điện thoại đầy đủ (backend ghi vết), null nếu thất bại. */
  revealReporterPhone: (id: string) => Promise<string | null>;
  /** Giao 1 xe cho sự cố (1-click hoặc kéo-thả). Cấp 3 gọi nhiều lần, tối đa 5 xe. */
  assignVehicle: (
    vehicleId: string,
    incidentId: string,
    algorithm?: DispatchAlgorithm,
    options?: AssignOptions
  ) => Promise<ActionResult>;
  cancelAssignment: (vehicleId: string) => Promise<ActionResult>;
  dismissResponseNotice: (incidentId: string, noticeId: string) => void;
  /** Sự cố mới báo tới, còn chờ duyệt và Operator chưa đóng thông báo (mới nhất trước). */
  incomingIncidents: Incident[];
  dismissIncomingIncident: (id: string) => void;
  /** Cấp leo thang mới nhất theo sự cố (1 hoặc 2); không có = chưa nhận cảnh báo leo thang nào. */
  escalationTiers: Map<string, number>;
  /** Khu vực phục vụ (vẽ vòng trên Live Map khi enabled). */
  serviceArea: ServiceAreaDto | null;
  operatorAlerts: OperatorAlert[];
  dismissOperatorAlert: (id: string) => void;
  /** Tài khoản chưa được Admin gán trạm phụ trách → các màn Operator hiện hướng dẫn thay vì dữ liệu. */
  stationNotAssigned: string | null;
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
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<Set<string>>(new Set());
  const [highlightIncidentIds, setHighlightIncidentIds] = useState<Set<string>>(new Set());
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [incidentDrawerOpen, setIncidentDrawerOpen] = useState(false);
  const [incomingIds, setIncomingIds] = useState<string[]>([]);
  const [escalationTiers, setEscalationTiers] = useState<Map<string, number>>(new Map());
  const [serviceArea, setServiceArea] = useState<ServiceAreaDto | null>(null);
  const [operatorAlerts, setOperatorAlerts] = useState<OperatorAlert[]>([]);
  const [stationNotAssigned, setStationNotAssigned] = useState<string | null>(null);
  const knownIncidentIdsRef = useRef<Set<string> | null>(null);
  const myStationIdRef = useRef(user?.stationId ?? null);
  myStationIdRef.current = user?.stationId ?? null;
  // Lượt điều phối hiện có — để biết lượt nào vừa kết thúc giữa hai lần poll.
  const assignmentsRef = useRef(assignments);
  assignmentsRef.current = assignments;
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

  /** Sự cố mới báo tới → hiện thông báo nổi + bíp (Operator có thể đang ở Live Map, không nhìn hàng đợi). */
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
      dtos.forEach((dto) => (toOperatorStatus(dto) === null ? next.delete(dto.id) : next.set(dto.id, dto)));
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
        announceIncoming(arrived);
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

  const refreshAll = useCallback(() => {
    refreshBoard();
    refreshUnits();
  }, [refreshBoard, refreshUnits]);

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
      .getActiveTrafficJams()
      .then(setTrafficJams)
      .catch((err) => console.warn('Không tải được điểm ùn tắc:', err));
    liveMapService
      .getEscalationSettings()
      .then(setEscalationSettings)
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
        announceIncoming([dto.id]);
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
      incidentHubService.on<TeamChangedEvent>(HubEvents.ReceiveTeamChanged, (evt) => {
        stationTeamService.reloadStationTeams(evt.stationId).catch(() => undefined);
        if (evt.action === 'MembersChanged') stationTeamService.loadStaff().catch(() => undefined);
      }),
      incidentHubService.on<SettingsChangedEvent>(HubEvents.ReceiveSettingsChanged, (evt) => {
        if (evt.key === 'escalation') liveMapService.getEscalationSettings().then(setEscalationSettings).catch(() => undefined);
        if (evt.key === 'serviceArea') liveMapService.getServiceArea().then(setServiceArea).catch(() => undefined);
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
        // Trạm nhận sẽ nhận thêm ReceiveNewIncident; trạm cũ bỏ sự cố khỏi danh sách.
        if (evt.toStationId === myStationIdRef.current) return;
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
        setAssignments((prev) => upsert(prev, [a]));
        // Xe đổi trạng thái theo lượt phân công (hoàn tất → hồi sức, hủy → sẵn sàng).
        if (!isActiveAssignment(a)) refreshUnits();
      }),
      incidentHubService.on<TrafficHotspotResponseDto>(HubEvents.ReceiveTrafficHotspot, (dto) =>
        setTrafficJams((prev) => {
          const rest = prev.filter((j) => j.id !== dto.id);
          return dto.isActive ? [...rest, mapTrafficHotspot(dto)] : rest;
        })
      ),
      trackingHubService.on<UnitLocationMessage>(HubEvents.ReceiveRescueUnitLocation, (msg) =>
        setPositions((prev) =>
          new Map(prev).set(msg.rescueUnitId, {
            lat: msg.latitude,
            lng: msg.longitude,
            heading: msg.headingDegrees ?? null,
            at: msg.timestampUtc,
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
  }, [upsertIncidents, highlight, announceIncoming, refreshUnits, refreshAll, setIncidentLock, removeIncident, pushOperatorAlert]);

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

  const vehicles = useMemo<Vehicle[]>(() => {
    const now = Date.now();
    return units.flatMap((unit) => {
      const type = UNIT_TYPE_TO_VEHICLE_TYPE[unit.unitType];
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
          status,
          stationId: unit.stationId,
          stationName: unit.stationName,
          unitStatus: unit.status,
          lat: live?.lat ?? unit.currentLat,
          lng: live?.lng ?? unit.currentLng,
          heading: live?.heading ?? 0,
          etaMinutes,
          incidentId: assignment?.incidentId ?? null,
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

  const incidents = useMemo<Incident[]>(() => {
    const byIncident = new Map<string, DispatchAssignmentResponseDto[]>();
    assignments.forEach((a) => byIncident.set(a.incidentId, [...(byIncident.get(a.incidentId) ?? []), a]));

    const list = [...incidentDtos.values()].map((dto): Incident => {
      const incident = mapIncidentResponseToIncident(dto);
      const own = byIncident.get(dto.id) ?? [];
      const notices: CrewResponseNotice[] = own
        .filter((a) => a.status === 'Rejected' && !dismissedNoticeIds.has(a.id))
        .map((a) => ({
          id: a.id,
          vehicleId: a.rescueUnitId,
          plate: a.rescueUnit?.plateNumber ?? '—',
          kind: a.rejectionReason === 'NoResponse' ? 'timeout' : 'rejected',
          reason: [a.rejectionReason ? t(`enums.rejectionReason.${a.rejectionReason}`) : null, a.rejectionNotes]
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
  }, [incidentDtos, assignments, dismissedNoticeIds, t]);

  // Thông báo tự biến mất khi sự cố không còn chờ duyệt (đã duyệt / bị hủy, kể cả bởi Operator khác).
  const incomingIncidents = useMemo(() => {
    const byId = new Map(incidents.map((i) => [i.id, i]));
    return incomingIds.map((id) => byId.get(id)).filter((i): i is Incident => i?.status === 'pending');
  }, [incomingIds, incidents]);

  const dismissIncomingIncident = useCallback((id: string) => {
    setIncomingIds((prev) => prev.filter((x) => x !== id));
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
    category?: IncidentCategory
  ) => {
    try {
      const res = await incidentService.verify(id, {
        confirmedSeverity: severityToBackend(confirmedSeverity),
        confirmedEventType: category && category !== 'unknown' ? EVENT_TYPE_FROM_CATEGORY[category] : undefined,
        operatorNotes,
      });
      if (!res.success) return { ok: false, message: res.message || i18n.t('context.verifyFailed') };
      // Không tự gán xe: sự cố đã duyệt chờ Operator chọn xe từ gợi ý điều phối trên Live Map.
      upsertIncidents([res.data]);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: getApiErrorMessage(err, i18n.t('context.verifyFailed')) };
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

  const transferIncident = async (id: string, stationId: string, reason: string): Promise<ActionResult> => {
    try {
      const res = await incidentService.transfer(id, stationId, reason);
      if (!res.success) return { ok: false, message: res.message || i18n.t('context.transferFailed') };
      removeIncident(id);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: getApiErrorMessage(err, i18n.t('context.transferFailed')) };
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

  const revealReporterPhone = async (id: string): Promise<string | null> => {
    try {
      const res = await incidentService.revealPhone(id);
      return res.success ? (res.data.phoneNumber ?? null) : null;
    } catch {
      return null;
    }
  };

  const assignVehicle = async (
    vehicleId: string,
    incidentId: string,
    algorithm: DispatchAlgorithm = 'nearest',
    options: AssignOptions = {}
  ): Promise<ActionResult> => {
    const incident = incidents.find((i) => i.id === incidentId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!incident || !vehicle) return { ok: false, message: i18n.t('context.incidentOrVehicleNotFound') };
    if (vehicle.status !== 'available') return { ok: false, message: i18n.t('context.vehicleNotAvailable', { plate: vehicle.plate }) };

    const maxVehicles = MAX_VEHICLES_BY_LEVEL[incident.severity];
    const activeCount = incident.assignedVehicleIds.length - incident.reportedVehicleIds.length;
    // Cấp 1–2 được giao thêm khi có lý do; Cấp 3 tối đa 5 xe, không vượt được.
    const extraAllowed = !!options.allowExtraUnits && incident.severity !== 3;
    if (activeCount >= maxVehicles && !extraAllowed) {
      return {
        ok: false,
        message:
          maxVehicles === 1 ? i18n.t('context.singleVehicleOnly') : i18n.t('context.maxVehicles', { max: maxVehicles }),
      };
    }

    try {
      const res = await dispatchService.assignUnit({
        incidentId,
        rescueUnitId: vehicleId,
        algorithm: BACKEND_ALGORITHM[algorithm],
        ...(extraAllowed ? { allowExtraUnits: true, notes: options.notes?.trim() } : {}),
      });
      if (!res.success) return { ok: false, message: `${res.message || i18n.t('context.assignFailed')} (${vehicle.plate})` };
      setAssignments((prev) => upsert(prev, res.data));
      return { ok: true };
    } catch (err) {
      // HTTP 409: xe vừa bị Operator khác giao trước → tải lại trạng thái xe để không gợi ý lại.
      refreshUnits();
      return { ok: false, message: `${getApiErrorMessage(err, i18n.t('context.assignFailed'))} (${vehicle.plate})` };
    }
  };

  // Hủy lệnh điều phối của một xe — không tự gán xe thay thế, Operator chọn lại từ gợi ý.
  const cancelAssignment = async (vehicleId: string): Promise<ActionResult> => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle?.assignmentId) return { ok: false, message: i18n.t('context.noActiveAssignment') };
    try {
      const res = await dispatchService.updateAssignmentStatus(vehicle.assignmentId, {
        status: 'Cancelled',
        notes: 'Điều phối viên hủy giao xe.',
      });
      if (!res.success) return { ok: false, message: res.message || i18n.t('context.unassignFailed') };
      setAssignments((prev) => upsert(prev, [res.data]));
      refreshUnits();
      return { ok: true };
    } catch (err) {
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

  const resolveTrafficJam = async (id: string): Promise<ActionResult> => {
    try {
      await liveMapService.resolveTrafficJam(id);
      setTrafficJams((prev) => prev.filter((j) => j.id !== id));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: getApiErrorMessage(err, i18n.t('context.resolveTrafficFailed')) };
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
        setVehicleStatus,
        saveVehicle,
        escalationSettings,
        incidents,
        highlightIncidentIds,
        incidentsLoading,
        incidentsError,
        escalatedIncidentIds,
        incidentDrawerOpen,
        setIncidentDrawerOpen,
        approveIncident,
        rejectIncident,
        transferIncident,
        lockIncident,
        releaseIncident,
        revealReporterPhone,
        assignVehicle,
        cancelAssignment,
        dismissResponseNotice,
        incomingIncidents,
        dismissIncomingIncident,
        escalationTiers,
        serviceArea,
        operatorAlerts,
        dismissOperatorAlert,
        stationNotAssigned,
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
