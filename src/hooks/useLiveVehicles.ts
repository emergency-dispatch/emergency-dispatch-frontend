import { useEffect, useRef, useState } from 'react';
import { vehicleSeeds } from '../data/liveMapMock';
import type { Vehicle } from '../types/vehicle';

const TICK_MS = 2500;
const STEP_FRACTION = 0.08;
const ARRIVAL_THRESHOLD = 0.0006;

/**
 * Simulates the Socket.io vehicle-position channel client-side (no backend yet).
 * Swap the interval body for a `socket.on('vehicle:update', ...)` listener later —
 * the returned `Vehicle[]` shape stays the same for consumers.
 */
export function useLiveVehicles(): Vehicle[] {
  const [vehicles, setVehicles] = useState<Vehicle[]>(vehicleSeeds);
  const targetsRef = useRef(
    new Map(vehicleSeeds.filter((v) => v.target).map((v) => [v.id, v.target!]))
  );

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
            lat: v.lat + dLat * STEP_FRACTION,
            lng: v.lng + dLng * STEP_FRACTION,
            heading,
            etaMinutes: v.etaMinutes && v.etaMinutes > 1 ? v.etaMinutes - 1 : v.etaMinutes,
            lastUpdated: new Date().toISOString(),
          };
        })
      );
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []);

  return vehicles;
}
