import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  X,
  Truck,
  AlertTriangle,
  PhoneCall,
  Clock,
  Compass,
  Navigation,
  LocateFixed,
  Maximize2,
  RefreshCw,
  CheckCircle2,
  Shield,
  Gauge,
  Radio,
  PlusCircle,
} from 'lucide-react';
import {
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_STYLE,
  mapboxService,
} from '../../services/mapboxService';
import { incidentService, type CitizenTrackingDto } from '../../services/incidentService';
import {
  trackingHubService,
  incidentHubService,
} from '../../services/realtime/incidentHubService';
import { liveMapService } from '../../services/liveMapService';
import {
  stationMarkerHtml,
  vehicleMarkerHtml,
  incidentMarkerHtml,
} from '../operator/livemap/mapIcons';
import type { IncidentResponseDto, IncidentCategory, SeverityLevel } from '../../types/incident';
import type { VehicleStatus, VehicleType } from '../../types/vehicle';
import { haversineDistanceKm } from '../../utils/serviceArea';
import { useTranslation } from '../../i18n';
import { CitizenSupplementModal } from './CitizenSupplementModal';

interface CitizenLiveTrackingMapModalProps {
  incident: IncidentResponseDto;
  onClose: () => void;
}

export const CitizenLiveTrackingMapModal: React.FC<CitizenLiveTrackingMapModalProps> = ({
  incident,
  onClose,
}) => {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Markers
  const incidentMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const vehicleMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const vehicleMarkerElRef = useRef<HTMLDivElement | null>(null);
  const stationMarkersRef = useRef<mapboxgl.Marker[]>([]);

  const [trackingData, setTrackingData] = useState<CitizenTrackingDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Live vehicle metrics from SignalR
  const [liveVehicle, setLiveVehicle] = useState<{
    lat: number;
    lng: number;
    heading: number;
    speedKmh: number;
  } | null>(null);

  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [isFollowingVehicle, setIsFollowingVehicle] = useState<boolean>(false);
  const [showSupplementModal, setShowSupplementModal] = useState<boolean>(false);
  const isPollingStoppedRef = useRef<boolean>(false);

  // Fetch initial tracking data
  const fetchTracking = useCallback(async (isSilent = false) => {
    if (isPollingStoppedRef.current && isSilent) return;
    try {
      if (!isSilent) setIsLoading(true);
      const res = await incidentService.getTracking(incident.id);
      if (res.data) {
        setTrackingData(res.data);
        setErrorMsg('');
        if (res.data.vehicleLat && res.data.vehicleLng) {
          setLiveVehicle((prev) => ({
            lat: res.data.vehicleLat!,
            lng: res.data.vehicleLng!,
            heading: prev?.heading || 0,
            speedKmh: prev?.speedKmh || 0,
          }));
        }
      } else if (!isSilent) {
        setErrorMsg('Chưa có thông tin xe cứu hộ đang di chuyển.');
      }
    } catch (err: any) {
      if (err?.response?.status === 403) {
        isPollingStoppedRef.current = true;
        setErrorMsg(
          err?.response?.data?.message ||
            'Bạn chưa có quyền theo dõi trực tiếp sự cố gốc này (Backend chưa phân quyền cho tài khoản báo cáo trùng).'
        );
      } else if (err?.response?.status === 401) {
        isPollingStoppedRef.current = true;
      } else if (!isSilent) {
        const msg = err?.response?.data?.message || err?.message || 'Chưa thể lấy thông tin điều phối xe.';
        setErrorMsg(msg);
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [incident.id]);

  // Initial fetch and polling fallback
  useEffect(() => {
    isPollingStoppedRef.current = false;
    fetchTracking(false);
    const interval = setInterval(() => {
      if (!isPollingStoppedRef.current) {
        fetchTracking(true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchTracking]);

  // SignalR Realtime Listeners for tracking & status
  useEffect(() => {
    let isSubscribed = false;

    const setupSignalR = async () => {
      try {
        await trackingHubService.start();
        // Ghi danh nhận tọa độ xe sự cố này
        await trackingHubService.invoke('SubscribeIncident', incident.id);
        isSubscribed = true;
      } catch (err) {
        console.info('SignalR TrackingHub subscribe notice (polling active):', err);
      }

      try {
        await incidentHubService.start();
      } catch {
        // Ignore
      }
    };

    setupSignalR();

    // Lắng nghe tọa độ xe di chuyển thời gian thực từ TrackingHub
    const unsubscribeLocation = trackingHubService.on('ReceiveRescueUnitLocation', (payload: any) => {
      if (!payload) return;
      const targetIncId = payload.incidentId || payload.IncidentId;
      if (targetIncId && targetIncId.toLowerCase() !== incident.id.toLowerCase()) {
        return;
      }

      const lat = payload.latitude ?? payload.Latitude;
      const lng = payload.longitude ?? payload.Longitude;
      const heading = payload.headingDegrees ?? payload.HeadingDegrees ?? 0;
      const speed = payload.speedKmh ?? payload.SpeedKmh ?? 0;

      if (typeof lat === 'number' && typeof lng === 'number') {
        setLiveVehicle({ lat, lng, heading, speedKmh: Math.round(speed) });

        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.setLngLat([lng, lat]);
          if (typeof heading === 'number') {
            vehicleMarkerRef.current.setRotation(heading);
          }
        }
        if (vehicleMarkerElRef.current) {
          const arrowEl = vehicleMarkerElRef.current.querySelector('.vehicle-heading-arrow') as HTMLElement | null;
          if (arrowEl) {
            arrowEl.style.transform = `rotate(${heading}deg)`;
          }
        }
        if (isFollowingVehicle && mapRef.current) {
          mapRef.current.easeTo({ center: [lng, lat], zoom: 16, duration: 800 });
        }
      }
    });

    // Lắng nghe cập nhật trạng thái phân công (Accepted, EnRoute, OnScene...)
    const unsubscribeAssignment = incidentHubService.on('ReceiveAssignmentStatus', (payload: any) => {
      fetchTracking(true);
    });

    return () => {
      if (isSubscribed) {
        trackingHubService.invoke('UnsubscribeIncident', incident.id).catch(() => {});
      }
      unsubscribeLocation();
      unsubscribeAssignment();
    };
  }, [incident.id, isFollowingVehicle, fetchTracking]);

  // Fit bounds helper
  const fitRouteBounds = useCallback(() => {
    if (!mapRef.current) return;
    const bounds = new mapboxgl.LngLatBounds();

    if (incident.longitude && incident.latitude) {
      bounds.extend([incident.longitude, incident.latitude]);
    }
    if (liveVehicle?.lng && liveVehicle?.lat) {
      bounds.extend([liveVehicle.lng, liveVehicle.lat]);
    } else if (trackingData?.vehicleLng && trackingData?.vehicleLat) {
      bounds.extend([trackingData.vehicleLng, trackingData.vehicleLat]);
    }

    if (trackingData?.routeTrajectory && trackingData.routeTrajectory.length > 0) {
      trackingData.routeTrajectory.forEach((p) => {
        bounds.extend([p.longitude, p.latitude]);
      });
    }

    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 16,
        duration: 1000,
      });
    }
  }, [incident.latitude, incident.longitude, liveVehicle, trackingData]);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const initialCenter: [number, number] = [
      incident.longitude || 106.8089,
      incident.latitude || 10.8441,
    ];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLE,
      center: initialCenter,
      zoom: 14,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      setMapLoaded(true);
      map.resize();
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [incident.id]);

  // Draw or update Rescue Stations on Tracking Map
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    liveMapService
      .getStations()
      .then((stations) => {
        stationMarkersRef.current.forEach((m) => m.remove());
        stationMarkersRef.current = [];

        stations.forEach((st) => {
          if (!st.lat || !st.lng) return;
          const isAssigningStation = Boolean(
            trackingData?.stationName &&
              st.name.toLowerCase().includes(trackingData.stationName.toLowerCase())
          );

          const stEl = document.createElement('div');
          stEl.innerHTML = stationMarkerHtml(isAssigningStation);

          const popup = new mapboxgl.Popup({ offset: [0, -32], closeButton: false }).setHTML(`
            <div style="font-family: inherit; font-size: 11px; padding: 4px; min-width: 170px; color: #0F172A;">
              <p style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748B; margin: 0 0 2px 0;">
                ${isAssigningStation ? 'Trạm xuất phát cứu hộ' : 'Trạm cứu hộ'}
              </p>
              <p style="font-size: 12px; font-weight: 700; color: #0F172A; margin: 0 0 2px 0;">${st.name}</p>
              <p style="font-size: 11px; color: #64748B; margin: 0 0 4px 0; line-height: 1.3;">${st.address || 'Khu vực nội thành'}</p>
            </div>
          `);

          const m = new mapboxgl.Marker({ element: stEl, anchor: 'bottom' })
            .setLngLat([st.lng, st.lat])
            .setPopup(popup)
            .addTo(map);

          stationMarkersRef.current.push(m);
        });
      })
      .catch((err) => console.warn('Stations load notice:', err));

    return () => {
      stationMarkersRef.current.forEach((m) => m.remove());
      stationMarkersRef.current = [];
    };
  }, [mapLoaded, trackingData?.stationName]);

  // Draw or update Incident Pin using standard incidentMarkerHtml
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    if (incident.status === 'Cancelled' || incident.status === 'Completed') {
      if (incidentMarkerRef.current) {
        incidentMarkerRef.current.remove();
        incidentMarkerRef.current = null;
      }
      return;
    }

    if (!incidentMarkerRef.current && incident.latitude && incident.longitude) {
      const el = document.createElement('div');
      const isFire =
        incident.title?.toLowerCase().includes('cháy') ||
        incident.description?.toLowerCase().includes('cháy');
      const isAccident =
        incident.title?.toLowerCase().includes('tai nạn') ||
        incident.description?.toLowerCase().includes('tai nạn') ||
        incident.title?.toLowerCase().includes('va chạm');
      const category: IncidentCategory = isFire ? 'fire' : isAccident ? 'accident' : 'unknown';
      const severity: SeverityLevel =
        incident.severity === 'Level3' ? 3 : incident.severity === 'Level2' ? 2 : 1;

      el.innerHTML = incidentMarkerHtml(category, severity, true);

      const popup = new mapboxgl.Popup({ offset: 18, closeButton: false }).setHTML(`
        <div style="font-family: inherit; font-size: 11px; padding: 4px; min-width: 160px; color: #0F172A;">
          <p style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #DC2626; margin: 0 0 2px 0;">Điểm báo sự cố</p>
          <p style="font-size: 12px; font-weight: 700; color: #0F172A; margin: 0 0 2px 0;">${incident.title || 'Hiện trường SOS'}</p>
          <p style="font-size: 11px; color: #64748B; margin: 0; line-height: 1.3;">${incident.locationAddress || 'Hiện trường'}</p>
        </div>
      `);

      incidentMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([incident.longitude, incident.latitude])
        .setPopup(popup)
        .addTo(map);
    }
  }, [mapLoaded, incident]);

  // Draw or update Vehicle Pin using standard vehicleMarkerHtml
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const vLat = liveVehicle?.lat ?? trackingData?.vehicleLat;
    const vLng = liveVehicle?.lng ?? trackingData?.vehicleLng;

    if (vLat && vLng) {
      const unitNameLower = (trackingData?.unitTypeName || '').toLowerCase();
      const vType: VehicleType =
        unitNameLower.includes('thương') || unitNameLower.includes('ambulance')
          ? 'ambulance'
          : unitNameLower.includes('hỏa') || unitNameLower.includes('fire')
            ? 'fire_truck'
            : 'rescue';

      const vStatus: VehicleStatus =
        trackingData?.dispatchStatus === 'OnScene' ? 'on_scene' : 'en_route';

      if (!vehicleMarkerRef.current) {
        const el = document.createElement('div');
        vehicleMarkerElRef.current = el;
        el.innerHTML = vehicleMarkerHtml(vType, vStatus, true);

        const popup = new mapboxgl.Popup({ offset: 18, closeButton: false }).setHTML(`
          <div style="font-family: inherit; font-size: 11px; padding: 4px; min-width: 170px; color: #0F172A;">
            <p style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #2563EB; margin: 0 0 2px 0;">Xe cứu hộ ứng cứu</p>
            <p style="font-size: 12px; font-weight: 700; color: #0F172A; margin: 0 0 2px 0;">${trackingData?.plateNumber || 'Xe cứu hộ'} (${trackingData?.unitTypeName || 'Đội CAD'})</p>
            <p style="font-size: 11px; color: #64748B; margin: 0;">Trực thuộc: ${trackingData?.stationName || 'Trạm CAD'}</p>
          </div>
        `);

        vehicleMarkerRef.current = new mapboxgl.Marker({ element: el, rotationAlignment: 'map' })
          .setLngLat([vLng, vLat])
          .setPopup(popup)
          .addTo(map);
        if (liveVehicle?.heading) {
          vehicleMarkerRef.current.setRotation(liveVehicle.heading);
        }
      } else {
        vehicleMarkerRef.current.setLngLat([vLng, vLat]);
        if (typeof liveVehicle?.heading === 'number') {
          vehicleMarkerRef.current.setRotation(liveVehicle.heading);
        }
        if (vehicleMarkerElRef.current) {
          vehicleMarkerElRef.current.innerHTML = vehicleMarkerHtml(vType, vStatus, true);
        }
      }
    }
  }, [mapLoaded, liveVehicle, trackingData]);

  // Draw Route Polyline
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const coords: [number, number][] = [];
    if (trackingData?.routeTrajectory && trackingData.routeTrajectory.length > 0) {
      trackingData.routeTrajectory.forEach((p) => {
        coords.push([p.longitude, p.latitude]);
      });
    } else if (trackingData?.vehicleLng && trackingData?.vehicleLat && incident.longitude && incident.latitude) {
      coords.push([trackingData.vehicleLng, trackingData.vehicleLat]);
      coords.push([incident.longitude, incident.latitude]);
    }

    if (coords.length >= 2) {
      const geojson: any = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
      };

      const sourceId = 'citizen-dispatch-route-source';
      const lineGlowId = 'citizen-dispatch-route-glow';
      const lineId = 'citizen-dispatch-route-line';

      const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
      const isApprox = !!trackingData?.isApproximateRoute;

      if (existingSource) {
        existingSource.setData(geojson);
        if (map.getLayer(lineId)) {
          if (isApprox) {
            map.setPaintProperty(lineId, 'line-dasharray', [2, 2]);
          } else {
            // Reset to solid line in Mapbox GL
            map.setPaintProperty(lineId, 'line-dasharray', [1, 0]);
          }
        }
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        // Glow effect layer
        map.addLayer({
          id: lineGlowId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#38BDF8',
            'line-width': 8,
            'line-opacity': 0.35,
            'line-blur': 3,
          },
        });

        // Main trajectory line - solid road route by default, dashed when approximate
        const mainLinePaint: any = {
          'line-color': '#0284C7',
          'line-width': 4.5,
          'line-opacity': 0.95,
        };
        if (isApprox) {
          mainLinePaint['line-dasharray'] = [2, 2];
        }

        map.addLayer({
          id: lineId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: mainLinePaint,
        });
      }

      fitRouteBounds();
    }
  }, [mapLoaded, trackingData, incident, fitRouteBounds]);

  const dispatchStatus = trackingData?.dispatchStatus;
  const isEnRoute = dispatchStatus === 'EnRoute' || dispatchStatus === 'Dispatched' || dispatchStatus === 'Accepted';
  const isOnScene = dispatchStatus === 'OnScene';

  const dynamicDistKm = useMemo(() => {
    const vLat = liveVehicle?.lat ?? trackingData?.vehicleLat;
    const vLng = liveVehicle?.lng ?? trackingData?.vehicleLng;
    if (vLat && vLng && incident.latitude && incident.longitude) {
      return haversineDistanceKm(vLat, vLng, incident.latitude, incident.longitude);
    }
    return trackingData?.distanceKm ?? null;
  }, [liveVehicle?.lat, liveVehicle?.lng, trackingData?.vehicleLat, trackingData?.vehicleLng, incident.latitude, incident.longitude, trackingData?.distanceKm]);

  const dynamicEtaMinutes = useMemo(() => {
    if (isOnScene) return 0;
    if (dynamicDistKm !== null) {
      const speed = (liveVehicle?.speedKmh && liveVehicle.speedKmh > 5) ? liveVehicle.speedKmh : 35;
      return Math.max(1, Math.round((dynamicDistKm / speed) * 60));
    }
    return trackingData?.estimatedArrivalMinutes || 3;
  }, [isOnScene, dynamicDistKm, liveVehicle?.speedKmh, trackingData?.estimatedArrivalMinutes]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-0 sm:p-4 lg:p-6 bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-6xl xl:max-w-7xl h-full sm:h-[90vh] max-h-[100dvh] sm:max-h-[920px] rounded-none sm:rounded-3xl bg-white border-0 sm:border border-slate-200 shadow-2xl flex flex-col overflow-hidden text-slate-900 transition-all">
        
        {/* Top Header - ResQ CAD Web Style */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative p-2 sm:p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
              <Truck className="w-5 h-5 text-blue-600" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight">
                  {t('citizen.reports.trackingModalTitle')}
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>GPS LIVE</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                {t('citizen.reports.trackingIncidentCode')}{' '}
                <span className="text-red-600 font-bold font-mono">#INC-{incident.id.substring(0, 8).toUpperCase()}</span>
                {incident.title ? ` · ${incident.title}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {incident.status !== 'Completed' && incident.status !== 'Cancelled' && (
              <button
                type="button"
                onClick={() => setShowSupplementModal(true)}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm shadow-red-500/20 cursor-pointer shrink-0 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Bổ sung thông tin</span>
                <span className="sm:hidden">Bổ sung</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Access Warning / Error Banner */}
        {errorMsg && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Content Body: Map + Info Sidebar */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative overflow-hidden">
          
          {/* Map View Area */}
          <div className="relative h-[320px] sm:h-[400px] lg:h-full w-full bg-slate-100 shrink-0 lg:shrink lg:flex-1 overflow-hidden">
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

            {/* Floating Top Controls inside Map */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2.5 pointer-events-auto">
              <button
                type="button"
                onClick={fitRouteBounds}
                className="px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                <span>{t('citizen.reports.viewFullRoute')}</span>
              </button>

              {liveVehicle && (
                <button
                  type="button"
                  onClick={() => {
                    setIsFollowingVehicle((v) => !v);
                    if (mapRef.current) {
                      mapRef.current.easeTo({
                        center: [liveVehicle.lng, liveVehicle.lat],
                        zoom: 16,
                        duration: 800,
                      });
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl backdrop-blur-md text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                    isFollowingVehicle
                      ? 'bg-blue-600 text-white border border-blue-500 shadow-blue-500/20'
                      : 'bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90'
                  }`}
                >
                  <Navigation className={`w-3.5 h-3.5 ${isFollowingVehicle ? 'text-white' : 'text-blue-600'}`} />
                  <span>{isFollowingVehicle ? t('citizen.reports.followingVehicle') : t('citizen.reports.followVehicle')}</span>
                </button>
              )}
            </div>

            {/* Floating Live Telemetry Overlay over Map */}
            {trackingData && (
              <div className="absolute bottom-4 left-4 right-4 sm:right-auto z-10 sm:max-w-lg w-auto pointer-events-auto">
                <div className="p-4 sm:p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl text-slate-900 space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t('citizen.reports.responseStatusTitle')}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                        isOnScene
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isEnRoute
                            ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnScene ? 'bg-emerald-500' : isEnRoute ? 'bg-blue-500' : 'bg-amber-500'}`} />
                      <span>
                        {isOnScene
                          ? t('citizen.reports.statusOnScene')
                          : dispatchStatus === 'EnRoute'
                            ? t('citizen.reports.statusEnRoute')
                            : dispatchStatus === 'Accepted'
                              ? t('citizen.reports.statusMissionAccepted')
                              : t('citizen.reports.statusDispatching')}
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-3 border-t border-slate-100 text-center">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                      <div className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{t('citizen.reports.etaTitle').replace(':', '')}</span>
                      </div>
                      <div className="text-lg sm:text-2xl font-black text-amber-600 mt-1">
                        ~{dynamicEtaMinutes} <span className="text-xs font-bold text-amber-700">{t('citizen.reports.minutes')}</span>
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                      <div className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        <span>{t('citizen.reports.distanceTitle').replace(':', '')}</span>
                      </div>
                      <div className="text-lg sm:text-2xl font-black text-blue-600 mt-1">
                        {dynamicDistKm !== null ? dynamicDistKm.toFixed(1) : (trackingData.distanceKm ? trackingData.distanceKm.toFixed(1) : '1.2')} <span className="text-xs font-bold text-blue-700">km</span>
                        {trackingData.isApproximateRoute && (
                          <span className="block text-[10px] font-medium text-amber-600">{t('citizen.reports.approximateNote')}</span>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                      <div className="text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{t('citizen.reports.vehicleSpeedTitle')}</span>
                      </div>
                      <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-1">
                        {liveVehicle?.speedKmh || (isEnRoute ? 35 : 0)} <span className="text-xs font-bold text-emerald-700">km/h</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Detail Panel */}
          <div className="w-full lg:w-[400px] xl:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50/70 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto space-y-5">
            <div className="space-y-4">
              
              {/* Unit Info Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-wide">
                      {t('citizen.reports.rescueVehicleTitle')}
                    </span>
                    <p className="text-[11px] text-slate-400">Đơn vị chuyên trách ứng cứu</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">{t('citizen.reports.plateNumberTitle').replace(':', '')}</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs tracking-wider">
                      {trackingData?.plateNumber || '51A-114.99'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">{t('citizen.reports.unitTypeTitle').replace(':', '')}</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {trackingData?.unitTypeName || t('citizen.reports.rescueUnitDefault')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">{t('citizen.reports.stationTitle').replace(':', '')}</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm text-right max-w-[200px] truncate" title={trackingData?.stationName || t('citizen.reports.cadStationDefault')}>
                      {trackingData?.stationName || t('citizen.reports.cadStationDefault')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Destination Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-wide">
                      {t('citizen.reports.incidentLocationTitle')}
                    </span>
                    <p className="text-[11px] text-slate-400">Địa điểm cứu nạn được chỉ định</p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  {incident.locationAddress || 'Vị trí hiện trường ghi nhận'}
                </p>
              </div>

              {/* Instruction banner */}
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/90 text-xs text-blue-900 space-y-2">
                <div className="font-bold flex items-center gap-2 text-blue-800 text-xs sm:text-sm">
                  <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span>{t('citizen.reports.dispatchChannelTitle')}</span>
                </div>
                <p className="text-blue-700 leading-relaxed text-xs">
                  {t('citizen.reports.dispatchChannelDesc')}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2.5 pt-2">
              {trackingData?.stationPhoneNumber && (
                <a
                  href={`tel:${trackingData.stationPhoneNumber}`}
                  className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md shadow-red-600/20 transition-all cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{t('citizen.reports.callStation')} ({trackingData.stationPhoneNumber})</span>
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                {t('citizen.reports.closeWindow')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Citizen Supplement Modal */}
      <CitizenSupplementModal
        isOpen={showSupplementModal}
        onClose={() => setShowSupplementModal(false)}
        incidentId={incident.id}
        incidentTitle={incident.title}
        isLinked={incident.status === 'Linked'}
      />
    </div>
  );
};
