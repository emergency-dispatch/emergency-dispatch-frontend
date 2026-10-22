import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_VEHICLES_BY_LEVEL } from '../data/dispatchConfig';
import { incidentService } from '../services/incidentService';
import { dispatchService } from '../services/dispatchService';
import {
  DEFAULT_ESCALATION_SETTINGS,
  liveMapService,
  mapTrafficHotspot,
  type EscalationSettingsDto,
  type TrafficHotspotResponseDto,
} from '../services/liveMapService';
import { stationTeamService } from '../services/stationTeamService';
import { HubEvents, incidentHubService, trackingHubService } from '../services/realtime/incidentHubService';
import { getApiErrorMessage } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import {
  mapIncidentResponseToIncident,
  severityToBackend,
  toOperatorStatus,
  type BlockDuration,
  type CrewResponseNotice,
  type Incident,
  type IncidentResponseDto,
  type SeverityLevel,
  type TrafficJamReport,
} from '../types/incident';
import type { BackendDispatchStatus, DispatchAssignmentResponseDto, RejectionReason } from '../types/dispatch';
import type { RescueUnitResponseDto } from '../types/rescueUnit';
import type { DispatchAlgorithm, DispatchVehicleType, Station, Vehicle, VehicleStatus } from '../types/vehicle';

// Poll dự phòng: SignalR đẩy sự cố / lượt phân công, nhưng trạng thái xe (VD hết hồi sức → Sẵn sàng)
// và khóa mềm của Operator khác không có sự kiện riêng.
const POLL_MS = 20000;
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

const REJECTION_REASON_LABEL: Record<RejectionReason, string> = {
  VehicleBreakdown: 'Xe/phương tiện hỏng hóc',
  AlreadyOnMission: 'Đang bận nhiệm vụ khác',
  TooFar: 'Quá xa vùng tiếp cận',
  MedicalLeave: 'Lý do sức khỏe',
  NoResponse: 'Quá thời gian không phản hồi',
  Other: 'Lý do khác',
};

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
}

type ActionResult = { ok: boolean; message?: string };

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
  approveIncident: (id: string, confirmedSeverity: SeverityLevel, operatorNotes?: string) => Promise<ActionResult>;
  rejectIncident: (id: string, reason: string, blockDuration?: BlockDuration | null) => Promise<ActionResult>;
  lockIncident: (id: string) => Promise<ActionResult>;
  releaseIncident: (id: string) => void;
  /** Số điện thoại đầy đủ (backend ghi vết), null nếu thất bại. */
  revealReporterPhone: (id: string) => Promise<string | null>;
  /** Giao 1 xe cho sự cố (1-click hoặc kéo-thả). Cấp 3 gọi nhiều lần, tối đa 5 xe. */
  assignVehicle: (vehicleId: string, incidentId: string, algorithm?: DispatchAlgorithm) => Promise<ActionResult>;
  cancelAssignment: (vehicleId: string) => Promise<ActionResult>;
  dismissResponseNotice: (incidentId: string, noticeId: string) => void;
}

const DispatchContext = createContext<DispatchContextValue | null>(null);

/**
 * Dữ liệu Command Center từ backend: hàng đợi + sự cố đang điều phối (/api/Incidents),
 * xe (/api/rescue-units), lượt phân công (/api/dispatch), trạm, điểm ùn tắc; cập nhật realtime qua
 * SignalR (/hubs/incidents, /hubs/tracking) kèm poll dự phòng.
 * Mounted once in OperatorLayout so data stays live across page navigation.
 */
