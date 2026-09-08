import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { vehicleSeeds } from '../data/liveMapMock';
import { createRandomIncident, incidentSeeds } from '../data/incidentMock';
import type { Vehicle } from '../types/vehicle';
import type { Incident, IncidentStatus } from '../types/incident';

const VEHICLE_TICK_MS = 2500;
const VEHICLE_STEP_FRACTION = 0.08;
const ARRIVAL_THRESHOLD = 0.0006;
const INCIDENT_SPAWN_MS = 11000;
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
  updateIncidentStatus: (id: string, status: IncidentStatus) => void;
  assignVehicle: (vehicleId: string, incidentId: string) => void;
  cancelAssignment: (vehicleId: string) => void;
  findNearestAvailableVehicle: (incident: Incident) => Vehicle | null;
  estimateEtaKm: (incident: Incident, vehicle: Vehicle) => { km: number; etaMinutes: number };
}

const DispatchContext = createContext<DispatchContextValue | null>(null);

/**
 * Owns the vehicle-position and incident-intake simulations (mock Socket.io
 * channels — no backend yet) plus dispatch actions. Mounted once in
 * DashboardLayout so movement keeps simulating across page navigation, and so
 * Incident Queue approvals are immediately visible in Live Map's dispatch panel.
 */
export const DispatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(vehicleSeeds);
  const [incidents, setIncidents] = useState<Incident[]>(() => sortByPriority(incidentSeeds));
  const [highlightIncidentIds, setHighlightIncidentIds] = useState<Set<string>>(new Set());
  const targetsRef = useRef(new Map(vehicleSeeds.filter((v) => v.target).map((v) => [v.id, v.target!])));

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

  useEffect(() => {
    const interval = setInterval(() => {
      const incoming = createRandomIncident();
      setIncidents((prev) => sortByPriority([...prev, incoming]));
      setHighlightIncidentIds((prev) => new Set(prev).add(incoming.id));

      setTimeout(() => {
        setHighlightIncidentIds((prev) => {
          const next = new Set(prev);
          next.delete(incoming.id);
          return next;
        });
      }, HIGHLIGHT_DURATION_MS);
    }, INCIDENT_SPAWN_MS);

    return () => clearInterval(interval);
  }, []);

  const updateIncidentStatus = (id: string, status: IncidentStatus) => {
    setIncidents((prev) => prev.map((inc) => (inc.id === id ? { ...inc, status } : inc)));
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
        updateIncidentStatus,
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
