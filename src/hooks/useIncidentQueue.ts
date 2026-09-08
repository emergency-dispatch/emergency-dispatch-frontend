import { useEffect, useState } from 'react';
import { createRandomIncident, incidentSeeds } from '../data/incidentMock';
import type { Incident, IncidentStatus } from '../types/incident';

const NEW_ITEM_INTERVAL_MS = 11000;
const HIGHLIGHT_DURATION_MS = 2200;

function sortByPriority(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * Simulates the incident-intake websocket channel client-side (no backend yet).
 * Swap the interval body for a `socket.on('incident:new', ...)` listener later —
 * the returned queue shape stays the same for consumers.
 */
export function useIncidentQueue() {
  const [incidents, setIncidents] = useState<Incident[]>(() => sortByPriority(incidentSeeds));
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      const incoming = createRandomIncident();
      setIncidents((prev) => sortByPriority([...prev, incoming]));
      setHighlightIds((prev) => new Set(prev).add(incoming.id));

      setTimeout(() => {
        setHighlightIds((prev) => {
          const next = new Set(prev);
          next.delete(incoming.id);
          return next;
        });
      }, HIGHLIGHT_DURATION_MS);
    }, NEW_ITEM_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const updateStatus = (id: string, status: IncidentStatus) => {
    setIncidents((prev) => prev.map((inc) => (inc.id === id ? { ...inc, status } : inc)));
  };

  return {
    incidents: incidents.filter((inc) => inc.status === 'pending'),
    highlightIds,
    updateStatus,
  };
}
