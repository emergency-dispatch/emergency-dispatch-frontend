import { vi } from 'vitest';
import type { useDispatchStore } from '@/context/DispatchContext';
import { DEFAULT_ESCALATION_SETTINGS } from '@/services/liveMapService';

export type DispatchStore = ReturnType<typeof useDispatchStore>;

/**
 * Store Command Center giả cho test component Operator:
 * `vi.mock('<...>/context/DispatchContext', () => ({ useDispatchStore: () => mockStore.current }))`
 * rồi gán `mockStore.current = makeDispatchStore({...})` trong từng test.
 */
export function makeDispatchStore(overrides: Partial<DispatchStore> = {}): DispatchStore {
  const ok = () => Promise.resolve({ ok: true as const });
  return {
    currentOperatorId: 'op1',
    vehicles: [],
    stations: [],
    trafficJams: [],
    resolveTrafficJam: vi.fn(ok),
    setVehicleStatus: vi.fn(ok),
    saveVehicle: vi.fn(ok),
    escalationSettings: DEFAULT_ESCALATION_SETTINGS,
    incidents: [],
    highlightIncidentIds: new Set(),
    incidentsLoading: false,
    incidentsError: null,
    escalatedIncidentIds: new Set(),
    incidentDrawerOpen: false,
    setIncidentDrawerOpen: vi.fn(),
    approveIncident: vi.fn(ok),
    reviewTrafficJam: vi.fn(ok),
    rejectIncident: vi.fn(ok),
    transferIncident: vi.fn(ok),
    lockIncident: vi.fn(ok),
    releaseIncident: vi.fn(),
    createOperatorIncident: vi.fn(() => Promise.resolve({ ok: true, incidentId: 'new', dispatchSucceeded: null })),
    revealReporterPhone: vi.fn(() => Promise.resolve('0981234567')),
    assignVehicle: vi.fn(ok),
    cancelAssignment: vi.fn(ok),
    dismissResponseNotice: vi.fn(),
    incomingIncidents: [],
    dismissIncomingIncident: vi.fn(),
    incomingTransferNotes: new Map(),
    escalationTiers: new Map(),
    serviceArea: null,
    operatorAlerts: [],
    dismissOperatorAlert: vi.fn(),
    stationNotAssigned: null,
    ...overrides,
  } as DispatchStore;
}

export const mockStore: { current: DispatchStore } = { current: makeDispatchStore() };
