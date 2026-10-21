import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Flame,
  Truck,
  ShieldCheck,
  Compass,
  Radio,
  Layers,
  Navigation,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_DARK_STYLE,
  MAPBOX_REALISTIC_STYLE,
} from '../../services/mapboxService';
import { incidentService, type CitizenTrackingDto } from '../../services/incidentService';
import type { IncidentResponseDto } from '../../types/incident';

interface HeroRadarMapProps {
  etaTime: number;
  formatEta: (seconds: number) => string;
  onOpenReports?: () => void;
}

export const HeroRadarMap: React.FC<HeroRadarMapProps> = ({
  etaTime,
  formatEta,
  onOpenReports,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const emsEtaElRef = useRef<HTMLSpanElement | null>(null);
  const [radarLayer, setRadarLayer] = useState<'satellite' | 'dark'>('satellite');

  // Citizen reported incident state
  const [reportedIncident, setReportedIncident] = useState<IncidentResponseDto | null>(null);
  const [trackingData, setTrackingData] = useState<CitizenTrackingDto | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Fetch citizen reported incident from storage & API
  const checkCitizenReportedIncident = useCallback(async () => {
    try {
      const storedIds: string[] = JSON.parse(localStorage.getItem('resq_my_reported_incident_ids') || '[]');
      if (storedIds.length > 0) {
        const res = await incidentService.getIncidents({ pageSize: 20 });
        const items = res.data?.items || [];
        const match = items.find((i) => storedIds.includes(i.id));
        if (match) {
          setReportedIncident(match);
          return;
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    checkCitizenReportedIncident();

    const handleIncidentUpdated = (e: any) => {
      if (e.detail) {
        setReportedIncident(e.detail);
      } else {
        checkCitizenReportedIncident();
      }
    };

    window.addEventListener('resq_incident_updated', handleIncidentUpdated);
    window.addEventListener('storage', checkCitizenReportedIncident);
    return () => {
      window.removeEventListener('resq_incident_updated', handleIncidentUpdated);
      window.removeEventListener('storage', checkCitizenReportedIncident);
    };
  }, [checkCitizenReportedIncident]);

  // Load tracking data if incident is dispatched or in progress
  useEffect(() => {
    if (!reportedIncident?.id) return;
    if (reportedIncident.status === 'Dispatched' || reportedIncident.status === 'InProgress') {
      incidentService
        .getTracking(reportedIncident.id)
        .then((res) => {
          if (res.data) setTrackingData(res.data);
        })
        .catch(() => {});
    } else {
      setTrackingData(null);
    }
  }, [reportedIncident?.id, reportedIncident?.status]);

  const handleSetRadarLayer = (nextMode: 'satellite' | 'dark') => {
    if (nextMode === radarLayer) return;
    setRadarLayer(nextMode);
    if (mapRef.current) {
      mapRef.current.setStyle(nextMode === 'satellite' ? MAPBOX_REALISTIC_STYLE : MAPBOX_DARK_STYLE);
    }
  };

  // Tactical Coordinates in SHTP - TP. Thủ Đức
  const INCIDENT_COORDS: [number, number] = [106.8035, 10.8405];
  const EMS_COORDS: [number, number] = [106.7925, 10.8345];
  const FIRE_COORDS: [number, number] = [106.8165, 10.8325];
  const PATROL_COORDS: [number, number] = [106.8010, 10.8465];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (MAPBOX_ACCESS_TOKEN) {
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_REALISTIC_STYLE,
      center: INCIDENT_COORDS,
      zoom: 14.5,
      attributionControl: false,
      scrollZoom: false,
      pitch: 25, // Subtle 2.5D tactical tilt
    });

    map.on('error', (e) => {
      console.warn('Hero radar mapbox notice:', e?.error?.message || e);
    });

    const addTacticalRoutes = () => {
      try {
        if (!map.getSource('tactical-routes')) {
          map.addSource('tactical-routes', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: { color: '#3B82F6' },
                  geometry: {
                    type: 'LineString',
                    coordinates: [EMS_COORDS, [106.798, 10.8375], INCIDENT_COORDS],
                  },
                },
                {
                  type: 'Feature',
                  properties: { color: '#DC2626' },
                  geometry: {
                    type: 'LineString',
                    coordinates: [FIRE_COORDS, [106.81, 10.8365], INCIDENT_COORDS],
                  },
                },
              ],
            },
          });

          map.addLayer({
            id: 'tactical-routes-line',
            type: 'line',
            source: 'tactical-routes',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 3,
              'line-dasharray': [2, 2],
              'line-opacity': 0.85,
            },
          });
        }
      } catch (err) {
        console.warn('Tactical routes notice:', err);
      }
    };

    map.on('load', () => {
      map.resize();
      addTacticalRoutes();
    });

    map.on('style.load', () => {
      addTacticalRoutes();
    });

    // 1. Incident Marker
    const incidentEl = document.createElement('div');
    incidentEl.className = 'cad-marker-incident cursor-pointer';
    incidentEl.innerHTML = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; width: 56px; height: 56px; border-radius: 50%; background: rgba(220, 38, 38, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <span style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(239, 68, 68, 0.35);"></span>
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #DC2626; border: 2.5px solid #FFFFFF; box-shadow: 0 0 16px rgba(220, 38, 38, 0.8); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
          </svg>
        </div>
      </div>
    `;
    new mapboxgl.Marker({ element: incidentEl }).setLngLat(INCIDENT_COORDS).addTo(map);

    // 2. EMS Ambulance Marker
    const emsEl = document.createElement('div');
    emsEl.className = 'cad-marker-ems cursor-pointer';
    emsEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="width: 30px; height: 30px; border-radius: 8px; background: #059669; border: 1.5px solid #34D399; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
            <path d="M15 18H9"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
            <circle cx="17" cy="18" r="2"/>
            <circle cx="7" cy="18" r="2"/>
          </svg>
        </div>
        <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(16, 185, 129, 0.5); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 10px; color: #6EE7B7; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
          EMS AM-02 <span class="ems-eta-span" style="color: #FFFFFF;">(${formatEta(etaTime)})</span>
        </div>
      </div>
    `;
    emsEtaElRef.current = emsEl.querySelector('.ems-eta-span');
    new mapboxgl.Marker({ element: emsEl }).setLngLat(EMS_COORDS).addTo(map);

    // 3. Fire Engine Marker
    const fireEl = document.createElement('div');
    fireEl.className = 'cad-marker-fire cursor-pointer';
    fireEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="width: 30px; height: 30px; border-radius: 8px; background: #DC2626; border: 1.5px solid #F87171; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
          </svg>
        </div>
        <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(239, 68, 68, 0.5); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 10px; color: #FCA5A5; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
          FIRE FE-01 <span style="color: #FFFFFF;">(1.4 km)</span>
        </div>
      </div>
    `;
    new mapboxgl.Marker({ element: fireEl }).setLngLat(FIRE_COORDS).addTo(map);

    // 4. Police Patrol Marker
    const patrolEl = document.createElement('div');
    patrolEl.className = 'cad-marker-patrol cursor-pointer';
    patrolEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 5px;">
        <div style="width: 26px; height: 26px; border-radius: 6px; background: #2563EB; border: 1.5px solid #60A5FA; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(59, 130, 246, 0.5); padding: 1.5px 5px; border-radius: 4px; font-family: monospace; font-size: 9px; color: #93C5FD; font-weight: 600; white-space: nowrap;">
          PATROL PC-03 ON SCENE
        </div>
      </div>
    `;
    new mapboxgl.Marker({ element: patrolEl }).setLngLat(PATROL_COORDS).addTo(map);

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
      emsEtaElRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Dynamically update ETA countdown text without resetting or re-rendering Mapbox
  useEffect(() => {
    if (emsEtaElRef.current) {
      emsEtaElRef.current.textContent = `(${formatEta(etaTime)})`;
    }
  }, [etaTime, formatEta]);

  // Update map marker if citizen reported incident has coords
  useEffect(() => {
    if (!mapRef.current || !reportedIncident?.latitude || !reportedIncident?.longitude) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const userEl = document.createElement('div');
    userEl.className = 'cad-marker-user-incident cursor-pointer';
    userEl.innerHTML = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; width: 64px; height: 64px; border-radius: 50%; background: rgba(220, 38, 38, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="width: 36px; height: 36px; border-radius: 50%; background: #DC2626; border: 2.5px solid #FFFFFF; box-shadow: 0 0 18px rgba(220, 38, 38, 0.85); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
      </div>
    `;

    userMarkerRef.current = new mapboxgl.Marker({ element: userEl })
      .setLngLat([reportedIncident.longitude, reportedIncident.latitude])
      .addTo(mapRef.current);

    mapRef.current.flyTo({
      center: [reportedIncident.longitude, reportedIncident.latitude],
      zoom: 15,
      essential: true,
      duration: 1500,
    });
  }, [reportedIncident?.latitude, reportedIncident?.longitude]);

  return (
    <div className="relative flex-1 min-h-[160px] rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
      {/* Real Interactive Mapbox Dark Canvas */}
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

      {/* Floating AI Hazard Classification Badge */}
      <div className="absolute top-2.5 left-2.5 z-30 animate-float-slow pointer-events-auto">
        {reportedIncident ? (
          <div
            onClick={onOpenReports}
            className="bg-white/95 backdrop-blur-md border border-slate-200 hover:border-red-400 rounded-xl p-2.5 sm:p-3 shadow-xl max-w-[220px] sm:max-w-[270px] text-left cursor-pointer transition-all hover:scale-[1.02]"
            title="Bấm để mở lịch sử sự cố và theo dõi xe cứu hộ"
          >
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span className="text-[10px] sm:text-[11px] font-mono-data font-bold text-red-600 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    reportedIncident.status === 'Dispatched' || reportedIncident.status === 'InProgress'
                      ? 'bg-emerald-500 animate-ping'
                      : reportedIncident.status === 'Cancelled'
                      ? 'bg-slate-400'
                      : 'bg-red-600 animate-pulse'
                  }`}
                />
                <span className="truncate">SỰ CỐ CỦA BẠN #{reportedIncident.id.slice(0, 6).toUpperCase()}</span>
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
                {reportedIncident.status === 'Dispatched'
                  ? 'XE ĐANG ĐẾN'
                  : reportedIncident.status === 'InProgress'
                  ? 'ĐANG CỨU HỘ'
                  : reportedIncident.status === 'Verified'
                  ? 'ĐÃ DUYỆT'
                  : reportedIncident.status === 'Cancelled'
                  ? 'ĐÃ HỦY'
                  : 'CHỜ TIẾP NHẬN'}
              </span>
            </div>

            <p className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight truncate">
              {reportedIncident.title}
            </p>

            <p className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
              📍 {reportedIncident.locationAddress}
            </p>

            {/* Tracking live info if dispatched */}
            {(reportedIncident.status === 'Dispatched' || reportedIncident.status === 'InProgress') && trackingData && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-700">
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
              <span>Bấm để theo dõi xe &amp; chi tiết</span>
              <ChevronRight className="w-3 h-3 text-red-600" />
            </div>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-xl max-w-[200px] sm:max-w-[240px] text-left">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-[10px] sm:text-[11px] font-mono-data font-bold text-red-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                AI INCIDENT #8942
              </span>
              <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] sm:text-[10px] font-extrabold font-mono-data">
                CẤP 3 / 3
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-800 leading-tight truncate">
              Cháy Lớn Kho Xưởng &amp; Nguy Cơ Cháy Lan
            </p>
            <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[10px] font-mono-data text-slate-500">
              <span>Thẻ: <strong className="text-red-600">#Fire</strong></span>
              <span className="text-red-600 font-bold">98.4% tin cậy</span>
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
            title="Chế độ ảnh vệ tinh thực tế"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>VỆ TINH</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetRadarLayer('dark')}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              radarLayer === 'dark'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Chế độ CAD tác chiến ban đêm"
          >
            <span>CAD TỐI</span>
          </button>
        </div>
      </div>

      {/* Floating GPS Telemetry Pill */}
      <div className="absolute bottom-2.5 right-2.5 z-30 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 px-2 py-1 sm:px-3 sm:py-1 rounded-lg text-[9px] sm:text-[11px] font-mono-data text-slate-700 flex items-center gap-1.5 shadow-md">
          <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600 animate-spin" />
          <span>10.8405° N, 106.8035° E</span>
        </div>
      </div>
    </div>
  );
};
