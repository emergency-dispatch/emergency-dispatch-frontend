import React, { useEffect, useRef, useState, useCallback } from 'react';
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

interface CitizenLiveTrackingMapModalProps {
  incident: IncidentResponseDto;
  onClose: () => void;
}

export const CitizenLiveTrackingMapModal: React.FC<CitizenLiveTrackingMapModalProps> = ({
  incident,
  onClose,
}) => {
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

  // Fetch initial tracking data
  const fetchTracking = useCallback(async (isSilent = false) => {
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
      if (!isSilent) {
        const msg = err?.response?.data?.message || err?.message || 'Chưa thể lấy thông tin điều phối xe.';
        setErrorMsg(msg);
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [incident.id]);

  // Initial fetch and polling fallback
  useEffect(() => {
    fetchTracking(false);
    const interval = setInterval(() => {
      fetchTracking(true);
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

    if (!incidentMarkerRef.current && incident.latitude && incident.longitude) {
      const el = document.createElement('div');
      const isFire =
        incident.title?.toLowerCase().includes('cháy') ||
        incident.description?.toLowerCase().includes('cháy');
      const category: IncidentCategory = isFire ? 'fire' : 'accident';
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

        vehicleMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([vLng, vLat])
          .setPopup(popup)
          .addTo(map);
      } else {
        vehicleMarkerRef.current.setLngLat([vLng, vLat]);
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
      if (existingSource) {
        existingSource.setData(geojson);
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

        // Main trajectory line
        map.addLayer({
          id: lineId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#0284C7',
            'line-width': 4.5,
            'line-opacity': 0.95,
          },
        });
      }

      fitRouteBounds();
    }
  }, [mapLoaded, trackingData, incident, fitRouteBounds]);

  const dispatchStatus = trackingData?.dispatchStatus;
  const isEnRoute = dispatchStatus === 'EnRoute' || dispatchStatus === 'Dispatched' || dispatchStatus === 'Accepted';
  const isOnScene = dispatchStatus === 'OnScene';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl h-[92vh] sm:h-[86vh] max-h-[850px] rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden text-slate-900">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Truck className="w-5 h-5 text-blue-400" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Theo dõi lực lượng ứng cứu Realtime
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  GPS LIVE
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Mã sự cố: <span className="text-amber-400 font-bold">#INC-{incident.id.substring(0, 8).toUpperCase()}</span> · {incident.title || 'Sự cố khẩn cấp'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Map + Info Sidebar */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative">
          
          {/* Map View Area */}
          <div className="flex-1 relative h-full w-full min-h-[320px] bg-slate-100">
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

            {/* Floating Top Controls inside Map */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={fitRouteBounds}
                className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 border border-slate-200 text-xs font-mono font-bold shadow-md flex items-center gap-1.5 hover:text-blue-600 transition-all cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Xem toàn lộ trình</span>
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
                  className={`px-3 py-1.5 rounded-xl backdrop-blur-md text-xs font-mono font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer ${
                    isFollowingVehicle
                      ? 'bg-blue-600 text-white border border-blue-500'
                      : 'bg-white/95 hover:bg-white text-slate-800 border border-slate-200'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isFollowingVehicle ? 'Đang bám theo xe' : 'Bám theo xe'}</span>
                </button>
              )}
            </div>

            {/* Floating Live Telemetry Overlay over Map */}
            {trackingData && (
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 sm:max-w-md">
                <div className="p-3.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl text-white font-mono space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-slate-400">TRẠNG THÁI ỨNG CỨU:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isOnScene
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : isEnRoute
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {isOnScene
                        ? 'ĐÃ ĐẾN HIỆN TRƯỜNG'
                        : dispatchStatus === 'EnRoute'
                          ? 'ĐANG TRÊN ĐƯỜNG ĐẾN'
                          : dispatchStatus === 'Accepted'
                            ? 'ĐỘI ĐÃ XÁC NHẬN NHIỆM VỤ'
                            : 'ĐANG ĐIỀU ĐỘNG'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                    <div className="p-2 rounded-xl bg-slate-800/60">
                      <div className="text-[9px] text-slate-400 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>ETA DỰ KIẾN</span>
                      </div>
                      <div className="text-base font-extrabold text-amber-400 mt-0.5">
                        ~{trackingData.estimatedArrivalMinutes || 3}p
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-800/60">
                      <div className="text-[9px] text-slate-400 flex items-center justify-center gap-1">
                        <Navigation className="w-3 h-3 text-sky-400" />
                        <span>KHOẢNG CÁCH</span>
                      </div>
                      <div className="text-base font-extrabold text-white mt-0.5">
                        {trackingData.distanceKm ? trackingData.distanceKm.toFixed(1) : '1.2'} km
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-800/60">
                      <div className="text-[9px] text-slate-400 flex items-center justify-center gap-1">
                        <Gauge className="w-3 h-3 text-emerald-400" />
                        <span>TỐC ĐỘ XE</span>
                      </div>
                      <div className="text-base font-extrabold text-emerald-400 mt-0.5">
                        {liveVehicle?.speedKmh || 42} km/h
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Detail Panel */}
          <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto space-y-4">
            <div className="space-y-4 font-mono text-xs">
              
              {/* Unit Info Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    Phương Tiện Ứng Cứu
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Biển số xe:</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {trackingData?.plateNumber || '51A-114.99'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Chủng loại:</span>
                    <span className="font-bold text-slate-900">
                      {trackingData?.unitTypeName || 'Xe Chữa Cháy / Cứu Hộ'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Trực ban:</span>
                    <span className="font-bold text-slate-900 text-right max-w-[150px] truncate">
                      {trackingData?.stationName || 'Trạm Cứu Hộ CAD'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Destination Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></div>
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    Điểm Báo Cáo Sự Cố
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                  {incident.locationAddress || 'Vị trí hiện trường ghi nhận'}
                </p>
              </div>

              {/* Instruction banner */}
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 space-y-1.5 font-sans">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                  <span>Kênh điều phối 114 / 115 kết nối</span>
                </div>
                <p className="text-blue-700 leading-relaxed text-[11px]">
                  Lực lượng cứu hộ đang di chuyển theo chỉ dẫn giao thông khẩn cấp. Vui lòng giữ thông suốt số điện thoại đăng ký.
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-2">
              {trackingData?.stationPhoneNumber && (
                <a
                  href={`tel:${trackingData.stationPhoneNumber}`}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Gọi tổng đài trạm ({trackingData.stationPhoneNumber})</span>
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-mono font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
