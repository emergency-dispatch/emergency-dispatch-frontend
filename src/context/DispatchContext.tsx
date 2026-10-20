import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CREW_RESPONSE, MOCK_CREW_RESPONSES, MOCK_ON_SCENE_DURATION_MS, vehicleSeeds } from '../data/liveMapMock';
import { CREW_ACK_TIMEOUT_MS, MAX_VEHICLES_BY_LEVEL, VEHICLE_RECOVERY_MS } from '../data/dispatchConfig';
import { incidentService } from '../services/incidentService';
import { dispatchService } from '../services/dispatchService';
import { getApiErrorMessage } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import { useNow } from '../hooks/useNow';
import { mapIncidentResponseToIncident, severityToBackend } from '../types/incident';
import { estimateEtaMinutes, haversineKm } from '../utils/dispatch';
import { isIncidentEscalated } from '../utils/escalation';
import type { Vehicle } from '../types/vehicle';
import type { BlockDuration, CrewResponseNotice, Incident, IncidentLock, SeverityLevel } from '../types/incident';

const VEHICLE_TICK_MS = 2500;
const VEHICLE_STEP_FRACTION = 0.08;
const ARRIVAL_THRESHOLD = 0.0006;
const QUEUE_POLL_MS = 20000;
const CREW_TICK_MS = 1000;
const ACCEPTED_TO_EN_ROUTE_MS = 3000;
const ESCALATION_CHECK_MS = 5000;

