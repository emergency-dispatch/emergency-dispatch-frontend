import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Compass,
  ExternalLink,
  Layers,
  LocateFixed,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Navigation,
  Radio,
  Flame,
  ShieldAlert,
  Gauge,
  Clock,
} from 'lucide-react';
import type { StaffMission, TurnByTurnStep } from '../../types/staff';
import {
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_REALISTIC_STYLE,
  MAPBOX_DARK_STYLE,
  MAPBOX_STREETS_STYLE,
} from '../../services/mapboxService';

interface StaffNavigationMapProps {
  mission: StaffMission;
  currentStepIndex: number;
  onSelectStep?: (index: number) => void;
}

type MapLayerMode = 'satellite' | 'dark' | 'streets';

// Tính góc phương vị (bearing/heading) giữa 2 tọa độ GPS [lng, lat]
const calculateHeading = (from: [number, number], to: [number, number]): number => {
  const [lon1, lat1] = from.map((deg) => (deg * Math.PI) / 180);
  const [lon2, lat2] = to.map((deg) => (deg * Math.PI) / 180);
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  const heading = (Math.atan2(y, x) * 180) / Math.PI;
  return (heading + 360) % 360;
};

export const StaffNavigationMap: React.FC<StaffNavigationMapProps> = ({
  mission,
  currentStepIndex,
  onSelectStep,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const [layerMode, setLayerMode] = useState<MapLayerMode>('satellite');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  // Markers refs for update without full recreate
  const vehicleMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const incidentMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const stepMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const prevStepIndexRef = useRef<number>(currentStepIndex);

  // Chuyển đổi polyline [lat, lng] sang [lng, lat] cho Mapbox GeoJSON
  const routeCoordsLngLat: [number, number][] = React.useMemo(() => {
    if (mission.routePolyline && mission.routePolyline.length > 0) {
      return mission.routePolyline.map(([lat, lng]) => [lng, lat]);
    }
    if (mission.routeSteps && mission.routeSteps.length > 0) {
      return mission.routeSteps.map((s) => [s.lng, s.lat]);
    }
    return [
      [mission.vehicleLng, mission.vehicleLat],
      [mission.incidentLng, mission.incidentLat],
    ];
  }, [mission.routePolyline, mission.routeSteps, mission.vehicleLat, mission.vehicleLng, mission.incidentLat, mission.incidentLng]);

  // Style selector
  const getStyleForMode = (mode: MapLayerMode) => {
    switch (mode) {
      case 'dark':
        return MAPBOX_DARK_STYLE;
      case 'streets':
        return MAPBOX_STREETS_STYLE;
      case 'satellite':
      default:
        return MAPBOX_REALISTIC_STYLE;
    }
  };

  // Helper để thêm/cập nhật GeoJSON route lines an toàn
  const setupRouteLayers = useCallback((map: mapboxgl.Map, coords: [number, number][]) => {
    const addOrUpdate = () => {
      try {
        const geojsonData: GeoJSON.Feature<GeoJSON.LineString> = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        };

        if (!map.getSource('mission-route-source')) {
          map.addSource('mission-route-source', {
            type: 'geojson',
            data: geojsonData,
          });

          // 1. Lớp viền phát sáng (Glow aura underlay)
          map.addLayer({
            id: 'mission-route-glow',
            type: 'line',
            source: 'mission-route-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#EF4444',
              'line-width': 10,
              'line-opacity': 0.45,
              'line-blur': 3.5,
            },
          });

          // 2. Tuyến đường điều hướng chính sắc nét
          map.addLayer({
            id: 'mission-route-line',
            type: 'line',
            source: 'mission-route-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#DC2626',
              'line-width': 4.5,
              'line-opacity': 0.95,
            },
          });
        } else {
          const src = map.getSource('mission-route-source') as mapboxgl.GeoJSONSource;
          src.setData(geojsonData);
        }
      } catch (err) {
        console.warn('Mapbox route layers setup warning:', err);
      }
    };

    if (map.isStyleLoaded()) {
      addOrUpdate();
    } else {
      map.once('style.load', addOrUpdate);
    }
  }, []);

  // 1. Khởi tạo Mapbox Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (MAPBOX_ACCESS_TOKEN) {
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    }

    const initialCenter: [number, number] = [
      (mission.vehicleLng + mission.incidentLng) / 2,
      (mission.vehicleLat + mission.incidentLat) / 2,
    ];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: getStyleForMode(layerMode),
      center: initialCenter,
      zoom: 14.8,
      pitch: is3DMode ? 45 : 0,
      bearing: 15,
      attributionControl: false,
    });

    map.on('error', (e) => {
      console.warn('Staff Mapbox Notice:', e?.error?.message || e);
    });

    map.on('load', () => {
      setMapLoaded(true);
      map.resize();
      setupRouteLayers(map, routeCoordsLngLat);

      // Fit bounds bao quát xe và địa điểm sự cố với padding thoáng
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([mission.vehicleLng, mission.vehicleLat]);
      bounds.extend([mission.incidentLng, mission.incidentLat]);
      routeCoordsLngLat.forEach((c) => bounds.extend(c));

      map.fitBounds(bounds, {
        padding: { top: 70, bottom: 85, left: 60, right: 60 },
        maxZoom: 16.5,
        duration: 800,
      });
    });

    map.on('style.load', () => {
      setupRouteLayers(map, routeCoordsLngLat);
    });

    mapRef.current = map;

    // Resize observer theo dõi khi co giãn sidebar hoặc fullscreen
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      ro = new ResizeObserver(() => {
        map.resize();
      });
      ro.observe(mapContainerRef.current);
    }

    const t1 = setTimeout(() => map.resize(), 150);
    const t2 = setTimeout(() => map.resize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
      // Dọn dẹp markers
      if (vehicleMarkerRef.current) vehicleMarkerRef.current.remove();
      if (incidentMarkerRef.current) incidentMarkerRef.current.remove();
      stepMarkersRef.current.forEach((m) => m.remove());
      stepMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []); // Mount 1 lần

  // 2. Chuyển đổi Style lớp bản đồ khi user chọn mode khác
  const handleSwitchLayer = (newMode: MapLayerMode) => {
    if (!mapRef.current) return;
    setLayerMode(newMode);
    mapRef.current.setStyle(getStyleForMode(newMode));
  };

  // 3. Đổi góc nghiêng 2D / 3D
  const handleToggle3D = () => {
    if (!mapRef.current) return;
    const nextState = !is3DMode;
    setIs3DMode(nextState);
    mapRef.current.easeTo({
      pitch: nextState ? 45 : 0,
      bearing: nextState ? 20 : 0,
      duration: 700,
    });
  };

  // 4. Zoom Controls
  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn({ duration: 300 });
  };
  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut({ duration: 300 });
  };

  // 5. Định vị lại trung tâm xe
  const handleRecenterVehicle = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [mission.vehicleLng, mission.vehicleLat],
      zoom: 16.5,
      pitch: is3DMode ? 45 : 0,
      duration: 800,
      essential: true,
    });
  };

  // 6. Cập nhật hoặc tạo Vehicle Marker (Ưu tiên z-index cao nhất: 100)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Tính hướng đầu xe theo chặng hiện tại
    const currentStep = mission.routeSteps?.[currentStepIndex];
    const nextStep = mission.routeSteps?.[currentStepIndex + 1];
    let heading = 45;
    if (currentStep && nextStep) {
      heading = calculateHeading([currentStep.lng, currentStep.lat], [nextStep.lng, nextStep.lat]);
    }

    if (!vehicleMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'cursor-pointer select-none';
      el.style.zIndex = '100';
      el.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: auto;">
          <div style="position: absolute; width: 50px; height: 50px; border-radius: 9999px; background: rgba(220, 38, 38, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          
          <div style="width: 40px; height: 40px; border-radius: 9999px; background: #DC2626; border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.7); transform: rotate(${heading}deg); transition: transform 0.4s ease;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>

          <div style="margin-top: 4px; white-space: nowrap; background: #0F172A; color: #FFFFFF; border: 1.5px solid #EF4444; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 11px; font-weight: 800; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 5px;">
            <span style="width: 7px; height: 7px; border-radius: 9999px; background: #22C55E; box-shadow: 0 0 8px #22C55E;"></span>
            <span>${mission.vehiclePlate}</span>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-1 font-mono text-xs">
          <div class="font-bold text-red-600 text-sm flex items-center gap-1.5">
            <span>${mission.vehiclePlate}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-bold">KÍP XE CNCH</span>
          </div>
          <div class="text-slate-700 mt-1 font-sans font-medium">Vị trí hiện tại kíp xe đang tác chiến</div>
          <div class="text-slate-500 mt-0.5 text-[11px] font-mono">${mission.vehicleLat.toFixed(4)}, ${mission.vehicleLng.toFixed(4)}</div>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([mission.vehicleLng, mission.vehicleLat])
        .setPopup(popup)
        .addTo(map);

      vehicleMarkerRef.current = marker;
    } else {
      vehicleMarkerRef.current.setLngLat([mission.vehicleLng, mission.vehicleLat]);

      // Xoay mũi tên xe theo heading mới
      const arrowIcon = vehicleMarkerRef.current.getElement().querySelector('div > div:nth-child(2)') as HTMLElement;
      if (arrowIcon) {
        arrowIcon.style.transform = `rotate(${heading}deg)`;
      }
    }
  }, [mission.vehicleLat, mission.vehicleLng, mission.vehiclePlate, currentStepIndex, mission.routeSteps]);

  // 7. Cập nhật hoặc tạo Incident Target Marker (z-index: 90)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!incidentMarkerRef.current) {
      const color = mission.severity >= 3 ? '#DC2626' : mission.severity === 2 ? '#EA580C' : '#CA8A04';
      const el = document.createElement('div');
      el.className = 'cursor-pointer select-none';
      el.style.zIndex = '90';
      el.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: auto;">
          <div style="position: absolute; width: 54px; height: 54px; border-radius: 9999px; background: ${color}50; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          
          <div style="width: 42px; height: 42px; border-radius: 12px; background: ${color}; border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px ${color}90; color: white;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
          </div>

          <div style="margin-top: 4px; white-space: nowrap; background: #0F172A; color: #FCA5A5; border: 1.5px solid ${color}; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 11px; font-weight: 800; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
            MỤC TIÊU CỨU NẠN
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-1 font-mono text-xs max-w-xs">
          <div class="font-bold text-red-600 text-sm flex items-center gap-1.5">
            <span class="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-bold">CẤP ${mission.severity}</span>
            <span>${mission.title}</span>
          </div>
          <div class="text-slate-800 mt-1 font-sans text-xs font-semibold">${mission.address}</div>
          <div class="text-slate-500 mt-1 text-[11px]">Người báo: <strong>${mission.callerName}</strong> (${mission.callerPhone})</div>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([mission.incidentLng, mission.incidentLat])
        .setPopup(popup)
        .addTo(map);

      incidentMarkerRef.current = marker;
    } else {
      incidentMarkerRef.current.setLngLat([mission.incidentLng, mission.incidentLat]);
    }
  }, [mission.incidentLat, mission.incidentLng, mission.severity, mission.title, mission.address, mission.callerName, mission.callerPhone]);

  // 8. Cập nhật các Waypoint Turn-by-Turn Markers (Chỉ hiển thị các chặng trung gian chưa bị xe/mục tiêu đè)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    stepMarkersRef.current.forEach((m) => m.remove());
    stepMarkersRef.current = [];

    if (!mission.routeSteps || mission.routeSteps.length === 0) return;

    mission.routeSteps.forEach((step, idx) => {
      // Nếu là vị trí xe hiện tại hoặc đích cuối cùng, xe và mục tiêu đã hiển thị rõ
      const isVehiclePos = idx === currentStepIndex;
      const isLastStep = idx === mission.routeSteps.length - 1;

      // Vẫn hiển thị badge nhưng nếu trùng xe thì hạ zIndex xuống dưới xe
      const el = document.createElement('div');
      el.className = 'cursor-pointer select-none';
      el.style.zIndex = isVehiclePos ? '40' : isLastStep ? '40' : '50';
      el.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
          <div style="width: ${isVehiclePos ? '28px' : '22px'}; height: ${isVehiclePos ? '28px' : '22px'}; border-radius: 9999px; background: ${isVehiclePos ? '#DC2626' : '#334155'}; border: 2px solid #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: ${isVehiclePos ? '12px' : '10px'}; font-weight: 800; color: #FFFFFF; font-family: monospace; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
            ${idx + 1}
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(`
        <div class="p-1 font-mono text-xs">
          <div class="font-bold text-slate-900 flex items-center gap-1.5">
            <span class="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">CHẶNG ${idx + 1}</span>
            <span>${step.roadName}</span>
          </div>
          <div class="text-slate-600 mt-1 font-sans text-xs">${step.instruction}</div>
          <div class="text-slate-500 mt-1 text-[11px] font-mono">${step.distanceMeters}m • ~${step.durationSeconds}s</div>
        </div>
      `);

      el.addEventListener('click', () => {
        onSelectStep?.(idx);
        map.flyTo({
          center: [step.lng, step.lat],
          zoom: 16.5,
          duration: 600,
        });
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([step.lng, step.lat])
        .setPopup(popup)
        .addTo(map);

      stepMarkersRef.current.push(marker);
    });
  }, [mission.routeSteps, currentStepIndex, onSelectStep]);

  // 9. Camera Follow: Khi user đổi step index trong TurnByTurn HUD, bay nhẹ tới waypoint đó
  useEffect(() => {
    if (prevStepIndexRef.current === currentStepIndex) return;
    prevStepIndexRef.current = currentStepIndex;

    const map = mapRef.current;
    if (!map) return;

    const step = mission.routeSteps?.[currentStepIndex];
    if (step) {
      map.flyTo({
        center: [step.lng, step.lat],
        zoom: 16.2,
        pitch: is3DMode ? 45 : 0,
        duration: 800,
      });
    }
  }, [currentStepIndex, mission.routeSteps, is3DMode]);

  // Cập nhật lại đường polyline khi coords thay đổi
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      setupRouteLayers(mapRef.current, routeCoordsLngLat);
    }
  }, [routeCoordsLngLat, mapLoaded, setupRouteLayers]);

  // Mở Google Maps điều hướng ngoài
  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${mission.vehicleLat},${mission.vehicleLng}&destination=${mission.incidentLat},${mission.incidentLng}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Tính tổng quãng đường còn lại từ step hiện tại
  const remainingMeters = React.useMemo(() => {
    if (!mission.routeSteps) return 1400;
    return mission.routeSteps
      .slice(currentStepIndex)
      .reduce((sum, s) => sum + s.distanceMeters, 0);
  }, [mission.routeSteps, currentStepIndex]);

  const remainingSeconds = React.useMemo(() => {
    if (!mission.routeSteps) return 240;
    return mission.routeSteps
      .slice(currentStepIndex)
      .reduce((sum, s) => sum + s.durationSeconds, 0);
  }, [mission.routeSteps, currentStepIndex]);

  return (
    <div
      className={`relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950 transition-all ${
        isFullscreen ? 'fixed inset-0 z-[9999] rounded-none border-none' : ''
      }`}
    >
      {/* Mapbox Canvas */}
      <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Tactical Layer & Camera Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {/* Recenter to Vehicle */}
        <button
          type="button"
          onClick={handleRecenterVehicle}
          className="p-2.5 rounded-xl bg-white/95 hover:bg-white border border-slate-200 text-red-600 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="Định vị tâm xe (Recenter)"
        >
          <LocateFixed className="w-5 h-5" />
        </button>

        {/* 2D / 3D Tactical Tilt Switch */}
        <button
          type="button"
          onClick={handleToggle3D}
          className={`p-2.5 rounded-xl border shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center font-mono font-bold text-xs ${
            is3DMode
              ? 'bg-red-600 text-white border-red-600 shadow-red-500/20'
              : 'bg-white/95 hover:bg-white text-slate-700 border-slate-200'
          }`}
          title={is3DMode ? 'Chuyển về 2D phẳng' : 'Bật góc nghiêng 3D tác chiến'}
        >
          <Compass className={`w-5 h-5 ${is3DMode ? 'rotate-45 text-white' : ''}`} />
        </button>

        {/* Layer Mode Toggle (Satellite / Dark CAD / Streets) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            className={`p-2.5 rounded-xl border shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
              isLayerMenuOpen
                ? 'bg-red-600 text-white border-red-600 shadow-red-500/20'
                : 'bg-white/95 hover:bg-white border-slate-200 text-slate-700'
            }`}
            title="Đổi lớp bản đồ (Bấm để chọn)"
          >
            <Layers className="w-5 h-5" />
          </button>

          {/* Layer Flyout Menu on Click */}
          {isLayerMenuOpen && (
            <div className="absolute right-0 top-0 mt-12 w-48 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 z-30 animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  handleSwitchLayer('dark');
                  setIsLayerMenuOpen(false);
                }}
                className={`w-full px-2.5 py-2 rounded-lg text-left text-xs font-mono font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  layerMode === 'dark'
                    ? 'bg-red-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>🌙 CAD Tác chiến đêm</span>
                {layerMode === 'dark' && <span className="w-2 h-2 rounded-full bg-white shadow-sm" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSwitchLayer('satellite');
                  setIsLayerMenuOpen(false);
                }}
                className={`w-full px-2.5 py-2 rounded-lg text-left text-xs font-mono font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  layerMode === 'satellite'
                    ? 'bg-red-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>🛰️ Vệ tinh thực tế</span>
                {layerMode === 'satellite' && <span className="w-2 h-2 rounded-full bg-white shadow-sm" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSwitchLayer('streets');
                  setIsLayerMenuOpen(false);
                }}
                className={`w-full px-2.5 py-2 rounded-lg text-left text-xs font-mono font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  layerMode === 'streets'
                    ? 'bg-red-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>🗺️ Bản đồ đường bộ</span>
                {layerMode === 'streets' && <span className="w-2 h-2 rounded-full bg-white shadow-sm" />}
              </button>
            </div>
          )}
        </div>

        {/* Zoom In / Zoom Out */}
        <div className="flex flex-col rounded-xl overflow-hidden border border-slate-200 bg-white/95 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 text-slate-700 hover:bg-slate-100 transition-all border-b border-slate-100 active:scale-95 cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 text-slate-700 hover:bg-slate-100 transition-all active:scale-95 cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={() => {
            setIsFullscreen(!isFullscreen);
            setTimeout(() => mapRef.current?.resize(), 100);
          }}
          className="p-2.5 rounded-xl bg-white/95 hover:bg-white border border-slate-200 text-slate-700 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title={isFullscreen ? 'Thu nhỏ bản đồ' : 'Toàn màn hình'}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        {/* External Google Maps Navigation Link */}
        <button
          type="button"
          onClick={openGoogleMaps}
          className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 border border-red-600 text-white shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="Mở chỉ đường Google Maps ngoài"
        >
          <ExternalLink className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Top Header: Telemetry Card + Direct Map Style Switcher Pills */}
      <div className="absolute top-4 left-4 right-16 sm:right-auto z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-white shadow-xl pointer-events-auto flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400 leading-none">HỆ THỐNG ĐIỀU HƯỚNG TÁC CHIẾN</div>
            <div className="text-xs font-mono font-bold text-red-400 mt-0.5 flex items-center gap-2">
              <span>{mission.vehiclePlate}</span>
              <span className="text-slate-500">•</span>
              <span className="text-white">#{mission.incidentId}</span>
            </div>
          </div>
        </div>

        {/* Quick Map Style Switcher Pills (Direct 1-Click UI Change) */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-xl pointer-events-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSwitchLayer('satellite')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              layerMode === 'satellite'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Đổi sang ảnh vệ tinh thực tế"
          >
            <span>VỆ TINH</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchLayer('dark')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              layerMode === 'dark'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Đổi sang giao diện CAD tác chiến ban đêm"
          >
            <span>CAD TỐI</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchLayer('streets')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              layerMode === 'streets'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Đổi sang bản đồ đường bộ giao thông"
          >
            <span>ĐƯỜNG PHỐ</span>
          </button>
        </div>
      </div>

      {/* Floating Bottom HUD Status Pill */}
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        {/* GPS Coordinates & Satellite Lock */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-xs font-mono text-slate-200 shadow-xl pointer-events-auto">
          <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
          <span className="text-slate-400">GPS:</span>
          <span className="font-bold text-white">
            {mission.vehicleLat.toFixed(4)}° N, {mission.vehicleLng.toFixed(4)}° E
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-emerald-400 font-bold">12 VỆ TINH KHÓA</span>
        </div>

        {/* Distance & ETA remaining pill */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600/95 border border-red-500 text-white backdrop-blur-md text-xs font-mono font-bold shadow-xl shadow-red-600/25 pointer-events-auto">
          <Clock className="w-3.5 h-3.5 text-red-100 shrink-0" />
          <span>CÒN LẠI:</span>
          <span>{remainingMeters > 1000 ? `${(remainingMeters / 1000).toFixed(1)} km` : `${remainingMeters} m`}</span>
          <span>•</span>
          <span>~{Math.ceil(remainingSeconds / 60)} PHÚT</span>
        </div>
      </div>
    </div>
  );
};
