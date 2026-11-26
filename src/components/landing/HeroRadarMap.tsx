import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Layers,
  Navigation,
  ChevronRight,
  AlertTriangle,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  LocateFixed,
  Building2,
  Clock,
  Car,
  Activity,
  Loader2,
} from 'lucide-react';
import {
  MAPBOX_ACCESS_TOKEN,
  applyStaffMapLayerMode,
  createStaffBaseMapStyle,
  mapboxService,
} from '../../services/mapboxService';
import {
  incidentService,
  type CitizenMapIncidentDto,
  type CitizenTrackingDto,
} from '../../services/incidentService';
import { liveMapService } from '../../services/liveMapService';
import {
  trackingHubService,
  incidentHubService,
  HubEvents,
} from '../../services/realtime/incidentHubService';
import {
  glowStationMarkerHtml,
  vehicle3dMarkerHtml,
  glowIncidentMarkerHtml,
  publicIncidentMarkerHtml,
} from '../operator/livemap/glowMarkers';
import type { IncidentResponseDto, IncidentCategory, SeverityLevel } from '../../types/incident';
import { getIncidentVisualMeta, formatCitizenIncidentStatus, formatCitizenDispatchStatus } from '../../utils/incidentFormat';
import type { RescueUnitResponseDto } from '../../types/rescueUnit';
import type { DispatchVehicleType, Station, VehicleStatus } from '../../types/vehicle';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { useMapExpandAnimation } from '../../hooks/useMapExpandAnimation';
import { UserRole } from '../../types/auth';
import { serviceAreaToFeatureCollection } from '../operator/livemap/MapServiceAreaLayer';
import { getCachedServiceArea, haversineDistanceKm, normalizeServiceArea } from '../../utils/serviceArea';
import type { ServiceAreaDto } from '../../services/liveMapService';

interface HeroRadarMapProps {
  etaTime: number;
  formatEta: (seconds: number) => string;
  onOpenReports?: () => void;
  onStatsUpdate?: (stats: {
    stationCount: number;
    unitCount: number;
    activeEtaMinutes: number | null;
  }) => void;
}

const UNIT_TYPE_MAP: Record<string, DispatchVehicleType> = {
  Ambulance: 'ambulance',
  FireTruck: 'fire_truck',
  LadderTruck: 'fire_truck',
  RescueBoat: 'rescue',
  HeavyRescueVehicle: 'rescue',
  PolicePatrol: 'rescue',
};

const UNIT_STATUS_MAP: Record<string, VehicleStatus> = {
  Available: 'available',
  Dispatched: 'en_route',
  OnScene: 'on_scene',
  Returning: 'en_route',
  CoolDown: 'recovering',
  Maintenance: 'unavailable',
  OutOfService: 'unavailable',
};

const getIncidentCategory = (incident: IncidentResponseDto): IncidentCategory => {
  if (incident.aiClassification?.eventType === 'TrafficAccident' || incident.eventType === 'TrafficAccident') return 'accident';
  if (incident.aiClassification?.eventType === 'FireExplosion' || incident.eventType === 'FireExplosion') return 'fire';
  const text = `${incident.title || ''} ${incident.description || ''}`.toLowerCase();
  if (text.includes('tai nạn') || text.includes('traffic') || text.includes('va chạm')) return 'accident';
  if (text.includes('hỏa hoạn') || text.includes('cháy') || text.includes('khói') || text.includes('nổ') || text.includes('fire')) return 'fire';
  return 'unknown';
};

const getPublicCategory = (eventType?: string): IncidentCategory => {
  if (eventType === 'TrafficAccident') return 'accident';
  if (eventType === 'FireExplosion') return 'fire';
  if (eventType && eventType !== 'None' && eventType !== 'Unknown') return 'other';
  return 'unknown';
};

const getIncidentSeverity = (sev?: string): SeverityLevel => {
  if (sev === 'Level3') return 3;
  if (sev === 'Level2') return 2;
  return 1;
};

// SHTP central default
const DEFAULT_MAP_CENTER: [number, number] = [106.8035, 10.8405];

