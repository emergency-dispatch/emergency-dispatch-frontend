import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { vehicleSeeds } from '../data/liveMapMock';
import { incidentService } from '../services/incidentService';
import { getApiErrorMessage } from '../services/apiClient';
import { mapIncidentResponseToIncident, severityToBackend } from '../types/incident';
import type { Vehicle } from '../types/vehicle';
import type { Incident, IncidentSeverity } from '../types/incident';

const VEHICLE_TICK_MS = 2500;
const VEHICLE_STEP_FRACTION = 0.08;
const ARRIVAL_THRESHOLD = 0.0006;
const QUEUE_POLL_MS = 20000;
const HIGHLIGHT_DURATION_MS = 2200;
const AVG_SPEED_KMH = 28;

interface LatLng {
  lat: number;
  lng: number;
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function estimateEtaMinutes(km: number): number {
  return Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60));
}

function sortByPriority(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

interface DispatchContextValue {
  vehicles: Vehicle[];
  incidents: Incident[];
  highlightIncidentIds: Set<string>;
  incidentsLoading: boolean;
  incidentsError: string | null;
  approveIncident: (
    id: string,
    confirmedSeverity: Exclude<IncidentSeverity, 0>,
    operatorNotes?: string
  ) => Promise<boolean>;
  rejectIncident: (id: string, reason: string) => Promise<boolean>;
  assignVehicle: (vehicleId: string, incidentId: string) => void;
  cancelAssignment: (vehicleId: string) => void;
  findNearestAvailableVehicle: (incident: Incident) => Vehicle | null;
  estimateEtaKm: (incident: Incident, vehicle: Vehicle) => { km: number; etaMinutes: number };
}

const DispatchContext = createContext<DispatchContextValue | null>(null);

/**
 * Owns incident-queue data (real API: GET/PUT /api/Incidents/*) and the
 * vehicle-position simulation (mock — no backend Vehicle/Dispatch API yet).
 * Mounted once in DashboardLayout so both keep running across page navigation,
 * and so Incident Queue approvals are immediately visible in Live Map's dispatch panel.
 */
export const DispatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(vehicleSeeds);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [highlightIncidentIds, setHighlightIncidentIds] = useState<Set<string>>(new Set());
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const targetsRef = useRef(new Map(vehicleSeeds.filter((v) => v.target).map((v) => [v.id, v.target!])));

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

      const fresh = res.data.map(mapIncidentResponseToIncident);
      const freshIds = new Set(fresh.map((i) => i.id));

      setIncidents((prev) => {
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
    confirmedSeverity: Exclude<IncidentSeverity, 0>,
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
      return true;
    } catch (err) {
      setIncidentsError(getApiErrorMessage(err, 'Xác minh sự cố thất bại.'));
      return false;
    }
  };

  const rejectIncident = async (id: string, reason: string): Promise<boolean> => {
    try {
      const res = await incidentService.cancel(id, reason);
      if (!res.success) {
        setIncidentsError(res.message || 'Hủy sự cố thất bại.');
        return false;
      }
      setIncidents((prev) => prev.filter((i) => i.id !== id));
      setIncidentsError(null);
      return true;
    } catch (err) {
      setIncidentsError(getApiErrorMessage(err, 'Hủy sự cố thất bại.'));
      return false;
    }
  };

  const findNearestAvailableVehicle = (incident: Incident): Vehicle | null => {
    const available = vehicles.filter((v) => v.status === 'available');
    if (available.length === 0) return null;

    return available.reduce((nearest, v) =>
      haversineKm(incident, v) < haversineKm(incident, nearest) ? v : nearest
    );
  };

  const estimateEtaKm = (incident: Incident, vehicle: Vehicle) => {
    const km = haversineKm(incident, vehicle);
    return { km, etaMinutes: estimateEtaMinutes(km) };
  };

  const assignVehicle = (vehicleId: string, incidentId: string) => {
    const incident = incidents.find((i) => i.id === incidentId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!incident || !vehicle || vehicle.status !== 'available') return;

    const { etaMinutes } = estimateEtaKm(incident, vehicle);
    targetsRef.current.set(vehicleId, { lat: incident.lat, lng: incident.lng });

    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehicleId
          ? { ...v, status: 'en_route', incidentId, etaMinutes, lastUpdated: new Date().toISOString() }
          : v
      )
    );

    setIncidents((prev) =>
      prev.map((i) => (i.id === incidentId ? { ...i, assignedVehicleId: vehicleId } : i))
    );
  };

  const cancelAssignment = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;

    targetsRef.current.delete(vehicleId);

    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehicleId
          ? { ...v, status: 'available', incidentId: null, etaMinutes: null, lastUpdated: new Date().toISOString() }
          : v
      )
    );

    setIncidents((prev) =>
      prev.map((i) => (i.assignedVehicleId === vehicleId ? { ...i, assignedVehicleId: null } : i))
    );
  };

  return (
    <DispatchContext.Provider
      value={{
        vehicles,
        incidents,
        highlightIncidentIds,
        incidentsLoading,
        incidentsError,
        approveIncident,
        rejectIncident,
        assignVehicle,
        cancelAssignment,
        findNearestAvailableVehicle,
        estimateEtaKm,
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