export const DispatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const operator = { id: user?.id ?? '', name: user?.fullName ?? 'Bạn' };

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
  const knownIncidentIdsRef = useRef<Set<string> | null>(null);

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
      if (!queueRes.success) throw new Error(queueRes.message || 'Không thể tải hàng đợi sự cố.');

      const assignmentLists = await Promise.all(
        board.map((dto) => dispatchService.getAssignmentsByIncident(dto.id).then((res) => (res.success ? res.data : [])))
      );

      const fresh = [...queueRes.data, ...board];
      const freshIds = new Set(fresh.map((dto) => dto.id));
      setIncidentDtos((prev) => {
        // Sự cố vừa hoàn tất (nhận qua SignalR) không còn trong các danh sách đang mở —
        // giữ lại tới khi tải lại trang để Operator thấy kết quả.
        const keptCompleted = [...prev.values()].filter((dto) => dto.status === 'Completed' && !freshIds.has(dto.id));
        return new Map([...keptCompleted, ...fresh].map((dto) => [dto.id, dto]));
      });
      setAssignments((prev) => {
        const kept = [...prev.values()].filter((a) => !freshIds.has(a.incidentId));
        return new Map([...kept, ...assignmentLists.flat()].map((a) => [a.id, a]));
      });

      // Sự cố mới xuất hiện giữa hai lần poll (khi SignalR rớt) → nháy sáng.
      if (knownIncidentIdsRef.current) {
        const known = knownIncidentIdsRef.current;
        highlight(queueRes.data.filter((dto) => !known.has(dto.id)).map((dto) => dto.id));
      }
      knownIncidentIdsRef.current = new Set([...(knownIncidentIdsRef.current ?? []), ...freshIds]);
      setIncidentsError(null);
    } catch (err) {
      setIncidentsError(getApiErrorMessage(err, 'Không thể tải hàng đợi sự cố.'));
    } finally {
      setIncidentsLoading(false);
    }
  }, [highlight]);

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
  }, []);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, POLL_MS);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Realtime
  useEffect(() => {
    const unsubscribers = [
      incidentHubService.on<IncidentResponseDto>(HubEvents.ReceiveNewIncident, (dto) => {
        upsertIncidents([dto]);
        knownIncidentIdsRef.current?.add(dto.id);
        highlight([dto.id]);
      }),
      incidentHubService.on<IncidentResponseDto>(HubEvents.ReceiveIncidentUpdate, (dto) => upsertIncidents([dto])),
      incidentHubService.on<EscalationAlertMessage>(HubEvents.ReceiveEscalationAlert, (alert) => {
        incidentService
          .getById(alert.incidentId)
          .then((res) => res.success && upsertIncidents([res.data]))
          .catch(() => undefined);
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
      incidentHubService.onReconnected(refreshAll),
    ];
    incidentHubService.start();
    trackingHubService.start();

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      incidentHubService.stop();
      trackingHubService.stop();
    };
  }, [upsertIncidents, highlight, refreshUnits, refreshAll]);

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
          lat: live?.lat ?? unit.currentLat,
          lng: live?.lng ?? unit.currentLng,
          heading: live?.heading ?? 0,
          etaMinutes,
          incidentId: assignment?.incidentId ?? null,
          lastUpdated: live?.at ?? unit.lastLocationUpdateAt ?? unit.updatedAt ?? unit.createdAt,
          assignmentId: assignment?.id ?? null,
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
          reason: [a.rejectionReason ? REJECTION_REASON_LABEL[a.rejectionReason] : null, a.rejectionNotes]
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
  }, [incidentDtos, assignments, dismissedNoticeIds]);

  const escalatedIncidentIds = useMemo(
    () => new Set(incidents.filter((i) => i.escalated).map((i) => i.id)),
    [incidents]
  );

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const approveIncident = async (id: string, confirmedSeverity: SeverityLevel, operatorNotes?: string) => {
    try {
      const res = await incidentService.verify(id, {
        confirmedSeverity: severityToBackend(confirmedSeverity),
        operatorNotes,
      });
      if (!res.success) return { ok: false, message: res.message || 'Xác minh sự cố thất bại.' };
      // Không tự gán xe: sự cố đã duyệt chờ Operator chọn xe từ gợi ý điều phối trên Live Map.
      upsertIncidents([res.data]);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: getApiErrorMessage(err, 'Xác minh sự cố thất bại.') };
    }
  };

  const rejectIncident = async (id: string, reason: string, blockDuration: BlockDuration | null = null) => {
    try {
      const res = await incidentService.cancel(id, reason);
      if (!res.success) return { ok: false, message: res.message || 'Hủy sự cố thất bại.' };
      setIncidentDtos((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      // Backend trả các xe đang giao về Sẵn sàng.
      refreshUnits();
    } catch (err) {
      return { ok: false, message: getApiErrorMessage(err, 'Hủy sự cố thất bại.') };
    }

    if (!blockDuration) return { ok: true };
    try {
      const blockRes = await incidentService.blockReporterPhone(id, blockDuration, reason);
      if (!blockRes.success) {
        setIncidentsError(`Đã hủy ca nhưng chặn số điện thoại thất bại: ${blockRes.message}`);
      }
    } catch (err) {
      setIncidentsError(`Đã hủy ca nhưng chặn số điện thoại thất bại: ${getApiErrorMessage(err)}`);
    }
    return { ok: true };
  };

  const setIncidentLock = (
    id: string,
    lock: Pick<IncidentResponseDto, 'lockedByOperatorId' | 'lockedByOperatorName' | 'lockExpiresAt'>
  ) => {
    setIncidentDtos((prev) => {
      const dto = prev.get(id);
      return dto ? new Map(prev).set(id, { ...dto, ...lock }) : prev;
    });
  };

  const lockIncident = async (id: string): Promise<ActionResult> => {
    try {
      const res = await incidentService.lock(id);
      if (!res.success) return { ok: false, message: res.message || 'Ca đang được điều phối viên khác xử lý.' };
      setIncidentLock(id, {
        lockedByOperatorId: res.data.lockedByOperatorId,
        lockedByOperatorName: res.data.lockedByOperatorName,
        lockExpiresAt: res.data.lockExpiresAt,
      });
      return { ok: true };
    } catch (err) {
      // 409: người khác đang giữ — tải lại để hiện đúng tên người giữ khóa.
      refreshBoard();
      return { ok: false, message: getApiErrorMessage(err, 'Không thể nhận ca xử lý.') };
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
    algorithm: DispatchAlgorithm = 'nearest'
  ): Promise<ActionResult> => {
    const incident = incidents.find((i) => i.id === incidentId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!incident || !vehicle) return { ok: false, message: 'Không tìm thấy sự cố hoặc xe.' };
    if (vehicle.status !== 'available') return { ok: false, message: `Xe ${vehicle.plate} không còn sẵn sàng.` };

    const maxVehicles = MAX_VEHICLES_BY_LEVEL[incident.severity];
    const activeCount = incident.assignedVehicleIds.length - incident.reportedVehicleIds.length;
    if (activeCount >= maxVehicles) {
      return {
        ok: false,
        message:
          maxVehicles === 1 ? 'Sự cố Cấp 1–2 chỉ được giao 1 xe.' : `Sự cố Cấp 3 được giao tối đa ${maxVehicles} xe.`,
      };
    }

    try {
      const res = await dispatchService.assignUnit({
        incidentId,
        rescueUnitId: vehicleId,
        algorithm: BACKEND_ALGORITHM[algorithm],
      });
      if (!res.success) return { ok: false, message: `${res.message || 'Giao xe thất bại.'} (${vehicle.plate})` };
      setAssignments((prev) => upsert(prev, res.data));
      return { ok: true };
    } catch (err) {
      // HTTP 409: xe vừa bị Operator khác giao trước → tải lại trạng thái xe để không gợi ý lại.
      refreshUnits();
      return { ok: false, message: `${getApiErrorMessage(err, 'Giao xe thất bại.')} (${vehicle.plate})` };
    }
  };

  // Hủy lệnh điều phối của một xe — không tự gán xe thay thế, Operator chọn lại từ gợi ý.
  const cancelAssignment = async (vehicleId: string): Promise<ActionResult> => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle?.assignmentId) return { ok: false, message: 'Xe không có lượt điều phối đang chạy.' };
    try {
      const res = await dispatchService.updateAssignmentStatus(vehicle.assignmentId, {
        status: 'Cancelled',
        notes: 'Điều phối viên hủy giao xe.',
      });
      if (!res.success) return { ok: false, message: res.message || 'Hủy giao xe thất bại.' };
      setAssignments((prev) => upsert(prev, [res.data]));
      refreshUnits();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: getApiErrorMessage(err, 'Hủy giao xe thất bại.') };
    }
  };

  const resolveTrafficJam = async (id: string): Promise<ActionResult> => {
    try {
      await liveMapService.resolveTrafficJam(id);
      setTrafficJams((prev) => prev.filter((j) => j.id !== id));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: getApiErrorMessage(err, 'Không thể giải tỏa điểm ùn tắc.') };
    }
  };

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
        lockIncident,
        releaseIncident,
        revealReporterPhone,
        assignVehicle,
        cancelAssignment,
        dismissResponseNotice,
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