export const HeroRadarMap: React.FC<HeroRadarMapProps> = ({
  etaTime,
  formatEta,
  onOpenReports,
  onStatsUpdate,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [radarLayer, setRadarLayer] = useState<'satellite' | 'streets' | 'dark'>('satellite');
  const {
    slotRef,
    isExpanded,
    isFixedLayer,
    boxStyle,
    toggleExpanded,
  } = useMapExpandAnimation(() => mapRef.current?.resize(), { collapsedRadius: '12px' });

  // Real entities state
  const [stations, setStations] = useState<Station[]>([]);
  const [units, setUnits] = useState<RescueUnitResponseDto[]>([]);
  const [myIncidents, setMyIncidents] = useState<IncidentResponseDto[]>([]);
  const [selectedSosId, setSelectedSosId] = useState<string | null>(null);
  const focusedIncidentIdRef = useRef<string | null>(null);
  const isExpandedRef = useRef(isExpanded);
  isExpandedRef.current = isExpanded;
  const toggleExpandedRef = useRef(toggleExpanded);
  toggleExpandedRef.current = toggleExpanded;
  const [trackingByIncident, setTrackingByIncident] = useState<Record<string, CitizenTrackingDto>>({});
  const [liveVehiclesById, setLiveVehiclesById] = useState<
    Record<string, { lat: number; lng: number; speedKmh?: number; heading?: number }>
  >({});
  const [multiRoutes, setMultiRoutes] = useState<
    Array<{ incidentId: string; unitId: string; coords: [number, number][]; color: string }>
  >([]);
  const [trackingRefreshTick, setTrackingRefreshTick] = useState(0);
  const [isCheckingIncident, setIsCheckingIncident] = useState<boolean>(() => Boolean(user));
  const checkedUserKeyRef = useRef<string | null>(null);
  const lastSignalRByUnitRef = useRef<Record<string, number>>({});
  const liveVehiclesByIdRef = useRef(liveVehiclesById);
  liveVehiclesByIdRef.current = liveVehiclesById;
  const routeCacheRef = useRef<
    Map<string, { vLat: number; vLng: number; iLat: number; iLng: number; coords: [number, number][] }>
  >(new Map());
  const selectedSosIdRef = useRef<string | null>(selectedSosId);
  selectedSosIdRef.current = selectedSosId;
  const lastMarkerClickAtRef = useRef<number>(0);

  const reportedIncident =
    myIncidents.find((i) => i.id === selectedSosId) ||
    myIncidents.find((i) => i.id === focusedIncidentIdRef.current) ||
    myIncidents[0] ||
    null;
  const trackingData = reportedIncident ? trackingByIncident[reportedIncident.id] || null : null;
  const liveVehicle =
    trackingData?.rescueUnitId ? liveVehiclesById[trackingData.rescueUnitId] || null : null;
  const [serviceArea, setServiceArea] = useState<ServiceAreaDto | null>(() => getCachedServiceArea());
  const serviceAreaRef = useRef<ServiceAreaDto | null>(serviceArea);
  serviceAreaRef.current = serviceArea;

  // Markers references for dynamic updates
  const stationMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const unitMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const incidentMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const publicIncidentMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [publicIncidents, setPublicIncidents] = useState<CitizenMapIncidentDto[]>([]);
  const lastCitizenMapRevRef = useRef<string | null>(null);
  const myLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasFittedTrackingBoundsRef = useRef<string | null>(null);

  // User location status
  const [locationStatus, setLocationStatus] = useState<'locating' | 'locked' | 'failed'>('locating');
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);

  // Service Area boundary on Mapbox canvas (supports polygon boundaryGeoJson & circle fallback)
  const setupServiceAreaLayer = useCallback((area: ServiceAreaDto | null = serviceAreaRef.current) => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      try {
        if (!map.isStyleLoaded()) {
          map.once('idle', apply);
          return;
        }

        const targetArea = area ?? serviceAreaRef.current;
        const data = serviceAreaToFeatureCollection(targetArea ? normalizeServiceArea(targetArea) : null) as any;

        const source = map.getSource('hero-service-area') as mapboxgl.GeoJSONSource | undefined;
        if (source) {
          source.setData(data);
        } else {
          map.addSource('hero-service-area', {
            type: 'geojson',
            data,
          });

          if (!map.getLayer('hero-service-area-fill')) {
            map.addLayer({
              id: 'hero-service-area-fill',
              type: 'fill',
              source: 'hero-service-area',
              paint: {
                'fill-color': '#2563EB',
                'fill-opacity': 0.12,
              },
            });
          }

          if (!map.getLayer('hero-service-area-line')) {
            map.addLayer({
              id: 'hero-service-area-line',
              type: 'line',
              source: 'hero-service-area',
              paint: {
                'line-color': '#38BDF8',
                'line-width': 2.5,
                'line-dasharray': [3, 2],
                'line-opacity': 1,
              },
            });
          }
        }
      } catch (err) {
        console.warn('Hero radar service area setup notice:', err);
      }
    };

    apply();
  }, []);

  // Tactical route updater on Mapbox canvas (hỗ trợ nhiều tuyến đường và lọc theo SOS đang chọn)
  const activeRouteFeaturesRef = useRef<Array<{ incidentId: string; unitId: string; coords: [number, number][]; color: string }>>([]);
  const syncRouteLayer = useCallback(
    (routesList: Array<{ incidentId: string; unitId: string; coords: [number, number][]; color: string }>, focusSosId: string | null) => {
      activeRouteFeaturesRef.current = routesList;
      const map = mapRef.current;
      if (!map) return;
      const visible =
        focusSosId && routesList.some((r) => r.incidentId === focusSosId)
          ? routesList.filter((r) => r.incidentId === focusSosId)
          : routesList;
      try {
        const source = map.getSource('tactical-routes') as mapboxgl.GeoJSONSource | undefined;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: visible
              .filter((r) => r.coords.length >= 2)
              .map((r) => ({
                type: 'Feature',
                properties: { color: r.color || '#0284C7', incidentId: r.incidentId },
                geometry: {
                  type: 'LineString',
                  coordinates: r.coords,
                },
              })),
          });
        }
      } catch {
        // Layer/source might still be loading
      }
    },
    []
  );

  useEffect(() => {
    syncRouteLayer(multiRoutes, selectedSosId);
  }, [multiRoutes, selectedSosId, syncRouteLayer]);

  // Fetch real stations & rescue units
  const fetchRealEntities = useCallback(async () => {
    try {
      const isAuthenticatedUser = Boolean(user);
      const isPrivileged = user?.role === 'Admin' || user?.role === 'Operator';
      const [fetchedStations, fetchedUnits, fetchedArea] = await Promise.all([
        isAuthenticatedUser
          ? liveMapService.getStations().catch(() => [] as Station[])
          : Promise.resolve([] as Station[]),
        isPrivileged
          ? liveMapService.getRescueUnits().catch(() => [] as RescueUnitResponseDto[])
          : Promise.resolve([] as RescueUnitResponseDto[]),
        liveMapService.getServiceArea().catch(() => null),
      ]);

      setStations(fetchedStations);
      setUnits(fetchedUnits);
      if (fetchedArea) {
        setServiceArea(normalizeServiceArea(fetchedArea));
      }

      if (onStatsUpdate) {
        onStatsUpdate({
          stationCount: fetchedStations.length,
          unitCount: fetchedUnits.length,
          activeEtaMinutes: trackingData?.estimatedArrivalMinutes ?? null,
        });
      }
    } catch (err) {
      console.warn('HeroRadarMap fetch entities notice:', err);
    }
  }, [user, onStatsUpdate, trackingData?.estimatedArrivalMinutes]);

  // Check ALL active citizen reported incidents (gồm cả báo cáo chính & sự cố gốc của ca trùng còn hoạt động)
  const checkCitizenReportedIncident = useCallback(async () => {
    const userKey = user?.id ?? null;
    const isInitialForUser = Boolean(userKey && checkedUserKeyRef.current !== userKey);
    if (isInitialForUser) {
      setIsCheckingIncident(true);
    }
    try {
      if (!user) {
        checkedUserKeyRef.current = null;
        setMyIncidents([]);
        return;
      }

      if (user.role === UserRole.Citizen) {
        const PRIMARY_MAX_AGE_MS = 24 * 60 * 60 * 1000;
        const isRecent = (iso?: string) => Boolean(iso && Date.now() - new Date(iso).getTime() <= PRIMARY_MAX_AGE_MS);
        const isPrimaryActive = (status: string) =>
          status !== 'Cancelled' && status !== 'Completed' && status !== 'Linked';

        const myReportsRes = await incidentService.getMyReports({ pageSize: 20 }).catch(() => null);
        const items = myReportsRes?.success ? myReportsRes.data.items : [];

        const targetIds: string[] = [];
        const pushUnique = (id?: string | null) => {
          if (id && !targetIds.includes(id)) targetIds.push(id);
        };

        if (focusedIncidentIdRef.current) {
          pushUnique(focusedIncidentIdRef.current);
        }

        for (const it of items) {
          if (isPrimaryActive(it.status) && isRecent(it.reportedAt)) {
            pushUnique(it.id);
          } else if (
            it.linkedToIncidentId &&
            (it.status === 'Linked' ||
              (it.status === 'Cancelled' && /trùng|duplicate/i.test((it as any).cancellationReason || ''))) &&
            isRecent(it.reportedAt)
          ) {
            const linkedStatus = String((it as any).linkedToIncidentStatus || '');
            if (linkedStatus !== 'Cancelled' && linkedStatus !== 'Completed') {
              pushUnique(it.linkedToIncidentId);
            }
          }
          if (targetIds.length >= 6) break;
        }

        if (targetIds.length === 0) {
          setMyIncidents([]);
          return;
        }

        const results = await Promise.allSettled(
          targetIds.map((id) => incidentService.getById(id))
        );
        const activeList: IncidentResponseDto[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value?.success && r.value.data && isPrimaryActive(r.value.data.status)) {
            activeList.push(r.value.data);
          }
        }
        if (focusedIncidentIdRef.current && !activeList.some((i) => i.id === focusedIncidentIdRef.current)) {
          focusedIncidentIdRef.current = null;
        }
        setMyIncidents(activeList);
        return;
      }

      // Fallback từ localStorage khi tài khoản khác đang theo dõi trên trang chủ
      const storedIds: string[] = JSON.parse(
        localStorage.getItem('resq_my_reported_incident_ids') || '[]'
      );
      if (storedIds.length > 0) {
        const validIds: string[] = [];
        const activeList: IncidentResponseDto[] = [];
        for (const id of storedIds.slice(0, 5)) {
          try {
            const res = await incidentService.getById(id);
            if (res?.success && res.data) {
              validIds.push(id);
              if (res.data.status !== 'Cancelled' && res.data.status !== 'Completed') {
                activeList.push(res.data);
              }
            }
          } catch (err: any) {
            if (err?.response?.status === 403 || err?.response?.status === 404) {
              continue;
            }
            validIds.push(id);
          }
        }
        if (validIds.length !== storedIds.length) {
          localStorage.setItem('resq_my_reported_incident_ids', JSON.stringify(validIds));
        }
        setMyIncidents(activeList);
        return;
      }

      setMyIncidents([]);
    } catch {
      // Ignore
    } finally {
      if (userKey) {
        checkedUserKeyRef.current = userKey;
      }
      setIsCheckingIncident(false);
    }
  }, [user]);

  const myIncidentsKey = myIncidents.map((i) => `${i.id}:${i.status}`).join(',');

  // Load & refresh tracking data for ALL active incidents
  useEffect(() => {
    const activeOnes = myIncidents.filter((i) => i.status !== 'Cancelled' && i.status !== 'Completed');
    if (activeOnes.length === 0) {
      setTrackingByIncident({});
      setLiveVehiclesById({});
      setMultiRoutes([]);
      hasFittedTrackingBoundsRef.current = null;
      return;
    }

    const dispatchedOnes = activeOnes.filter((i) => i.status === 'Dispatched' || i.status === 'InProgress');
    if (dispatchedOnes.length === 0) {
      setTrackingByIncident({});
      setMultiRoutes([]);
      return;
    }

    const ROUTE_COLORS = ['#0284C7', '#7C3AED', '#059669', '#EA580C'];
    let cancelled = false;
    const loadTracking = async () => {
      const nextTracking: Record<string, CitizenTrackingDto> = {};
      const nextLivePatches: Record<string, { lat: number; lng: number; speedKmh?: number; heading?: number }> = {};
      const nextRoutes: Array<{ incidentId: string; unitId: string; coords: [number, number][]; color: string }> = [];

      await Promise.all(
        dispatchedOnes.map(async (inc, incIdx) => {
          try {
            const res = await incidentService.getTracking(inc.id);
            if (cancelled || !res?.data) return;
            const tData = res.data;
            nextTracking[inc.id] = tData;
            const color = ROUTE_COLORS[incIdx % ROUTE_COLORS.length];

            const unitEntries =
              Array.isArray(tData.units) && tData.units.length > 0
                ? tData.units
                : tData.rescueUnitId || (tData.vehicleLat && tData.vehicleLng)
                  ? [
                      {
                        assignmentId: `primary-${inc.id}`,
                        rescueUnitId: tData.rescueUnitId || `veh-${inc.id}`,
                        plateNumber: tData.plateNumber,
                        vehicleLat: tData.vehicleLat || 0,
                        vehicleLng: tData.vehicleLng || 0,
                        routeTrajectory: tData.routeTrajectory || [],
                        isApproximateRoute: tData.isApproximateRoute,
                        distanceKm: tData.distanceKm,
                        estimatedArrivalMinutes: tData.estimatedArrivalMinutes,
                        dispatchStatus: tData.dispatchStatus,
                      },
                    ]
                  : [];

            const activeUnits = unitEntries.filter(
              (u) => u.dispatchStatus !== 'Completed' && u.dispatchStatus !== 'Cancelled'
            );

            for (const u of activeUnits) {
              const now = Date.now();
              const lastSigAt = lastSignalRByUnitRef.current[u.rescueUnitId] || 0;
              if (u.vehicleLat && u.vehicleLng && (!lastSigAt || now - lastSigAt > 2500)) {
                const existingLive = liveVehiclesByIdRef.current[u.rescueUnitId];
                nextLivePatches[u.rescueUnitId] = {
                  lat: u.vehicleLat,
                  lng: u.vehicleLng,
                  speedKmh: existingLive?.speedKmh,
                  heading: existingLive?.heading,
                };
              }

              const vLat = liveVehiclesByIdRef.current[u.rescueUnitId]?.lat ?? u.vehicleLat;
              const vLng = liveVehiclesByIdRef.current[u.rescueUnitId]?.lng ?? u.vehicleLng;
              const cKey = `${u.rescueUnitId}-${inc.id}`;
              let coords: [number, number][] = [];

              if (u.routeTrajectory && u.routeTrajectory.length >= 2 && !u.isApproximateRoute) {
                coords = u.routeTrajectory.map((p) => [p.longitude, p.latitude]);
              } else if (vLat && vLng && inc.latitude && inc.longitude) {
                const cached = routeCacheRef.current.get(cKey);
                const movedFar =
                  !cached ||
                  Math.hypot(vLat - cached.vLat, vLng - cached.vLng) > 0.0008 ||
                  Math.hypot(inc.latitude - cached.iLat, inc.longitude - cached.iLng) > 0.0002;
                if (!movedFar && cached) {
                  coords = cached.coords;
                } else {
                  coords = await mapboxService.resolveRoadRouteCoords({
                    incidentStatus: inc.status,
                    dispatchStatus: u.dispatchStatus,
                    routeTrajectory: u.routeTrajectory,
                    isApproximateRoute: u.isApproximateRoute,
                    vehicleLat: vLat,
                    vehicleLng: vLng,
                    incidentLat: inc.latitude,
                    incidentLng: inc.longitude,
                  });
                  if (coords.length >= 2) {
                    routeCacheRef.current.set(cKey, {
                      vLat,
                      vLng,
                      iLat: inc.latitude,
                      iLng: inc.longitude,
                      coords,
                    });
                  }
                }
              }

              if (coords.length >= 2) {
                nextRoutes.push({ incidentId: inc.id, unitId: u.rescueUnitId, coords, color });
              }
            }

            if (
              hasFittedTrackingBoundsRef.current !== inc.id &&
              dispatchedOnes.length === 1 &&
              mapRef.current &&
              tData.vehicleLng &&
              tData.vehicleLat &&
              inc.longitude &&
              inc.latitude
            ) {
              hasFittedTrackingBoundsRef.current = inc.id;
              mapRef.current.fitBounds(
                [
                  [Math.min(tData.vehicleLng, inc.longitude), Math.min(tData.vehicleLat, inc.latitude)],
                  [Math.max(tData.vehicleLng, inc.longitude), Math.max(tData.vehicleLat, inc.latitude)],
                ],
                { padding: { top: 90, bottom: 60, left: 60, right: 60 }, maxZoom: 16, duration: 900 }
              );
            }
          } catch {
            // ignore
          }
        })
      );

      if (cancelled) return;
      setTrackingByIncident(nextTracking);
      const closedUpdates = Object.values(nextTracking).filter(
        (t) => t.incidentStatus === 'Completed' || t.incidentStatus === 'Cancelled'
      );
      if (closedUpdates.length > 0) {
        setMyIncidents((prev) =>
          prev.map((inc) => {
            const matched = nextTracking[inc.id];
            if (matched?.incidentStatus && matched.incidentStatus !== inc.status) {
              return { ...inc, status: matched.incidentStatus as IncidentResponseDto['status'] };
            }
            return inc;
          })
        );
      }
      if (Object.keys(nextLivePatches).length > 0) {
        setLiveVehiclesById((prev) => ({ ...prev, ...nextLivePatches }));
      }
      setMultiRoutes(nextRoutes);
    };

    void loadTracking();
    const pollId = setInterval(() => {
      void loadTracking();
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(pollId);
    };
  }, [myIncidentsKey, trackingRefreshTick]);

  // Initial loads & custom events
  useEffect(() => {
    fetchRealEntities();
    checkCitizenReportedIncident();

    const handleIncidentUpdated = (e: any) => {
      if (e.detail?.status === 'Cancelled' || e.detail?.status === 'Completed') {
        const closedId = e.detail?.id;
        if (focusedIncidentIdRef.current && (!closedId || closedId === focusedIncidentIdRef.current)) {
          focusedIncidentIdRef.current = null;
        }
        setSelectedSosId((prev) => (prev && prev === closedId ? null : prev));
        if (closedId) {
          setMyIncidents((prev) => prev.filter((i) => i.id !== closedId));
        } else {
          checkCitizenReportedIncident();
        }
      } else if (e.detail?.id) {
        focusedIncidentIdRef.current = e.detail.id;
        setMyIncidents((prev) =>
          prev.some((i) => i.id === e.detail.id)
            ? prev.map((i) => (i.id === e.detail.id ? e.detail : i))
            : [e.detail, ...prev]
        );
      } else {
        checkCitizenReportedIncident();
      }
    };

    const handleFocusCitizenIncident = async (e: Event) => {
      const detail = (e as CustomEvent<{ incidentId?: string; incident?: IncidentResponseDto; expand?: boolean }>).detail;
      if (!detail?.incidentId) return;
      focusedIncidentIdRef.current = detail.incidentId;
      setSelectedSosId(detail.incidentId);
      hasFittedTrackingBoundsRef.current = null;

      let targetIncident = detail.incident;
      if (!targetIncident || !targetIncident.latitude || !targetIncident.longitude) {
        try {
          const res = await incidentService.getById(detail.incidentId);
          if (res?.success && res.data) {
            targetIncident = res.data;
          }
        } catch {
          // keep fallback if available
        }
      }
      if (targetIncident) {
        const resolvedTarget = targetIncident;
        setMyIncidents((prev) =>
          prev.some((i) => i.id === resolvedTarget.id)
            ? prev.map((i) => (i.id === resolvedTarget.id ? resolvedTarget : i))
            : [resolvedTarget, ...prev]
        );
        if (resolvedTarget.longitude && resolvedTarget.latitude && mapRef.current) {
          mapRef.current.flyTo({
            center: [resolvedTarget.longitude, resolvedTarget.latitude],
            zoom: 15,
            essential: true,
            duration: 900,
          });
        }
      }
      setTrackingRefreshTick((n) => n + 1);
      if (detail.expand && !isExpandedRef.current) {
        toggleExpandedRef.current();
      }
    };

    window.addEventListener('resq_incident_updated', handleIncidentUpdated);
    window.addEventListener('resq_focus_citizen_incident', handleFocusCitizenIncident);
    window.addEventListener('storage', checkCitizenReportedIncident);

    // Refresh every 12s as polling fallback
    const interval = setInterval(() => {
      fetchRealEntities();
      checkCitizenReportedIncident();
    }, 12000);

    return () => {
      window.removeEventListener('resq_incident_updated', handleIncidentUpdated);
      window.removeEventListener('resq_focus_citizen_incident', handleFocusCitizenIncident);
      window.removeEventListener('storage', checkCitizenReportedIncident);
      clearInterval(interval);
    };
  }, [fetchRealEntities, checkCitizenReportedIncident]);

  // SignalR Realtime Listeners cho tất cả các sự cố đang hoạt động của Citizen
  const myIncidentsRef = useRef(myIncidents);
  myIncidentsRef.current = myIncidents;
  const trackingByIncidentRef = useRef(trackingByIncident);
  trackingByIncidentRef.current = trackingByIncident;
  const syncRouteLayerRef = useRef(syncRouteLayer);
  syncRouteLayerRef.current = syncRouteLayer;
  const checkCitizenReportedIncidentRef = useRef(checkCitizenReportedIncident);
  checkCitizenReportedIncidentRef.current = checkCitizenReportedIncident;
  const hasFlownInitialSosRef = useRef<Set<string>>(new Set());

  const subIdsKey = myIncidents.map((i) => i.id).join(',');
  useEffect(() => {
    const incidentIds = subIdsKey ? subIdsKey.split(',').filter(Boolean) : [];
    let isSubscribed = false;
    const setupSignalR = async () => {
      try {
        await trackingHubService.start();
        for (const id of incidentIds) {
          await trackingHubService.invoke('SubscribeIncident', id);
        }
        if (incidentIds.length > 0) isSubscribed = true;
      } catch {
        // Fallback to polling
      }

      try {
        await incidentHubService.start();
        for (const id of incidentIds) {
          await incidentHubService.invoke('SubscribeIncident', id);
        }
      } catch {
        // Fallback to polling
      }
    };

    setupSignalR();

    const unsubTrackingReconnected = trackingHubService.onReconnected(() => {
      incidentIds.forEach((id) => trackingHubService.invoke('SubscribeIncident', id).catch(() => {}));
      setTrackingRefreshTick((n) => n + 1);
    });
    const unsubIncidentReconnected = incidentHubService.onReconnected(() => {
      incidentIds.forEach((id) => incidentHubService.invoke('SubscribeIncident', id).catch(() => {}));
      checkCitizenReportedIncidentRef.current();
      setTrackingRefreshTick((n) => n + 1);
    });

    const subSet = new Set(incidentIds.map((id) => id.toLowerCase()));

    // Listen to real-time rescue unit locations across ALL active SOS incidents
    const unsubLocation = trackingHubService.on(
      HubEvents.ReceiveRescueUnitLocation,
      (msg: any) => {
        if (!msg) return;
        const targetIncId = String(msg.incidentId || msg.IncidentId || '');
        if (targetIncId && subSet.size > 0 && !subSet.has(targetIncId.toLowerCase())) {
          return;
        }

        const unitId = msg.rescueUnitId || msg.RescueUnitId;
        const lat = msg.latitude ?? msg.Latitude;
        const lng = msg.longitude ?? msg.Longitude;
        const speedKmh = msg.speedKmh ?? msg.SpeedKmh;
        const rawHeading = msg.headingDegrees ?? msg.HeadingDegrees;

        if (unitId && typeof lat === 'number' && typeof lng === 'number') {
          lastSignalRByUnitRef.current[unitId] = Date.now();
          const prev = liveVehiclesByIdRef.current[unitId];
          const moved = prev && Math.hypot(lat - prev.lat, lng - prev.lng) > 0.00002;
          let heading = typeof rawHeading === 'number' && rawHeading > 0 ? rawHeading : prev?.heading;
          if ((typeof rawHeading !== 'number' || rawHeading === 0) && moved && prev) {
            const toRad = (d: number) => (d * Math.PI) / 180;
            const dLon = toRad(lng - prev.lng);
            const y = Math.sin(dLon) * Math.cos(toRad(lat));
            const x =
              Math.cos(toRad(prev.lat)) * Math.sin(toRad(lat)) -
              Math.sin(toRad(prev.lat)) * Math.cos(toRad(lat)) * Math.cos(dLon);
            heading = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
          }

          const marker = unitMarkersRef.current.get(unitId);
          if (marker) {
            marker.setLngLat([lng, lat]);
            if (typeof heading === 'number') {
              marker.setRotation(heading);
            }
          }

          setLiveVehiclesById((prevMap) => ({
            ...prevMap,
            [unitId]: {
              lat,
              lng,
              speedKmh: typeof speedKmh === 'number' ? Math.round(speedKmh) : prev?.speedKmh,
              heading,
            },
          }));
        }
      }
    );

    const unsubIncident = incidentHubService.on(
      HubEvents.ReceiveIncidentUpdate,
      (updated: any) => {
        if (!updated?.id) return;
        setMyIncidents((prev) =>
          prev.some((i) => i.id === updated.id)
            ? prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
            : prev
        );
      }
    );

    const unsubIncidentStatus = incidentHubService.on(
      HubEvents.ReceiveIncidentStatus,
      (statusUpdate: any) => {
        if (!statusUpdate) return;
        const uId = statusUpdate.incidentId || statusUpdate.id;
        const nextSt = statusUpdate.status || statusUpdate.Status;
        if (uId && nextSt) {
          setMyIncidents((prev) =>
            prev.map((i) => (i.id === uId ? { ...i, status: nextSt } : i))
          );
          setTrackingRefreshTick((n) => n + 1);
          checkCitizenReportedIncidentRef.current();
        }
      }
    );

    const unsubAssignment = incidentHubService.on(
      HubEvents.ReceiveAssignmentStatus,
      (assignUpdate: any) => {
        if (!assignUpdate) return;
        const uId = String(assignUpdate.incidentId || assignUpdate.IncidentId || '');
        if (!uId || subSet.has(uId.toLowerCase())) {
          setTrackingRefreshTick((n) => n + 1);
          checkCitizenReportedIncidentRef.current();
        }
      }
    );

    const unsubSettings = incidentHubService.on(
      HubEvents.ReceiveSettingsChanged,
      (msg: any) => {
        if (msg?.key === 'serviceArea') {
          liveMapService.getServiceArea().then((area) => {
            if (area) setServiceArea(normalizeServiceArea(area));
          }).catch(() => {});
        }
      }
    );

    return () => {
      if (isSubscribed) {
        incidentIds.forEach((id) => {
          trackingHubService.invoke('UnsubscribeIncident', id).catch(() => {});
          incidentHubService.invoke('UnsubscribeIncident', id).catch(() => {});
        });
      }
      unsubTrackingReconnected();
      unsubIncidentReconnected();
      unsubLocation();
      unsubIncident();
      unsubIncidentStatus();
      unsubAssignment();
      unsubSettings();
    };
  }, [subIdsKey]);

  // Bản đồ sự cố công khai cho Citizen Active (lấy các ca đã xác nhận đang hoạt động từ /api/citizen-map/incidents)
  useEffect(() => {
    if (!user || user.role !== UserRole.Citizen || typeof incidentService.getCitizenMapIncidents !== 'function') {
      setPublicIncidents([]);
      lastCitizenMapRevRef.current = null;
      return;
    }

    let cancelled = false;
    const loadPublicIncidents = async () => {
      try {
        const first = await incidentService.getCitizenMapIncidents({ pageIndex: 1, pageSize: 200 });
        if (cancelled) return;
        const all = [...(first.items || [])];
        const total = first.totalCount ?? (first as any).total ?? all.length;
        if (total > all.length) {
          const totalPages = Math.min(Math.ceil(total / 200), 5);
          for (let page = 2; page <= totalPages; page++) {
            const next = await incidentService.getCitizenMapIncidents({ pageIndex: page, pageSize: 200 });
            if (cancelled) return;
            all.push(...(next.items || []));
          }
        }
        setPublicIncidents(all);
      } catch {
        // Giữ nguyên danh sách hiện tại nếu rớt mạng tạm thời
      }
    };

    const subscribeAndLoad = async () => {
      const ok = await incidentHubService.start().catch(() => false);
      if (ok && !cancelled) {
        await incidentHubService.invoke('SubscribeCitizenMap').catch(() => {});
      }
      await loadPublicIncidents();
    };

    void subscribeAndLoad();
    const unsubMapChanged = incidentHubService.on<{ revision?: string }>(
      HubEvents.ReceiveCitizenMapChanged,
      (evt) => {
        if (evt?.revision && evt.revision === lastCitizenMapRevRef.current) return;
        lastCitizenMapRevRef.current = evt?.revision || null;
        void loadPublicIncidents();
      }
    );
    const unsubReconnected = incidentHubService.onReconnected(() => {
      incidentHubService.invoke('SubscribeCitizenMap').catch(() => {});
      void loadPublicIncidents();
    });
    const fallbackTimer = setInterval(loadPublicIncidents, 20000);

    const handleFocusAlert = async (e: Event) => {
      const publicAlertId = (e as CustomEvent<{ publicAlertId?: string }>).detail?.publicAlertId;
      if (!publicAlertId) return;
      const item = await incidentService.getCitizenMapIncidentByAlert?.(publicAlertId);
      if (!item || cancelled) {
        void loadPublicIncidents();
        return;
      }
      setPublicIncidents((prev) => (prev.some((p) => p.id === item.id) ? prev : [item, ...prev]));
      mapRef.current?.flyTo({ center: [item.longitude, item.latitude], zoom: 15, essential: true, duration: 900 });
      setTimeout(() => {
        publicIncidentMarkersRef.current.get(item.id)?.togglePopup();
      }, 350);
    };
    window.addEventListener('resq_focus_citizen_map_alert', handleFocusAlert);

    return () => {
      cancelled = true;
      clearInterval(fallbackTimer);
      unsubMapChanged();
      unsubReconnected();
      window.removeEventListener('resq_focus_citizen_map_alert', handleFocusAlert);
      incidentHubService.invoke('UnsubscribeCitizenMap').catch(() => {});
    };
  }, [user?.id, user?.role, i18n.language]);

  // Determine user GPS / cached location
  useEffect(() => {
    let hasCached = false;
    try {
      const cached = localStorage.getItem('resq_citizen_coords');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.address) {
          setResolvedAddress(parsed.address);
          setLocationStatus('locked');
          hasCached = true;
        }
      }
    } catch {
      // ignore
    }

    if (navigator.geolocation) {
      if (!hasCached) setLocationStatus('locating');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLocationStatus('locked');
          try {
            const addr = await mapboxService.reverseGeocode(lng, lat);
            setResolvedAddress(addr);
            localStorage.setItem(
              'resq_citizen_coords',
              JSON.stringify({ lat, lng, address: addr, updatedAt: Date.now() })
            );
          } catch {
            setResolvedAddress('Khu Công nghệ cao, TP. Thủ Đức, TP. Hồ Chí Minh');
          }
        },
        () => {
          if (!hasCached) {
            setLocationStatus('failed');
            setResolvedAddress('');
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else if (!hasCached) {
      setLocationStatus('failed');
    }
  }, []);

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (MAPBOX_ACCESS_TOKEN) {
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: createStaffBaseMapStyle('satellite'),
      center: DEFAULT_MAP_CENTER,
      zoom: 14.5,
      attributionControl: false,
      scrollZoom: true,
      doubleClickZoom: true,
      dragPan: true,
      touchZoomRotate: true,
      pitch: 25,
    });

    map.on('error', (e) => {
      console.warn('Hero radar mapbox notice:', e?.error?.message || e);
    });

    const setupTacticalLayer = () => {
      try {
        if (!map.isStyleLoaded()) {
          map.once('idle', setupTacticalLayer);
          return;
        }
        if (!map.getSource('tactical-routes')) {
          const initialRoutes = activeRouteFeaturesRef.current;
          const visibleInit =
            selectedSosIdRef.current && initialRoutes.some((r) => r.incidentId === selectedSosIdRef.current)
              ? initialRoutes.filter((r) => r.incidentId === selectedSosIdRef.current)
              : initialRoutes;
          map.addSource('tactical-routes', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: visibleInit
                .filter((r) => r.coords.length >= 2)
                .map((r) => ({
                  type: 'Feature',
                  properties: { color: r.color || '#0284C7', incidentId: r.incidentId },
                  geometry: {
                    type: 'LineString',
                    coordinates: r.coords,
                  },
                })),
            },
          });

          // Lộ trình chính: hỗ trợ nhiều tuyến đường với màu riêng theo sự cố
          map.addLayer({
            id: 'tactical-routes-line',
            type: 'line',
            source: 'tactical-routes',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': ['coalesce', ['get', 'color'], '#0284C7'],
              'line-width': 4.5,
              'line-opacity': 0.95,
            },
          });
        }
      } catch (err) {
        console.warn('Tactical routes setup notice:', err);
      }
    };

    map.on('load', () => {
      map.resize();
      setupTacticalLayer();
      setupServiceAreaLayer();
    });

    map.on('style.load', () => {
      setupTacticalLayer();
      setupServiceAreaLayer();
    });

    map.on('click', () => {
      if (Date.now() - lastMarkerClickAtRef.current < 120) return;
      setSelectedSosId(null);
    });

    const t1 = setTimeout(() => map.resize(), 100);
    const t2 = setTimeout(() => map.resize(), 400);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      ro = new ResizeObserver(() => map.resize());
      ro.observe(mapContainerRef.current);
    }

    mapRef.current = map;

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();

      stationMarkersRef.current.forEach((m) => m.remove());
      stationMarkersRef.current = [];

      unitMarkersRef.current.forEach((m) => m.remove());
      unitMarkersRef.current.clear();

      incidentMarkersRef.current.forEach((m) => m.remove());
      incidentMarkersRef.current.clear();

      if (myLocationMarkerRef.current) {
        myLocationMarkerRef.current.remove();
        myLocationMarkerRef.current = null;
      }

      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Service Area Circle on boundary change
  useEffect(() => {
    setupServiceAreaLayer(serviceArea);
  }, [serviceArea, setupServiceAreaLayer]);

  // Render Real Station Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || stations.length === 0) return;

    // Clear old station markers
    stationMarkersRef.current.forEach((m) => m.remove());
    stationMarkersRef.current = [];

    stations.forEach((station) => {
      if (!station.lat || !station.lng) return;

      const el = document.createElement('div');
      el.className = 'cad-station-marker';
      el.innerHTML = glowStationMarkerHtml(false);

      const isEn = i18n.language === 'en';
      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; padding: 6px 8px; min-width: 170px;">
          <div style="font-size: 12px; font-weight: 700; color: #0F172A;">${station.name}</div>
          <div style="font-size: 10px; color: #64748B; margin-top: 2px;">📍 ${station.address || (isEn ? 'High-Tech Park (SHTP)' : 'Khu Công nghệ cao (SHTP)')}</div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding-top: 4px; border-top: 1px solid #E2E8F0; font-size: 10px; font-family: monospace;">
            <span style="color: #059669; font-weight: 700;">${isEn ? 'STANDBY 24/7' : 'TRỰC CHIẾN 24/7'}</span>
            <span style="color: #3B82F6; font-weight: 700;">${station.vehicleIds.length} ${isEn ? 'UNITS' : 'XE'}</span>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: [0, -24], closeButton: false }).setHTML(popupHtml);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([station.lng, station.lat])
        .setPopup(popup)
        .addTo(map);

      stationMarkersRef.current.push(marker);
    });
  }, [stations, i18n.language]);

  // Render Rescue Unit Markers (Operator/Admin units + Citizen's assigned vehicles across ALL active SOS)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const inferUnitType = (name?: string | null): string => {
      const lower = (name || '').toLowerCase();
      if (lower.includes('thương') || lower.includes('ambulance')) return 'Ambulance';
      if (lower.includes('thang') || lower.includes('hỏa') || lower.includes('fire')) return 'FireTruck';
      if (lower.includes('cảnh') || lower.includes('police')) return 'PolicePatrol';
      return 'HeavyRescueVehicle';
    };

    const existingUnitIds = new Set(units.map((u) => u.id));
    const trackedExtraUnits: RescueUnitResponseDto[] = [];
    const assignedUnitIds = new Set<string>();

    Object.values(trackingByIncident).forEach((tData) => {
      const unitEntries =
        Array.isArray(tData.units) && tData.units.length > 0
          ? tData.units
          : tData.rescueUnitId
            ? [
                {
                  assignmentId: `primary-${tData.incidentId}`,
                  rescueUnitId: tData.rescueUnitId,
                  plateNumber: tData.plateNumber,
                  vehicleLat: tData.vehicleLat || 0,
                  vehicleLng: tData.vehicleLng || 0,
                  routeTrajectory: tData.routeTrajectory || [],
                  distanceKm: tData.distanceKm,
                  estimatedArrivalMinutes: tData.estimatedArrivalMinutes,
                  dispatchStatus: tData.dispatchStatus,
                },
              ]
            : [];

      unitEntries.forEach((u) => {
        if (!u.rescueUnitId || u.dispatchStatus === 'Completed' || u.dispatchStatus === 'Cancelled') return;
        assignedUnitIds.add(u.rescueUnitId);
        const live = liveVehiclesById[u.rescueUnitId];
        const uLat = live?.lat ?? u.vehicleLat;
        const uLng = live?.lng ?? u.vehicleLng;
        if (!uLat || !uLng) return;
        if (!existingUnitIds.has(u.rescueUnitId) && !trackedExtraUnits.some((x) => x.id === u.rescueUnitId)) {
          trackedExtraUnits.push({
            id: u.rescueUnitId,
            plateNumber: u.plateNumber || tData.plateNumber || t('citizen.reports.rescueUnitDefault'),
            unitType: inferUnitType(tData.unitTypeName),
            unitTypeName: tData.unitTypeName || t('citizen.reports.rescueUnitDefault'),
            status: u.dispatchStatus === 'OnScene' ? 'OnScene' : 'Dispatched',
            statusName:
              u.dispatchStatus === 'OnScene'
                ? t('citizen.reports.statusOnScene')
                : u.dispatchStatus === 'EnRoute'
                ? t('citizen.reports.statusEnRoute')
                : t('citizen.reports.statusMissionAccepted'),
            stationId: '',
            stationName: tData.stationName || t('citizen.reports.cadStationDefault'),
            currentLat: uLat,
            currentLng: uLng,
          } as RescueUnitResponseDto);
        }
      });
    });

    const effectiveUnits: RescueUnitResponseDto[] = [...units, ...trackedExtraUnits];

    // Map stations for coordinate placement fallback if unit has 0,0
    const stationMap = new Map<string, Station>();
    stations.forEach((s) => stationMap.set(s.id, s));

    // Clear removed units
    const currentUnitIds = new Set(effectiveUnits.map((u) => u.id));
    unitMarkersRef.current.forEach((marker, id) => {
      if (!currentUnitIds.has(id)) {
        marker.remove();
        unitMarkersRef.current.delete(id);
      }
    });

    effectiveUnits.forEach((unit, idx) => {
      const live = liveVehiclesById[unit.id];
      let lat = live?.lat ?? unit.currentLat;
      let lng = live?.lng ?? unit.currentLng;

      if ((!lat || !lng || (lat === 0 && lng === 0)) && unit.stationId) {
        const station = stationMap.get(unit.stationId);
        if (station) {
          const angle = (idx * 45 * Math.PI) / 180;
          lat = station.lat + Math.sin(angle) * 0.0018;
          lng = station.lng + Math.cos(angle) * 0.0018;
        }
      }

      if (!lat || !lng) return;

      const vType = UNIT_TYPE_MAP[unit.unitType] || 'rescue';
      const vStatus = UNIT_STATUS_MAP[unit.status] || 'available';
      const isAssigned = assignedUnitIds.has(unit.id);
      const heading = isAssigned && typeof live?.heading === 'number' ? live.heading : 0;

      const isEn = i18n.language === 'en';
      const popupHtml = `
          <div style="font-family: system-ui, sans-serif; padding: 6px 8px; min-width: 170px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
              <span style="font-size: 12px; font-weight: 800; font-family: monospace; color: #0F172A;">${unit.plateNumber}</span>
              <span style="font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px; background: ${
                vStatus === 'en_route' ? '#DBEAFE; color: #1D4ED8;' : vStatus === 'on_scene' ? '#FFEDD5; color: #C2410C;' : '#D1FAE5; color: #047857;'
              }">${unit.statusName || unit.status}</span>
            </div>
            <div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px;">${unit.unitTypeName}</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">🏢 ${unit.stationName || (isEn ? 'Local Station' : 'Trạm nội khu')}</div>
          </div>
        `;

      let marker = unitMarkersRef.current.get(unit.id);
      if (!marker) {
        const el = document.createElement('div');
        el.className = 'cad-unit-marker';
        el.innerHTML = vehicle3dMarkerHtml(vType, vStatus, isAssigned);
        el.addEventListener('click', () => {
          lastMarkerClickAtRef.current = Date.now();
        });

        const popup = new mapboxgl.Popup({ offset: 22, closeButton: false }).setHTML(popupHtml);
        (popup as any).__lastHtml = popupHtml;

        marker = new mapboxgl.Marker({ element: el, anchor: 'center', rotationAlignment: 'map', rotation: heading })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        unitMarkersRef.current.set(unit.id, marker);
      } else {
        marker.setLngLat([lng, lat]);
        if (isAssigned && typeof live?.heading === 'number') {
          marker.setRotation(live.heading);
        }
        const el = marker.getElement();
        el.innerHTML = vehicle3dMarkerHtml(vType, vStatus, isAssigned);
        const popup = marker.getPopup() as (mapboxgl.Popup & { __lastHtml?: string }) | undefined;
        if (popup && popup.__lastHtml !== popupHtml) {
          popup.__lastHtml = popupHtml;
          popup.setHTML(popupHtml);
        }
      }
    });
  }, [units, stations, trackingByIncident, liveVehiclesById, t, i18n.language]);

  // Render ALL Citizen Active SOS Incident Markers (bấm vào 1 SOS -> lọc route của SOS đó, bỏ chọn -> hiện lại bình thường)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const visibleOwn = myIncidents.filter(
      (inc) =>
        typeof inc.latitude === 'number' &&
        typeof inc.longitude === 'number' &&
        inc.status !== 'Cancelled' &&
        inc.status !== 'Completed'
    );
    const activeIds = new Set(visibleOwn.map((i) => i.id));

    incidentMarkersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        incidentMarkersRef.current.delete(id);
        hasFlownInitialSosRef.current.delete(id);
      }
    });

    visibleOwn.forEach((inc) => {
      const cat = getIncidentCategory(inc);
      const sev = getIncidentSeverity(inc.severity);
      const isSelected = selectedSosId ? inc.id === selectedSosId : true;
      const tData = trackingByIncident[inc.id];

      const visual = getIncidentVisualMeta(inc);
      const photoHtml = inc.mediaItems?.[0]?.mediaUrl
        ? `<img src="${inc.mediaItems[0].mediaUrl}" style="width: 100%; height: 75px; object-fit: cover; border-radius: 6px; margin-bottom: 6px;" alt="${i18n.language === 'en' ? 'Incident scene' : 'Hiện trường'}" />`
        : '';
      const isTypeKnown = visual.category === 'fire' || visual.category === 'accident';
      const displayTitle = isTypeKnown
        ? visual.label
        : inc.title && !inc.title.includes('Tín hiệu') && !inc.title.includes('SOS')
        ? inc.title
        : t('citizen.reports.incidentTypes.sosSignal');

      const effectiveStatus = tData?.incidentStatus || inc.status;
      const isDispatched = effectiveStatus === 'Dispatched' || effectiveStatus === 'InProgress';
      const statusText =
        isDispatched && tData?.dispatchStatus === 'OnScene'
          ? (i18n.language === 'en' ? 'On Scene' : 'Đã đến hiện trường')
          : formatCitizenIncidentStatus(effectiveStatus);
      const statusColor = isDispatched ? '#059669' : '#DC2626';
      const statusLabel = i18n.language === 'en' ? 'STATUS' : 'TRẠNG THÁI';

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; padding: 6px 8px; min-width: 190px;">
          ${photoHtml}
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 3px;">
            <span style="font-size: 11px; font-weight: 800; color: #DC2626;">${visual.icon} ${visual.label}</span>
            <span style="font-size: 10px; font-family: monospace; color: #64748B;">${inc.code || tData?.incidentCode || `#${inc.id.slice(0, 6).toUpperCase()}`}</span>
          </div>
          <div style="font-size: 11px; font-weight: 700; color: #0F172A;">${displayTitle}</div>
          <div style="font-size: 10px; color: #64748B; margin-top: 2px;">📍 ${inc.locationAddress}</div>
          <div style="font-size: 10px; font-weight: 700; color: ${statusColor}; margin-top: 4px; padding-top: 4px; border-top: 1px solid #E2E8F0;">
            ${statusLabel}: ${statusText.toUpperCase()}
          </div>
        </div>
      `;

      let marker = incidentMarkersRef.current.get(inc.id);
      if (!marker) {
        const el = document.createElement('div');
        el.className = 'cad-marker-incident cursor-pointer';
        el.innerHTML = glowIncidentMarkerHtml(cat, sev, isSelected);
        el.addEventListener('click', () => {
          lastMarkerClickAtRef.current = Date.now();
        });

        const popup = new mapboxgl.Popup({ offset: 22, closeButton: false }).setHTML(popupHtml);
        (popup as any).__lastHtml = popupHtml;
        popup.on('open', () => {
          setSelectedSosId(inc.id);
        });
        popup.on('close', () => {
          setSelectedSosId((prev) => (prev === inc.id ? null : prev));
        });

        marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([inc.longitude, inc.latitude])
          .setPopup(popup)
          .addTo(map);

        incidentMarkersRef.current.set(inc.id, marker);

        if (!hasFlownInitialSosRef.current.has(inc.id)) {
          hasFlownInitialSosRef.current.add(inc.id);
          if (visibleOwn.length === 1) {
            map.flyTo({
              center: [inc.longitude, inc.latitude],
              zoom: 15,
              essential: true,
              duration: 900,
            });
          }
        }
      } else {
        marker.setLngLat([inc.longitude, inc.latitude]);
        marker.getElement().innerHTML = glowIncidentMarkerHtml(cat, sev, isSelected);
        const popup = marker.getPopup() as (mapboxgl.Popup & { __lastHtml?: string }) | undefined;
        if (popup && popup.__lastHtml !== popupHtml) {
          popup.__lastHtml = popupHtml;
          popup.setHTML(popupHtml);
        }
      }
    });
  }, [myIncidents, selectedSosId, trackingByIncident, i18n.language, t]);

  // Vẽ marker sự cố công khai (nhỏ gọn, khác biệt với sự cố của chính mình; tự xóa khi hoàn tất/hủy/xóa/gộp)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const myIdsSet = new Set(myIncidents.map((i) => i.id));
    const visibleItems = publicIncidents.filter(
      (item) =>
        !myIdsSet.has(item.id) &&
        typeof item.latitude === 'number' &&
        typeof item.longitude === 'number'
    );
    const activeIds = new Set(visibleItems.map((i) => i.id));

    publicIncidentMarkersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        publicIncidentMarkersRef.current.delete(id);
      }
    });

    const typeLabels: Record<IncidentCategory, string> =
      i18n.language === 'en'
        ? { fire: 'Fire & Explosion', accident: 'Traffic Accident', other: 'Incident', unknown: 'Public Alert' }
        : { fire: 'Hỏa hoạn', accident: 'Tai nạn giao thông', other: 'Sự cố khu vực', unknown: 'Cảnh báo sự cố' };

    visibleItems.forEach((item) => {
      const cat = getPublicCategory(item.eventType);
      const statusText = formatCitizenIncidentStatus(item.status);
      const rawMsg = item.message || item.area || '';
      const areaClean = item.area || rawMsg.replace(/^(?:An incident has been reported at|Có sự cố tại)\s+/i, '').replace(/\.$/, '');
      const displayMsg =
        i18n.language === 'en'
          ? (/^Có sự cố tại /i.test(rawMsg) ? `An incident has been reported at ${areaClean}.` : rawMsg)
          : (/^An incident has been reported at /i.test(rawMsg) ? `Có sự cố tại ${areaClean}.` : rawMsg);
      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; padding: 6px 8px; min-width: 185px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
            <span style="font-size:10px;font-weight:800;color:#B45309;background:#FFFBEB;border:1px solid #FDE68A;padding:1px 6px;border-radius:4px;">
              ${typeLabels[cat]}
            </span>
            <span style="font-size:9px;font-weight:700;color:#475569;">${statusText.toUpperCase()}</span>
          </div>
          <div style="font-size:11px;font-weight:700;color:#0F172A;line-height:1.35;">${displayMsg}</div>
          <div style="font-size:10px;color:#64748B;margin-top:3px;">📍 ${item.area}</div>
        </div>
      `;

      const existing = publicIncidentMarkersRef.current.get(item.id);
      if (existing) {
        existing.setLngLat([item.longitude, item.latitude]);
        existing.getElement().innerHTML = publicIncidentMarkerHtml(cat);
        existing.getPopup()?.setHTML(popupHtml);
      } else {
        const el = document.createElement('div');
        el.innerHTML = publicIncidentMarkerHtml(cat);
        el.addEventListener('click', () => {
          lastMarkerClickAtRef.current = Date.now();
        });
        const popup = new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(popupHtml);
        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([item.longitude, item.latitude])
          .setPopup(popup)
          .addTo(map);
        publicIncidentMarkersRef.current.set(item.id, marker);
      }
    });
  }, [publicIncidents, myIncidentsKey, i18n.language]);

  const handleSetRadarLayer = (nextMode: 'satellite' | 'streets' | 'dark') => {
    if (nextMode === radarLayer) return;
    setRadarLayer(nextMode);
    if (mapRef.current) {
      applyStaffMapLayerMode(mapRef.current, nextMode);
    }
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('resq_hero_map_fullscreen', { detail: isFixedLayer }));
    document.body.style.overflow = isFixedLayer ? 'hidden' : '';
  }, [isFixedLayer]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('resq_hero_map_fullscreen', { detail: false }));
    };
  }, []);

  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 300 });
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 300 });

  const handleGoToMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingUser(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocationStatus('locked');

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 16,
            essential: true,
            duration: 1200,
          });

          if (!myLocationMarkerRef.current) {
            const el = document.createElement('div');
            el.className = 'cad-marker-my-location';
            el.innerHTML = `
              <div style="position: relative; display: flex; align-items: center; justify-content: center;">
                <span style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(59, 130, 246, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
                <div style="width: 18px; height: 18px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 0 12px rgba(37, 99, 235, 0.8);"></div>
              </div>
            `;
            myLocationMarkerRef.current = new mapboxgl.Marker({ element: el })
              .setLngLat([lng, lat])
              .addTo(mapRef.current);
          } else {
            myLocationMarkerRef.current.setLngLat([lng, lat]);
          }
        }

        try {
          const addr = await mapboxService.reverseGeocode(lng, lat);
          setResolvedAddress(addr);
          localStorage.setItem(
            'resq_citizen_coords',
            JSON.stringify({ lat, lng, address: addr, updatedAt: Date.now() })
          );
        } catch {
          setResolvedAddress('Khu Công nghệ cao, TP. Thủ Đức, TP. Hồ Chí Minh');
        }
      },
      () => {
        setIsLocatingUser(false);
        try {
          const cached = localStorage.getItem('resq_citizen_coords');
          if (cached && mapRef.current) {
            const parsed = JSON.parse(cached);
            if (parsed.lat && parsed.lng) {
              mapRef.current.flyTo({
                center: [parsed.lng, parsed.lat],
                zoom: 16,
                essential: true,
                duration: 1000,
              });
              return;
            }
          }
        } catch {}
        alert('Không lấy được vị trí. Vui lòng cho phép quyền truy cập vị trí trên trình duyệt.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div ref={slotRef} className="relative flex-1 flex flex-col min-h-[300px] sm:min-h-[360px] lg:min-h-[160px]">
      <div
        style={boxStyle}
        className={
          isFixedLayer
            ? 'fixed inset-0 z-[10050] rounded-none bg-slate-950 border-0 shadow-none overflow-hidden'
            : 'relative w-full flex-1 min-h-[300px] sm:min-h-[360px] lg:min-h-0 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden'
        }
      >
      {/* Real Interactive Mapbox CAD Canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 pointer-events-none cad-radar-grid opacity-30" />

      {/* Floating HUD Card Top-Left: Shows Reported Incident / Live Tracking or GPS Status */}
      <div className="absolute top-2.5 left-2.5 z-30 animate-float-slow pointer-events-auto">
        {reportedIncident ? (() => {
          const visual = getIncidentVisualMeta(reportedIncident);
          const hasPhoto = reportedIncident.mediaItems && reportedIncident.mediaItems.length > 0 && reportedIncident.mediaItems[0].mediaUrl;
          const isAiKnown = reportedIncident.aiClassification?.isSuccess === true &&
            reportedIncident.aiClassification?.eventType !== 'None' &&
            Boolean(reportedIncident.aiClassification?.summary) &&
            !/không thể phân loại|cần operator|đánh giá thủ công|unclassified|needshumanreview/i.test(reportedIncident.aiClassification?.summary || '');

          const cleanAiSummary = isAiKnown
            ? reportedIncident.aiClassification?.summary
                ?.replace(/^\[.*?\]\s*/, '')
                ?.trim()
            : null;

          const isTypeKnown = visual.category === 'fire' || visual.category === 'accident';
          const displayTitle = isTypeKnown
            ? visual.label
            : reportedIncident.title && !reportedIncident.title.includes('Tín hiệu') && !reportedIncident.title.includes('SOS')
            ? reportedIncident.title
            : t('citizen.reports.incidentTypes.sosSignal');
          const hudStatus = trackingData?.incidentStatus || reportedIncident.status;
          const userNote = reportedIncident.description &&
            !reportedIncident.description.startsWith('Tín hiệu cứu nạn SOS từ người dân tại') &&
            !reportedIncident.description.startsWith('Tín hiệu SOS từ người dân tại') &&
            !reportedIncident.description.startsWith('Người dân đè nút SOS')
            ? reportedIncident.description
            : null;

          return (
            <div
              onClick={onOpenReports}
              className="bg-white/95 backdrop-blur-md border border-slate-200 hover:border-red-400 rounded-xl p-2.5 sm:p-3 shadow-xl max-w-[240px] sm:max-w-[300px] text-left cursor-pointer transition-all hover:scale-[1.02]"
              title={t('citizen.landing.radarFollowAction')}
            >
              {/* Top line: Category pill + Status badge */}
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${visual.badgeClass}`}>
                  <span>{visual.icon}</span>
                  <span className="truncate max-w-[130px]">{visual.label}</span>
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold font-mono-data shrink-0 ${
                    hudStatus === 'Dispatched' || hudStatus === 'InProgress'
                      ? 'bg-emerald-600 text-white'
                      : hudStatus === 'Cancelled'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {formatCitizenIncidentStatus(hudStatus).toUpperCase()}
                </span>
              </div>

              {/* Main Info: Thumbnail + Title & AI summary */}
              <div className="flex items-start gap-2">
                {hasPhoto && (
                  <img
                    src={reportedIncident.mediaItems[0].mediaUrl}
                    alt={i18n.language === 'en' ? 'Incident scene' : 'Hiện trường'}
                    className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 shadow-xs"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight truncate">
                      {displayTitle}
                    </p>
                    <span className="text-[9px] font-mono text-slate-400 shrink-0">
                      {reportedIncident.code || trackingData?.incidentCode || `#${reportedIncident.id.slice(0, 6).toUpperCase()}`}
                    </span>
                  </div>
                  {cleanAiSummary ? (
                    <p className="text-[10px] text-slate-700 line-clamp-1 mt-0.5 font-medium">
                      {cleanAiSummary}
                    </p>
                  ) : userNote ? (
                    <p className="text-[10px] text-slate-600 line-clamp-1 mt-0.5 italic">
                      "{userNote}"
                    </p>
                  ) : null}
                  <p className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
                    📍 {reportedIncident.locationAddress}
                  </p>
                </div>
              </div>

              {/* Tracking live info if dispatched */}
              {(hudStatus === 'Dispatched' || hudStatus === 'InProgress') && trackingData && (() => {
                const vLat = liveVehicle?.lat ?? trackingData.vehicleLat;
                const vLng = liveVehicle?.lng ?? trackingData.vehicleLng;
                const liveDistKm =
                  vLat && vLng && reportedIncident.latitude && reportedIncident.longitude
                    ? haversineDistanceKm(vLat, vLng, reportedIncident.latitude, reportedIncident.longitude)
                    : trackingData.distanceKm ?? null;
                const isOnScene = trackingData.dispatchStatus === 'OnScene';
                const liveEta = isOnScene
                  ? 0
                  : liveDistKm !== null
                  ? Math.max(1, Math.round((liveDistKm / (liveVehicle?.speedKmh && liveVehicle.speedKmh > 5 ? liveVehicle.speedKmh : 35)) * 60))
                  : trackingData.estimatedArrivalMinutes || 3;
                const dispatchLabel = formatCitizenDispatchStatus(trackingData.dispatchStatus);

                return (
                  <div className="mt-2 pt-1.5 border-t border-slate-100 space-y-1 text-[10px] font-mono">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`font-extrabold truncate ${isOnScene ? 'text-amber-600' : 'text-blue-600'}`}>
                        {dispatchLabel}
                      </span>
                      <span className="text-slate-700 font-bold truncate shrink-0 max-w-[100px]">
                        {trackingData.plateNumber || t('citizen.reports.rescueUnitDefault')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-emerald-600" />
                        {t('citizen.landing.radarTrackingEta', { min: liveEta })}
                      </span>
                      {liveDistKm !== null && (
                        <span className="font-semibold text-slate-500">
                          {liveDistKm.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[10px] font-mono-data text-red-600 font-bold">
                <span>{t('citizen.landing.radarFollowAction')}</span>
                <ChevronRight className="w-3 h-3 text-red-600" />
              </div>
            </div>
          );
        })() : isCheckingIncident ? (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-xl max-w-[230px] sm:max-w-[270px] text-left">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono-data font-bold text-blue-600 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                <span>{i18n.language === 'en' ? 'OPERATIONAL RADAR' : 'RADAR TÁC CHIẾN'}</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] sm:text-[10px] font-bold font-mono-data">
                {i18n.language === 'en' ? 'LOADING' : 'ĐANG TẢI'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight">
              {i18n.language === 'en' ? 'Checking active rescues...' : 'Đang tải dữ liệu cứu hộ...'}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              {i18n.language === 'en' ? 'Syncing your rescue status from CAD...' : 'Đang đồng bộ trạng thái cứu hộ hiện có...'}
            </p>
          </div>
        ) : locationStatus === 'failed' ? (
          <div className="bg-white/95 backdrop-blur-md border border-red-200 rounded-xl p-2.5 sm:p-3 shadow-xl max-w-[220px] sm:max-w-[260px] text-left">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span className="text-[10px] sm:text-[11px] font-mono-data font-bold text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>{i18n.language === 'en' ? 'GPS LOCATION' : 'ĐỊNH VỊ GPS'}</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-red-100 border border-red-200 text-red-700 text-[9px] sm:text-[10px] font-bold font-mono-data">
                {i18n.language === 'en' ? 'LOCATION ERROR' : 'LỖI VỊ TRÍ'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight">
              {i18n.language === 'en' ? 'Unable to get location' : 'Không lấy được vị trí'}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              {i18n.language === 'en'
                ? 'Please enable GPS or grant location access permission in your browser.'
                : 'Vui lòng bật định vị GPS hoặc cấp quyền truy cập vị trí trên trình duyệt.'}
            </p>
          </div>
        ) : locationStatus === 'locating' ? (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-xl max-w-[220px] sm:max-w-[260px] text-left">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span className="text-[10px] sm:text-[11px] font-mono-data font-bold text-amber-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>{i18n.language === 'en' ? 'GPS LOCATION' : 'ĐỊNH VỊ GPS'}</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] sm:text-[10px] font-bold font-mono-data animate-pulse">
                {i18n.language === 'en' ? 'SCANNING GPS...' : 'ĐANG DÒ GPS...'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight">
              {i18n.language === 'en' ? 'Locating current position' : 'Đang tìm vị trí hiện tại'}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              {i18n.language === 'en' ? 'Connecting to CAD satellite signals...' : 'Đang kết nối tín hiệu vệ tinh CAD...'}
            </p>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-xl max-w-[220px] sm:max-w-[260px] text-left">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span className="text-[10px] sm:text-[11px] font-mono-data font-bold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{i18n.language === 'en' ? 'OPERATIONAL RADAR' : 'RADAR TÁC CHIẾN'}</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] sm:text-[10px] font-bold font-mono-data">
                {i18n.language === 'en' ? 'READY' : 'SẴN SÀNG'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight truncate">
              {i18n.language === 'en' ? 'Position Ready' : 'Vị trí sẵn sàng'}
            </p>
            <p className="text-[10px] text-slate-600 mt-1 font-mono leading-tight truncate">
              📍 {resolvedAddress || (i18n.language === 'en' ? 'High-Tech Park, Thu Duc City' : 'Khu Công nghệ cao, TP. Thủ Đức')}
            </p>
            <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[10px] font-mono-data text-slate-500">
              <span>{i18n.language === 'en' ? 'Rescue network:' : 'Mạng lưới cứu hộ:'}</span>
              <span className="text-emerald-700 font-bold">
                {stations.length > 0 
                  ? (i18n.language === 'en' ? `${stations.length} standby stations` : `${stations.length} trạm trực chiến`)
                  : (i18n.language === 'en' ? '24/7 Standby' : 'Trực chiến 24/7')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Map Style Switcher Segmented Pills + Expand */}
      <div className="absolute bottom-3 left-2.5 sm:bottom-auto sm:top-2.5 sm:left-auto sm:right-12 z-30 pointer-events-auto">
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-xl">
          <button
            type="button"
            onClick={() => handleSetRadarLayer('satellite')}
            className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-mono font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              radarLayer === 'satellite'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title={i18n.language === 'en' ? 'Satellite imagery mode' : 'Chế độ ảnh vệ tinh thực tế'}
          >
            <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{i18n.language === 'en' ? 'SATELLITE' : 'VỆ TINH'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetRadarLayer('streets')}
            className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              radarLayer === 'streets'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title={i18n.language === 'en' ? 'Street names map' : 'Bản đồ tên đường'}
          >
            <span>{i18n.language === 'en' ? 'STREETS' : 'ĐƯỜNG PHỐ'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetRadarLayer('dark')}
            className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              radarLayer === 'dark'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title={i18n.language === 'en' ? 'Night CAD mode' : 'Chế độ CAD tác chiến ban đêm'}
          >
            <span>{i18n.language === 'en' ? 'DARK CAD' : 'CAD TỐI'}</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleExpanded}
        className="absolute top-2.5 right-2.5 z-30 pointer-events-auto w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 backdrop-blur-md flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer"
        title={
          i18n.language === 'en'
            ? (isExpanded ? 'Minimize map' : 'Maximize map')
            : (isExpanded ? 'Thu nhỏ bản đồ' : 'Phóng to bản đồ')
        }
        aria-label={
          i18n.language === 'en'
            ? (isExpanded ? 'Minimize map' : 'Maximize map')
            : (isExpanded ? 'Thu nhỏ bản đồ' : 'Phóng to bản đồ')
        }
      >
        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>

      {/* Floating Controls: My Location + Zoom In / Out */}
      <div className="absolute bottom-3 right-3 z-30 pointer-events-auto flex flex-col gap-1.5 items-center">
        <button
          type="button"
          onClick={handleGoToMyLocation}
          disabled={isLocatingUser}
          className={`w-8 h-8 rounded-lg border backdrop-blur-md flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer ${
            isLocatingUser
              ? 'bg-blue-600 text-white border-blue-400 animate-pulse'
              : 'bg-slate-900/90 hover:bg-slate-800 text-white border-slate-700/80 hover:text-blue-400'
          }`}
          title={i18n.language === 'en' ? 'My location' : 'Vị trí của tôi'}
          aria-label={i18n.language === 'en' ? 'My location' : 'Vị trí của tôi'}
        >
          <LocateFixed className={`w-4 h-4 ${isLocatingUser ? 'animate-spin text-white' : ''}`} />
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 backdrop-blur-md flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer"
          title={i18n.language === 'en' ? 'Zoom in (+)' : 'Phóng to bản đồ (+)'}
          aria-label={i18n.language === 'en' ? 'Zoom in' : 'Phóng to bản đồ'}
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 backdrop-blur-md flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer"
          title={i18n.language === 'en' ? 'Zoom out (-)' : 'Thu nhỏ bản đồ (-)'}
          aria-label={i18n.language === 'en' ? 'Zoom out' : 'Thu nhỏ bản đồ'}
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
      </div>
    </div>
  );
};
