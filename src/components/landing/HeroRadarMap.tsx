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
  LocateFixed,
  Building2,
  Clock,
  Car,
  Activity,
} from 'lucide-react';
import {
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_DARK_STYLE,
  MAPBOX_REALISTIC_STYLE,
  mapboxService,
} from '../../services/mapboxService';
import { incidentService, type CitizenTrackingDto } from '../../services/incidentService';
import { liveMapService } from '../../services/liveMapService';
import {
  trackingHubService,
  incidentHubService,
  HubEvents,
} from '../../services/realtime/incidentHubService';
import {
  stationMarkerHtml,
  vehicleMarkerHtml,
  incidentMarkerHtml,
} from '../operator/livemap/mapIcons';
import type { IncidentResponseDto, IncidentCategory, SeverityLevel } from '../../types/incident';
import { getIncidentVisualMeta, formatCitizenIncidentStatus } from '../../utils/incidentFormat';
import type { RescueUnitResponseDto } from '../../types/rescueUnit';
import type { Station, VehicleStatus, VehicleType } from '../../types/vehicle';
import { useTranslation } from '../../i18n';

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

const UNIT_TYPE_MAP: Record<string, VehicleType> = {
  Ambulance: 'ambulance',
  FireTruck: 'fire_truck',
  LadderTruck: 'fire_truck',
  RescueBoat: 'rescue',
  HeavyRescueVehicle: 'rescue',
  PolicePatrol: 'police',
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [radarLayer, setRadarLayer] = useState<'satellite' | 'dark'>('satellite');

  // Real entities state
  const [stations, setStations] = useState<Station[]>([]);
  const [units, setUnits] = useState<RescueUnitResponseDto[]>([]);
  const [reportedIncident, setReportedIncident] = useState<IncidentResponseDto | null>(null);
  const [trackingData, setTrackingData] = useState<CitizenTrackingDto | null>(null);

  // Markers references for dynamic updates
  const stationMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const unitMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const incidentMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const myLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // User location status
  const [locationStatus, setLocationStatus] = useState<'locating' | 'locked' | 'failed'>('locating');
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);

  // Tactical route updater on Mapbox canvas
  const updateRouteTrajectory = useCallback((coords: [number, number][]) => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const source = map.getSource('tactical-routes') as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features:
            coords.length >= 2
              ? [
                  {
                    type: 'Feature',
                    properties: { color: '#3B82F6' },
                    geometry: {
                      type: 'LineString',
                      coordinates: coords,
                    },
                  },
                ]
              : [],
        });
      }
    } catch {
      // Layer/source might still be loading
    }
  }, []);

  // Fetch real stations & rescue units
  const fetchRealEntities = useCallback(async () => {
    try {
      const [fetchedStations, fetchedUnits] = await Promise.all([
        liveMapService.getStations().catch(() => [] as Station[]),
        liveMapService.getRescueUnits().catch(() => [] as RescueUnitResponseDto[]),
      ]);

      setStations(fetchedStations);
      setUnits(fetchedUnits);

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
  }, [onStatsUpdate, trackingData?.estimatedArrivalMinutes]);

  // Check citizen reported incident (from storage or API)
  const checkCitizenReportedIncident = useCallback(async () => {
    try {
      const storedIds: string[] = JSON.parse(
        localStorage.getItem('resq_my_reported_incident_ids') || '[]'
      );
      if (storedIds.length > 0) {
        for (const id of storedIds.slice(0, 5)) {
          const res = await incidentService.getById(id).catch(() => null);
          if (res?.success && res.data) {
            // Prioritize active (non-cancelled, non-completed) incidents for the radar map
            if (res.data.status !== 'Cancelled' && res.data.status !== 'Completed') {
              setReportedIncident(res.data);
              return;
            }
          }
        }
      }

      // Fallback for logged-in citizen without localStorage items
      const myReportsRes = await incidentService.getMyReports({ pageSize: 5 }).catch(() => null);
      if (myReportsRes?.success && myReportsRes.data.items.length > 0) {
        for (const item of myReportsRes.data.items) {
          if (item.status !== 'Cancelled' && item.status !== 'Completed') {
            const res = await incidentService.getById(item.id).catch(() => null);
            if (res?.success && res.data) {
              setReportedIncident(res.data);
              return;
            }
          }
        }
      }

      // If all incidents are cancelled or resolved, clear active incident so HUD shows normal GPS state
      setReportedIncident(null);
    } catch {
      // Ignore
    }
  }, []);

  // Load tracking data if incident has active dispatch
  useEffect(() => {
    if (!reportedIncident?.id || reportedIncident.status === 'Cancelled' || reportedIncident.status === 'Completed') {
      setTrackingData(null);
      updateRouteTrajectory([]);
      return;
    }

    if (reportedIncident.status === 'Dispatched' || reportedIncident.status === 'InProgress') {
      incidentService
        .getTracking(reportedIncident.id)
        .then((res) => {
          if (res.data) {
            setTrackingData(res.data);
            if (res.data.routeTrajectory && res.data.routeTrajectory.length >= 2) {
              const coords: [number, number][] = res.data.routeTrajectory.map((pt) => [
                pt.longitude,
                pt.latitude,
              ]);
              updateRouteTrajectory(coords);
            } else if (
              res.data.vehicleLat &&
              res.data.vehicleLng &&
              reportedIncident.latitude &&
              reportedIncident.longitude
            ) {
              updateRouteTrajectory([
                [res.data.vehicleLng, res.data.vehicleLat],
                [reportedIncident.longitude, reportedIncident.latitude],
              ]);
            }
          }
        })
        .catch(() => {});
    } else {
      setTrackingData(null);
      updateRouteTrajectory([]);
    }
  }, [reportedIncident?.id, reportedIncident?.status, reportedIncident?.latitude, reportedIncident?.longitude, updateRouteTrajectory]);

  // Initial loads & custom events
  useEffect(() => {
    fetchRealEntities();
    checkCitizenReportedIncident();

    const handleIncidentUpdated = (e: any) => {
      if (e.detail?.status === 'Cancelled' || e.detail?.status === 'Completed') {
        if (incidentMarkerRef.current) {
          incidentMarkerRef.current.remove();
          incidentMarkerRef.current = null;
        }
        setReportedIncident(null);
        setTrackingData(null);
        updateRouteTrajectory([]);
      } else if (e.detail) {
        setReportedIncident(e.detail);
      } else {
        checkCitizenReportedIncident();
      }
    };

    window.addEventListener('resq_incident_updated', handleIncidentUpdated);
    window.addEventListener('storage', checkCitizenReportedIncident);

    // Refresh every 12s as polling fallback
    const interval = setInterval(() => {
      fetchRealEntities();
      checkCitizenReportedIncident();
    }, 12000);

    return () => {
      window.removeEventListener('resq_incident_updated', handleIncidentUpdated);
      window.removeEventListener('storage', checkCitizenReportedIncident);
      clearInterval(interval);
    };
  }, [fetchRealEntities, checkCitizenReportedIncident]);

  // SignalR Realtime Listeners
  useEffect(() => {
    const setupSignalR = async () => {
      try {
        await trackingHubService.start();
        if (reportedIncident?.id) {
          await trackingHubService.invoke('SubscribeIncident', reportedIncident.id);
        }
      } catch {
        // Fallback to polling
      }

      try {
        await incidentHubService.start();
      } catch {
        // Fallback to polling
      }
    };

    setupSignalR();

    // Listen to real-time rescue unit locations
    const unsubLocation = trackingHubService.on(
      HubEvents.ReceiveRescueUnitLocation,
      (msg: any) => {
        if (!msg) return;
        const unitId = msg.rescueUnitId || msg.RescueUnitId;
        const lat = msg.latitude ?? msg.Latitude;
        const lng = msg.longitude ?? msg.Longitude;

        if (unitId && typeof lat === 'number' && typeof lng === 'number') {
          const marker = unitMarkersRef.current.get(unitId);
          if (marker) {
            marker.setLngLat([lng, lat]);
          }

          // If assigned to citizen's incident, update route trajectory live
          if (
            trackingData?.rescueUnitId === unitId &&
            reportedIncident?.latitude &&
            reportedIncident?.longitude
          ) {
            updateRouteTrajectory([
              [lng, lat],
              [reportedIncident.longitude, reportedIncident.latitude],
            ]);
          }
        }
      }
    );

    // Listen to incident lifecycle updates
    const unsubIncident = incidentHubService.on(
      HubEvents.ReceiveIncidentUpdate,
      (updated: any) => {
        if (!updated) return;
        if (reportedIncident?.id && updated.id === reportedIncident.id) {
          setReportedIncident((prev) => (prev ? { ...prev, ...updated } : updated));
        }
      }
    );

    return () => {
      unsubLocation();
      unsubIncident();
    };
  }, [reportedIncident?.id, reportedIncident?.latitude, reportedIncident?.longitude, trackingData?.rescueUnitId, updateRouteTrajectory]);

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
      style: MAPBOX_REALISTIC_STYLE,
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
        if (!map.getSource('tactical-routes')) {
          map.addSource('tactical-routes', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          });

          map.addLayer({
            id: 'tactical-routes-line',
            type: 'line',
            source: 'tactical-routes',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 3.5,
              'line-dasharray': [2, 2],
              'line-opacity': 0.9,
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
    });

    map.on('style.load', () => {
      setupTacticalLayer();
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

      if (incidentMarkerRef.current) {
        incidentMarkerRef.current.remove();
        incidentMarkerRef.current = null;
      }
      if (myLocationMarkerRef.current) {
        myLocationMarkerRef.current.remove();
        myLocationMarkerRef.current = null;
      }

      map.remove();
      mapRef.current = null;
    };
  }, []);

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
      el.innerHTML = stationMarkerHtml(false);

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; padding: 6px 8px; min-width: 170px;">
          <div style="font-size: 12px; font-weight: 700; color: #0F172A;">${station.name}</div>
          <div style="font-size: 10px; color: #64748B; margin-top: 2px;">📍 ${station.address || 'Khu Công nghệ cao (SHTP)'}</div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding-top: 4px; border-top: 1px solid #E2E8F0; font-size: 10px; font-family: monospace;">
            <span style="color: #059669; font-weight: 700;">TRỰC CHIẾN 24/7</span>
            <span style="color: #3B82F6; font-weight: 700;">${station.vehicleIds.length} XE</span>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: [0, -32], closeButton: false }).setHTML(popupHtml);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([station.lng, station.lat])
        .setPopup(popup)
        .addTo(map);

      stationMarkersRef.current.push(marker);
    });
  }, [stations]);

  // Render Real Rescue Unit Markers (Vehicles / Staff)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || units.length === 0) return;

    // Map stations for coordinate placement fallback if unit has 0,0
    const stationMap = new Map<string, Station>();
    stations.forEach((s) => stationMap.set(s.id, s));

    // Clear removed units
    const currentUnitIds = new Set(units.map((u) => u.id));
    unitMarkersRef.current.forEach((marker, id) => {
      if (!currentUnitIds.has(id)) {
        marker.remove();
        unitMarkersRef.current.delete(id);
      }
    });

    units.forEach((unit, idx) => {
      let lat = unit.currentLat;
      let lng = unit.currentLng;

      // Fallback: if coordinates are (0,0), position neatly near its station
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
      const isAssigned = trackingData?.rescueUnitId === unit.id;

      let marker = unitMarkersRef.current.get(unit.id);
      if (!marker) {
        const el = document.createElement('div');
        el.className = 'cad-unit-marker';
        el.innerHTML = vehicleMarkerHtml(vType, vStatus, isAssigned);

        const popupHtml = `
          <div style="font-family: system-ui, sans-serif; padding: 6px 8px; min-width: 170px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
              <span style="font-size: 12px; font-weight: 800; font-family: monospace; color: #0F172A;">${unit.plateNumber}</span>
              <span style="font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px; background: ${
                vStatus === 'en_route' ? '#DBEAFE; color: #1D4ED8;' : vStatus === 'on_scene' ? '#FFEDD5; color: #C2410C;' : '#D1FAE5; color: #047857;'
              }">${unit.statusName || unit.status}</span>
            </div>
            <div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px;">${unit.unitTypeName}</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">🏢 ${unit.stationName || 'Trạm nội khu'}</div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 14, closeButton: false }).setHTML(popupHtml);

        marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        unitMarkersRef.current.set(unit.id, marker);
      } else {
        marker.setLngLat([lng, lat]);
        const el = marker.getElement();
        el.innerHTML = vehicleMarkerHtml(vType, vStatus, isAssigned);
      }
    });
  }, [units, stations, trackingData?.rescueUnitId]);

  // Render Citizen Reported Incident Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (
      !reportedIncident?.latitude ||
      !reportedIncident?.longitude ||
      reportedIncident.status === 'Cancelled' ||
      reportedIncident.status === 'Completed'
    ) {
      if (incidentMarkerRef.current) {
        incidentMarkerRef.current.remove();
        incidentMarkerRef.current = null;
      }
      return;
    }

    const cat = getIncidentCategory(reportedIncident);
    const sev = getIncidentSeverity(reportedIncident.severity);

    const visual = getIncidentVisualMeta(reportedIncident);
    const photoHtml = reportedIncident.mediaItems?.[0]?.mediaUrl
      ? `<img src="${reportedIncident.mediaItems[0].mediaUrl}" style="width: 100%; height: 75px; object-fit: cover; border-radius: 6px; margin-bottom: 6px;" alt="${i18n.language === 'en' ? 'Incident scene' : 'Hiện trường'}" />`
      : '';
    const isTypeKnown = visual.category === 'fire' || visual.category === 'accident';
    const displayTitle = isTypeKnown
      ? visual.label
      : reportedIncident.title && !reportedIncident.title.includes('Tín hiệu') && !reportedIncident.title.includes('SOS')
      ? reportedIncident.title
      : t('citizen.reports.incidentTypes.sosSignal');

    const statusText = formatCitizenIncidentStatus(reportedIncident.status);
    const isDispatched = reportedIncident.status === 'Dispatched' || reportedIncident.status === 'InProgress';
    const statusColor = isDispatched ? '#059669' : '#DC2626';
    const statusLabel = i18n.language === 'en' ? 'STATUS' : 'TRẠNG THÁI';

    const popupHtml = `
      <div style="font-family: system-ui, sans-serif; padding: 6px 8px; min-width: 190px;">
        ${photoHtml}
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 3px;">
          <span style="font-size: 11px; font-weight: 800; color: #DC2626;">${visual.icon} ${visual.label}</span>
          <span style="font-size: 10px; font-family: monospace; color: #64748B;">#${reportedIncident.id.slice(0, 6).toUpperCase()}</span>
        </div>
        <div style="font-size: 11px; font-weight: 700; color: #0F172A;">${displayTitle}</div>
        <div style="font-size: 10px; color: #64748B; margin-top: 2px;">📍 ${reportedIncident.locationAddress}</div>
        <div style="font-size: 10px; font-weight: 700; color: ${statusColor}; margin-top: 4px; padding-top: 4px; border-top: 1px solid #E2E8F0;">
          ${statusLabel}: ${statusText.toUpperCase()}
        </div>
      </div>
    `;

    if (!incidentMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'cad-marker-incident cursor-pointer';
      el.innerHTML = incidentMarkerHtml(cat, sev, true);

      const popup = new mapboxgl.Popup({ offset: 18, closeButton: false }).setHTML(popupHtml);

      incidentMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([reportedIncident.longitude, reportedIncident.latitude])
        .setPopup(popup)
        .addTo(map);

      map.flyTo({
        center: [reportedIncident.longitude, reportedIncident.latitude],
        zoom: 15,
        essential: true,
        duration: 1200,
      });
    } else {
      incidentMarkerRef.current.setLngLat([reportedIncident.longitude, reportedIncident.latitude]);
      const el = incidentMarkerRef.current.getElement();
      el.innerHTML = incidentMarkerHtml(cat, sev, true);
      const popup = incidentMarkerRef.current.getPopup();
      if (popup) {
        popup.setHTML(popupHtml);
      }
    }
  }, [reportedIncident]);

  const handleSetRadarLayer = (nextMode: 'satellite' | 'dark') => {
    if (nextMode === radarLayer) return;
    setRadarLayer(nextMode);
    if (mapRef.current) {
      mapRef.current.setStyle(nextMode === 'satellite' ? MAPBOX_REALISTIC_STYLE : MAPBOX_DARK_STYLE);
    }
  };

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
    <div className="relative flex-1 min-h-[160px] rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
      {/* Real Interactive Mapbox CAD Canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Rotating Radar Sweep Line Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <div className="w-[550px] h-[550px] rounded-full border border-red-500/20 flex items-center justify-center">
          <div className="w-[380px] h-[380px] rounded-full border border-red-500/30 flex items-center justify-center">
            <div className="w-[200px] h-[200px] rounded-full border border-red-500/40" />
          </div>
        </div>
        <div className="absolute w-[550px] h-[550px] rounded-full animate-radar-sweep bg-gradient-to-tr from-red-500/10 via-transparent to-transparent origin-center" />
      </div>

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
          const displayTitle = isTypeKnown ? visual.label : 'Tín hiệu SOS';
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
              title="Bấm để mở lịch sử sự cố và theo dõi xe cứu hộ"
            >
              {/* Top line: Category pill + Status badge */}
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${visual.badgeClass}`}>
                  <span>{visual.icon}</span>
                  <span className="truncate max-w-[130px]">{visual.label}</span>
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold font-mono-data shrink-0 ${
                    reportedIncident.status === 'Dispatched' || reportedIncident.status === 'InProgress'
                      ? 'bg-emerald-600 text-white'
                      : reportedIncident.status === 'Cancelled'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {formatCitizenIncidentStatus(reportedIncident.status).toUpperCase()}
                </span>
              </div>

              {/* Main Info: Thumbnail + Title & AI summary */}
              <div className="flex items-start gap-2">
                {hasPhoto && (
                  <img
                    src={reportedIncident.mediaItems[0].mediaUrl}
                    alt="Hiện trường"
                    className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 shadow-xs"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight truncate">
                      {displayTitle}
                    </p>
                    <span className="text-[9px] font-mono text-slate-400 shrink-0">
                      #{reportedIncident.id.slice(0, 6).toUpperCase()}
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
              {(reportedIncident.status === 'Dispatched' || reportedIncident.status === 'InProgress') && trackingData && (
                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-700">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-emerald-600" />
                    ETA: ~{trackingData.estimatedArrivalMinutes || 3}p
                  </span>
                  <span className="text-slate-600 font-bold truncate max-w-[110px]">
                    {trackingData.plateNumber || 'Xe cứu hộ'}
                  </span>
                </div>
              )}

              <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[10px] font-mono-data text-red-600 font-bold">
                <span>{t('citizen.landing.radarFollowAction')}</span>
                <ChevronRight className="w-3 h-3 text-red-600" />
              </div>
            </div>
          );
        })() : locationStatus === 'failed' ? (
          <div className="bg-white/95 backdrop-blur-md border border-red-200 rounded-xl p-2.5 sm:p-3 shadow-xl max-w-[220px] sm:max-w-[260px] text-left">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span className="text-[10px] sm:text-[11px] font-mono-data font-bold text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>ĐỊNH VỊ GPS</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-red-100 border border-red-200 text-red-700 text-[9px] sm:text-[10px] font-bold font-mono-data">
                LỖI VỊ TRÍ
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight">
              Không lấy được vị trí
            </p>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              Vui lòng bật định vị GPS hoặc cấp quyền truy cập vị trí trên trình duyệt.
            </p>
          </div>
        ) : locationStatus === 'locating' ? (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-xl max-w-[220px] sm:max-w-[260px] text-left">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span className="text-[10px] sm:text-[11px] font-mono-data font-bold text-amber-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>ĐỊNH VỊ GPS</span>
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

      {/* Floating Map Style Switcher Segmented Pills */}
      <div className="absolute top-2.5 right-2.5 z-30 pointer-events-auto">
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-xl">
          <button
            type="button"
            onClick={() => handleSetRadarLayer('satellite')}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              radarLayer === 'satellite'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title={i18n.language === 'en' ? 'Satellite imagery mode' : 'Chế độ ảnh vệ tinh thực tế'}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{i18n.language === 'en' ? 'SATELLITE' : 'VỆ TINH'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetRadarLayer('dark')}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
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
  );
};