// Giai đoạn nhiệm vụ của từng xe đã giao (mô phỏng phản hồi Staff App).
interface CrewAssignment {
  incidentId: string;
  phase: 'awaiting' | 'accepted' | 'en_route' | 'on_scene' | 'recovering';
  ackDeadline: number;
  respondAt: number;
  nextAt: number;
}
const HIGHLIGHT_DURATION_MS = 2200;
function sortByPriority(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

const isLockActive = (lock: IncidentLock | null) => !!lock && new Date(lock.expiresAt).getTime() > Date.now();

interface DispatchContextValue {
  currentOperatorId: string;
  vehicles: Vehicle[];
  incidents: Incident[];
  highlightIncidentIds: Set<string>;
  incidentsLoading: boolean;
  incidentsError: string | null;
  /** Sự cố Cấp 3 quá ngưỡng chưa có đội nhận (Escalated). */
  escalatedIncidentIds: Set<string>;
  /** Drawer chi tiết sự cố đang mở — banner leo thang tự thu gọn để không che Drawer. */
  incidentDrawerOpen: boolean;
  setIncidentDrawerOpen: (open: boolean) => void;
  approveIncident: (
    id: string,
    confirmedSeverity: SeverityLevel,
    operatorNotes?: string
  ) => Promise<boolean>;
  rejectIncident: (id: string, reason: string, blockDuration?: BlockDuration | null) => Promise<boolean>;
  lockIncident: (id: string) => Promise<{ ok: boolean; message?: string }>;
  releaseIncident: (id: string) => void;
  revealReporterPhone: (id: string) => Promise<boolean>;
  /** Giao 1 xe cho sự cố (1-click hoặc kéo-thả). Cấp 3 gọi nhiều lần, tối đa 5 xe. */
  assignVehicle: (vehicleId: string, incidentId: string) => Promise<{ ok: boolean; message?: string }>;
  cancelAssignment: (vehicleId: string) => void;
  dismissResponseNotice: (incidentId: string, noticeId: string) => void;
}

const DispatchContext = createContext<DispatchContextValue | null>(null);

/**
 * Owns incident-queue data (real API: GET/PUT /api/Incidents/*) and the
 * vehicle-position simulation (mock — no backend Vehicle/Dispatch API yet).
 * Mounted once in OperatorLayout so both keep running across page navigation,
 * and so Incident Queue approvals are immediately visible in Live Map's dispatch panel.
 */
export const DispatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const operator = { id: user?.id ?? 'local-operator', name: user?.fullName ?? 'Bạn' };
  const [vehicles, setVehicles] = useState<Vehicle[]>(vehicleSeeds);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [highlightIncidentIds, setHighlightIncidentIds] = useState<Set<string>>(new Set());
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const targetsRef = useRef(new Map(vehicleSeeds.filter((v) => v.target).map((v) => [v.id, v.target!])));
  const crewRef = useRef(new Map<string, CrewAssignment>());
  const [incidentDrawerOpen, setIncidentDrawerOpen] = useState(false);
  const vehiclesRef = useRef(vehicles);
  useEffect(() => {
    vehiclesRef.current = vehicles;
  }, [vehicles]);

  // Mô phỏng phản hồi đội cứu hộ: 120s Chấp nhận/Từ chối → Accepted → EnRoute → OnScene
  // → nộp báo cáo → hồi sức 5 phút → Available. TODO(backend): thay bằng sự kiện SignalR từ Staff App.
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const vehicleUpdates = new Map<string, Partial<Vehicle>>();
      const releases: Array<{ vehicleId: string; incidentId: string; notice: CrewResponseNotice }> = [];
      const reports: Array<{ vehicleId: string; incidentId: string }> = [];

      crewRef.current.forEach((a, vehicleId) => {
        const response = MOCK_CREW_RESPONSES[vehicleId] ?? DEFAULT_CREW_RESPONSE;
        const plate = vehiclesRef.current.find((v) => v.id === vehicleId)?.plate ?? vehicleId;
        const makeNotice = (kind: CrewResponseNotice['kind'], reason: string): CrewResponseNotice => ({
          id: `${vehicleId}-${now}`,
          vehicleId,
          plate,
          kind,
          reason,
          at: new Date(now).toISOString(),
        });

        if (a.phase === 'awaiting') {
          if (response.kind === 'reject' && now >= a.respondAt) {
            releases.push({ vehicleId, incidentId: a.incidentId, notice: makeNotice('rejected', response.reason) });
            crewRef.current.delete(vehicleId);
          } else if (response.kind === 'accept' && now >= a.respondAt) {
            a.phase = 'accepted';
            a.nextAt = now + ACCEPTED_TO_EN_ROUTE_MS;
            vehicleUpdates.set(vehicleId, { status: 'accepted', ackDeadline: null });
          } else if (now >= a.ackDeadline) {
            releases.push({
              vehicleId,
              incidentId: a.incidentId,
              notice: makeNotice('timeout', 'Quá 120 giây không phản hồi'),
            });
            crewRef.current.delete(vehicleId);
          }
        } else if (a.phase === 'accepted' && now >= a.nextAt) {
          a.phase = 'en_route';
          vehicleUpdates.set(vehicleId, { status: 'en_route' });
        } else if (a.phase === 'en_route') {
          if (vehiclesRef.current.find((v) => v.id === vehicleId)?.status === 'on_scene') {
            a.phase = 'on_scene';
            a.nextAt = now + MOCK_ON_SCENE_DURATION_MS;
          }
        } else if (a.phase === 'on_scene' && now >= a.nextAt) {
          a.phase = 'recovering';
          a.nextAt = now + VEHICLE_RECOVERY_MS;
          reports.push({ vehicleId, incidentId: a.incidentId });
          vehicleUpdates.set(vehicleId, {
            status: 'recovering',
            incidentId: null,
            etaMinutes: null,
            recoveryUntil: new Date(a.nextAt).toISOString(),
          });
        } else if (a.phase === 'recovering' && now >= a.nextAt) {
          crewRef.current.delete(vehicleId);
          vehicleUpdates.set(vehicleId, { status: 'available', recoveryUntil: null });
        }
      });

      if (vehicleUpdates.size === 0 && releases.length === 0) return;

      releases.forEach((r) => targetsRef.current.delete(r.vehicleId));
      const releasedIds = new Set(releases.map((r) => r.vehicleId));
      const stamp = new Date(now).toISOString();
      setVehicles((prev) =>
        prev.map((v) => {
          if (releasedIds.has(v.id)) {
            return { ...v, status: 'available', incidentId: null, etaMinutes: null, ackDeadline: null, lastUpdated: stamp };
          }
          const update = vehicleUpdates.get(v.id);
          return update ? { ...v, ...update, lastUpdated: stamp } : v;
        })
      );

      if (releases.length === 0 && reports.length === 0) return;
      setIncidents((prev) =>
        prev.map((i) => {
          const released = releases.filter((r) => r.incidentId === i.id);
          const reported = reports.filter((r) => r.incidentId === i.id).map((r) => r.vehicleId);
          if (released.length === 0 && reported.length === 0) return i;

          const releasedVehicleIds = new Set(released.map((r) => r.vehicleId));
          const assignedVehicleIds = i.assignedVehicleIds.filter((id) => !releasedVehicleIds.has(id));
          const reportedVehicleIds = [...i.reportedVehicleIds, ...reported];
          // Ca nhiều xe chỉ đóng khi tất cả xe đã giao đều nộp báo cáo.
          const allReported =
            assignedVehicleIds.length > 0 && assignedVehicleIds.every((id) => reportedVehicleIds.includes(id));

          return {
            ...i,
            assignedVehicleIds,
            reportedVehicleIds,
            responseNotices: [...i.responseNotices, ...released.map((r) => r.notice)],
            ...(allReported && i.status === 'approved' ? { status: 'completed' as const, completedAt: stamp } : {}),
          };
        })
      );
    }, CREW_TICK_MS);

    return () => clearInterval(interval);
  }, []);

  // Vehicle movement simulation — unchanged, still mock (no Vehicle entity on the backend yet).
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles((prev) =>
        prev.map((v) => {
          const target = targetsRef.current.get(v.id);
          if (v.status !== 'en_route' || !target) return v;

          const dLat = target.lat - v.lat;
          const dLng = target.lng - v.lng;
          const dist = Math.hypot(dLat, dLng);

          if (dist < ARRIVAL_THRESHOLD) {
            targetsRef.current.delete(v.id);
            return { ...v, status: 'on_scene', etaMinutes: null, lastUpdated: new Date().toISOString() };
          }

          const heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
          return {
            ...v,
            lat: v.lat + dLat * VEHICLE_STEP_FRACTION,
            lng: v.lng + dLng * VEHICLE_STEP_FRACTION,
            heading,
            etaMinutes: v.etaMinutes && v.etaMinutes > 1 ? v.etaMinutes - 1 : v.etaMinutes,
            lastUpdated: new Date().toISOString(),
          };
        })
      );
    }, VEHICLE_TICK_MS);

    return () => clearInterval(interval);
  }, []);

  // Incident queue: fetch real data + poll (no SignalR/realtime push on the backend yet).
  const refreshQueue = useCallback(async (isInitial: boolean) => {
    try {
      const res = await incidentService.getQueue();
      if (!res.success) {
        setIncidentsError(res.message || 'Không thể tải hàng đợi sự cố.');
        return;
      }

      const fetched = res.data.map(mapIncidentResponseToIncident);
      const freshIds = new Set(fetched.map((i) => i.id));

      setIncidents((prev) => {
        // Backend chưa trả trạng thái khóa → giữ khóa cục bộ còn hiệu lực qua các lần poll.
        const prevById = new Map(prev.map((i) => [i.id, i]));
        const fresh = fetched.map((i) => {
          const localLock = prevById.get(i.id)?.lock ?? null;
          return i.lock || !isLockActive(localLock) ? i : { ...i, lock: localLock };
        });

        if (!isInitial) {
          const seenIds = new Set(prev.map((i) => i.id));
          const newlyArrivedIds = fresh.filter((i) => !seenIds.has(i.id)).map((i) => i.id);
          if (newlyArrivedIds.length > 0) {
            setHighlightIncidentIds((h) => new Set([...h, ...newlyArrivedIds]));
            setTimeout(() => {
              setHighlightIncidentIds((h) => {
                const next = new Set(h);
                newlyArrivedIds.forEach((id) => next.delete(id));
                return next;
              });
            }, HIGHLIGHT_DURATION_MS);
          }
        }

        // Locally-approved incidents already dropped off the backend queue (status
        // moved to Verified) but Live Map's dispatch panel still needs them visible.
        const keepLocal = prev.filter((i) => i.status !== 'pending' && !freshIds.has(i.id));
        return sortByPriority([...keepLocal, ...fresh]);
      });
      setIncidentsError(null);
    } catch (err) {
      setIncidentsError(getApiErrorMessage(err, 'Không thể tải hàng đợi sự cố.'));
    } finally {
      if (isInitial) setIncidentsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshQueue(true);
    const interval = setInterval(() => refreshQueue(false), QUEUE_POLL_MS);
    return () => clearInterval(interval);
  }, [refreshQueue]);

  const approveIncident = async (
    id: string,
    confirmedSeverity: SeverityLevel,
    operatorNotes?: string
  ): Promise<boolean> => {
    try {
      const res = await incidentService.verify(id, {
        confirmedSeverity: severityToBackend(confirmedSeverity),
        operatorNotes,
      });
      if (!res.success) {
        setIncidentsError(res.message || 'Xác minh sự cố thất bại.');
        return false;
      }
      setIncidents((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'approved', severity: confirmedSeverity } : i))
      );
      setIncidentsError(null);
      // Không tự gán xe: sự cố đã duyệt chờ Operator chọn xe từ gợi ý điều phối trên Live Map.
      return true;
    } catch (err) {
      setIncidentsError(getApiErrorMessage(err, 'Xác minh sự cố thất bại.'));
      return false;
    }
  };

  const rejectIncident = async (
    id: string,
    reason: string,
    blockDuration: BlockDuration | null = null
  ): Promise<boolean> => {
    try {
      const res = await incidentService.cancel(id, reason);
      if (!res.success) {
        setIncidentsError(res.message || 'Hủy sự cố thất bại.');
        return false;
      }
      if (blockDuration) {
        const blockRes = await incidentService.blockReporterPhone(id, blockDuration);
        if (!blockRes.success) {
          setIncidentsError(blockRes.message || 'Đã hủy ca nhưng chặn số điện thoại thất bại.');
        }
      }
      // Sự cố đã điều xe (hủy từ Dispatch Panel) → trả các xe về Available.
      incidents.find((i) => i.id === id)?.assignedVehicleIds.forEach(releaseVehicleLocally);
      setIncidents((prev) => prev.filter((i) => i.id !== id));
      setIncidentsError(null);
      return true;
    } catch (err) {
      setIncidentsError(getApiErrorMessage(err, 'Hủy sự cố thất bại.'));
      return false;
    }
  };

  const setIncidentLock = (id: string, lock: IncidentLock | null) => {
    setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, lock } : i)));
  };

  const lockIncident = async (id: string): Promise<{ ok: boolean; message?: string }> => {
    try {
      const res = await incidentService.lock(id, operator);
      if (!res.success || !res.data) {
        return { ok: false, message: res.message || 'Ca đang được điều phối viên khác xử lý.' };
      }
      setIncidentLock(id, {
        operatorId: res.data.lockedByOperatorId,
        operatorName: res.data.lockedByOperatorName,
        expiresAt: res.data.lockExpiresAt,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, message: getApiErrorMessage(err, 'Không thể nhận ca xử lý.') };
    }
  };

  const releaseIncident = (id: string) => {
    const incident = incidents.find((i) => i.id === id);
    if (!incident?.lock || incident.lock.operatorId !== operator.id) return;
    setIncidentLock(id, null);
    incidentService.unlock(id).catch(() => undefined);
  };

  const revealReporterPhone = async (id: string): Promise<boolean> => {
    try {
      const res = await incidentService.logPhoneReveal(id);
      return res.success;
    } catch {
      return false;
    }
  };

  const assignVehicle = async (vehicleId: string, incidentId: string): Promise<{ ok: boolean; message?: string }> => {
    const incident = incidents.find((i) => i.id === incidentId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!incident || !vehicle) return { ok: false, message: 'Không tìm thấy sự cố hoặc xe.' };
    if (vehicle.status !== 'available') return { ok: false, message: `Xe ${vehicle.plate} không còn sẵn sàng.` };

    const maxVehicles = MAX_VEHICLES_BY_LEVEL[incident.severity];
    if (incident.assignedVehicleIds.length >= maxVehicles) {
      return {
        ok: false,
        message:
          maxVehicles === 1
            ? 'Sự cố Cấp 1–2 chỉ được giao 1 xe.'
            : `Sự cố Cấp 3 được giao tối đa ${maxVehicles} xe.`,
      };
    }

    try {
      const res = await dispatchService.assignVehicle(incidentId, vehicleId);
      if (!res.success) {
        // HTTP 409: xe vừa bị người khác giao trước → đánh dấu bận để không gợi ý lại.
        if (res.data?.conflict) {
          setVehicles((prev) =>
            prev.map((v) =>
              v.id === vehicleId ? { ...v, status: 'en_route', etaMinutes: null, lastUpdated: new Date().toISOString() } : v
            )
          );
        }
        return { ok: false, message: `${res.message || 'Giao xe thất bại.'} (${vehicle.plate})` };
      }
    } catch (err) {
      return { ok: false, message: getApiErrorMessage(err, 'Giao xe thất bại.') };
    }

    const etaMinutes = estimateEtaMinutes(haversineKm(incident, vehicle));
    targetsRef.current.set(vehicleId, { lat: incident.lat, lng: incident.lng });

    // Xe chưa lăn bánh: chờ đội cứu hộ xác nhận trong 120s.
    const now = Date.now();
    const response = MOCK_CREW_RESPONSES[vehicleId] ?? DEFAULT_CREW_RESPONSE;
    crewRef.current.set(vehicleId, {
      incidentId,
      phase: 'awaiting',
      ackDeadline: now + CREW_ACK_TIMEOUT_MS,
      respondAt: response.kind === 'ignore' ? Infinity : now + response.afterMs,
      nextAt: 0,
    });

    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              status: 'awaiting_ack',
              incidentId,
              etaMinutes,
              ackDeadline: new Date(now + CREW_ACK_TIMEOUT_MS).toISOString(),
              lastUpdated: new Date(now).toISOString(),
            }
          : v
      )
    );
    setIncidents((prev) =>
      prev.map((i) =>
        i.id === incidentId && !i.assignedVehicleIds.includes(vehicleId)
          ? { ...i, assignedVehicleIds: [...i.assignedVehicleIds, vehicleId] }
          : i
      )
    );
    return { ok: true };
  };

  function releaseVehicleLocally(vehicleId: string) {
    targetsRef.current.delete(vehicleId);
    crewRef.current.delete(vehicleId);
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              status: 'available',
              incidentId: null,
              etaMinutes: null,
              ackDeadline: null,
              lastUpdated: new Date().toISOString(),
            }
          : v
      )
    );
  }

  const dismissResponseNotice = (incidentId: string, noticeId: string) => {
    setIncidents((prev) =>
      prev.map((i) =>
        i.id === incidentId ? { ...i, responseNotices: i.responseNotices.filter((n) => n.id !== noticeId) } : i
      )
    );
  };

  const escalationNow = useNow(ESCALATION_CHECK_MS);
  const escalatedIncidentIds = useMemo(() => {
    const byId = new Map(vehicles.map((v) => [v.id, v]));
    return new Set(incidents.filter((i) => isIncidentEscalated(i, byId, escalationNow)).map((i) => i.id));
  }, [incidents, vehicles, escalationNow]);

  // Nhả xe khỏi sự cố — không tự gán xe thay thế, Operator chọn lại từ gợi ý.
  const cancelAssignment = (vehicleId: string) => {
    releaseVehicleLocally(vehicleId);
    setIncidents((prev) =>
      prev.map((i) =>
        i.assignedVehicleIds.includes(vehicleId)
          ? { ...i, assignedVehicleIds: i.assignedVehicleIds.filter((id) => id !== vehicleId) }
          : i
      )
    );
    dispatchService.releaseVehicle(vehicleId).catch(() => undefined);
  };

  return (
    <DispatchContext.Provider
      value={{
        currentOperatorId: operator.id,
        vehicles,
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
