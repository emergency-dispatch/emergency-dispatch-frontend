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
  Car,
  Shield,
  AlertTriangle,
  Route,
} from 'lucide-react';
import type { StaffMission, TurnByTurnStep } from '../../types/staff';
import type { ActiveTrafficTask } from './StaffTrafficTaskCard';
import type { ServiceAreaDto } from '../../services/liveMapService';
import type { SeverityLevel } from '../../types/incident';
import { circlePolygon } from '../operator/livemap/MapServiceAreaLayer';
import {
  glowIncidentMarkerHtml,
  vehicle3dMarkerHtml,
  glowTrafficJamMarkerHtml,
} from '../operator/livemap/glowMarkers';
import {
  getDistanceFromLatLonInKm,
  formatShortId,
  resolveIncidentCategory,
  resolveDispatchVehicleType,
  resolveDispatchVehicleStatus,
} from '../../pages/staff/utils/staffMissionUtils';
import {
  MAPBOX_ACCESS_TOKEN,
  createStaffBaseMapStyle,
  applyStaffMapLayerMode,
} from '../../services/mapboxService';

interface StaffNavigationMapProps {
  mission: StaffMission;
  currentStepIndex: number;
  onSelectStep?: (index: number) => void;
  activeTrafficTask?: ActiveTrafficTask | null;
  onResolveTrafficTask?: (hotspotId: string, note?: string) => Promise<boolean>;
  serviceArea?: ServiceAreaDto | null;
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
  activeTrafficTask,
  onResolveTrafficTask,
  serviceArea,
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
  const trafficMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const stepMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const prevStepIndexRef = useRef<number>(currentStepIndex);
  const mapOuterContainerRef = useRef<HTMLDivElement>(null);

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

  const routeCoordsRef = useRef<[number, number][]>(routeCoordsLngLat);
  routeCoordsRef.current = routeCoordsLngLat;
  const serviceAreaRef = useRef<ServiceAreaDto | null | undefined>(serviceArea);
  serviceAreaRef.current = serviceArea;

  // Helper để thêm/cập nhật GeoJSON route lines an toàn
  const setupRouteLayers = useCallback((map: mapboxgl.Map, coords: [number, number][]) => {
    if (!map || !coords || coords.length === 0) return;

    const addOrUpdate = () => {
      try {
        const geojsonData = {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: coords,
          },
        };

        if (!map.getSource('mission-route-source')) {
          map.addSource('mission-route-source', {
            type: 'geojson',
            data: geojsonData,
          });

          // 1. Lớp viền phát sáng (Glow aura underlay)
          if (!map.getLayer('mission-route-glow')) {
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
          }

          // 2. Tuyến đường điều hướng chính sắc nét
          if (!map.getLayer('mission-route-line')) {
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
          }
        } else {
          const src = map.getSource('mission-route-source') as mapboxgl.GeoJSONSource;
          src.setData(geojsonData);

          if (!map.getLayer('mission-route-glow')) {
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
          }

          if (!map.getLayer('mission-route-line')) {
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
          }
        }
      } catch (err) {
        console.warn('Mapbox route layers setup warning:', err);
      }
    };

    if (map.isStyleLoaded()) {
      addOrUpdate();
    } else {
      map.once('idle', addOrUpdate);
    }
  }, []);

  // Helper để thêm/cập nhật GeoJSON Ranh giới phục vụ của Trạm (Service Area Geofence Boundary)
  const setupServiceAreaLayer = useCallback((map: mapboxgl.Map, area: ServiceAreaDto | null | undefined) => {
    const SOURCE_ID = 'staff-service-area-source';
    const FILL_ID = 'staff-service-area-fill';
    const LINE_ID = 'staff-service-area-line';

    const addOrUpdate = () => {
      try {
        const featureCollection = {
          type: 'FeatureCollection' as const,
          features:
            area && area.enabled && area.radiusKm > 0
              ? [
                  {
                    type: 'Feature' as const,
                    properties: { name: area.name ?? 'Ranh giới phục vụ trạm' },
                    geometry: {
                      type: 'Polygon' as const,
                      coordinates: [circlePolygon(area.centerLat, area.centerLng, area.radiusKm)],
                    },
                  },
                ]
              : [],
        };

        if (!map.getSource(SOURCE_ID)) {
          map.addSource(SOURCE_ID, {
            type: 'geojson',
            data: featureCollection,
          });

          // Lớp nền phủ mờ ranh giới trạm (0.08)
          if (!map.getLayer(FILL_ID)) {
            map.addLayer(
              {
                id: FILL_ID,
                type: 'fill',
                source: SOURCE_ID,
                paint: {
                  'fill-color': '#2563EB',
                  'fill-opacity': 0.08,
                },
              },
              map.getLayer('mission-route-glow') ? 'mission-route-glow' : undefined
            );
          }

          // Lớp đường viền nét đứt ranh giới trạm
          if (!map.getLayer(LINE_ID)) {
            map.addLayer(
              {
                id: LINE_ID,
                type: 'line',
                source: SOURCE_ID,
                paint: {
                  'line-color': '#3B82F6',
                  'line-width': 2.2,
                  'line-opacity': 0.85,
                  'line-dasharray': [3, 2],
                },
              },
              map.getLayer('mission-route-glow') ? 'mission-route-glow' : undefined
            );
          }
        } else {
          const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
          src.setData(featureCollection);

          if (!map.getLayer(FILL_ID)) {
            map.addLayer(
              {
                id: FILL_ID,
                type: 'fill',
                source: SOURCE_ID,
                paint: {
                  'fill-color': '#2563EB',
                  'fill-opacity': 0.08,
                },
              },
              map.getLayer('mission-route-glow') ? 'mission-route-glow' : undefined
            );
          }

          if (!map.getLayer(LINE_ID)) {
            map.addLayer(
              {
                id: LINE_ID,
                type: 'line',
                source: SOURCE_ID,
                paint: {
                  'line-color': '#3B82F6',
                  'line-width': 2.2,
                  'line-opacity': 0.85,
                  'line-dasharray': [3, 2],
                },
              },
              map.getLayer('mission-route-glow') ? 'mission-route-glow' : undefined
            );
          }
        }
      } catch (err) {
        console.warn('Staff Mapbox service area layer warning:', err);
      }
    };

    if (map.isStyleLoaded()) {
      addOrUpdate();
    } else {
      map.once('idle', addOrUpdate);
    }
  }, []);

  // Đồng bộ hoặc tạo mới Vehicle Marker (3D vehicle icon như Operator Live Map)
  const syncVehicleMarker = useCallback(
    (targetMap: mapboxgl.Map) => {
      if (!targetMap) return;

      // Tính hướng đầu xe theo chặng hiện tại
      const currentStep = mission.routeSteps?.[currentStepIndex];
      const nextStep = mission.routeSteps?.[currentStepIndex + 1];
      let heading = 45;
      if (currentStep && nextStep) {
        heading = calculateHeading([currentStep.lng, currentStep.lat], [nextStep.lng, nextStep.lat]);
      }

      const vType = resolveDispatchVehicleType(mission.vehicleType);
      const vStatus = resolveDispatchVehicleStatus(mission.status);

      const isAttached = vehicleMarkerRef.current && vehicleMarkerRef.current.getElement()?.parentNode;

      if (!vehicleMarkerRef.current || !isAttached) {
        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.remove();
          vehicleMarkerRef.current = null;
        }

        const el = document.createElement('div');
        el.className = 'cursor-pointer select-none';
        el.style.zIndex = '10';
        el.innerHTML = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: auto;">
            <div class="staff-vehicle-3d-wrapper" style="transform: rotate(${heading}deg); transition: transform 0.4s ease;">
              ${vehicle3dMarkerHtml(vType, vStatus, true)}
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
            <div class="text-slate-500 mt-0.5 text-[11px] font-sans">${mission.area || 'Khu vực quản lý'}</div>
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([mission.vehicleLng, mission.vehicleLat])
          .setPopup(popup)
          .addTo(targetMap);

        vehicleMarkerRef.current = marker;
      } else {
        vehicleMarkerRef.current.setLngLat([mission.vehicleLng, mission.vehicleLat]);

        // Xoay hình xe 3D theo heading mới
        const arrowIcon = vehicleMarkerRef.current.getElement().querySelector('.staff-vehicle-3d-wrapper') as HTMLElement;
        if (arrowIcon) {
          arrowIcon.style.transform = `rotate(${heading}deg)`;
        }
      }
    },
    [
      mission.vehicleLat,
      mission.vehicleLng,
      mission.vehiclePlate,
      mission.vehicleType,
      mission.status,
      currentStepIndex,
      mission.routeSteps,
    ]
  );

  // Đồng bộ hoặc tạo mới Incident Target Marker (Quầng sáng như Operator)
  const syncIncidentMarker = useCallback(
    (targetMap: mapboxgl.Map) => {
      if (!targetMap) return;

      const isAttached = incidentMarkerRef.current && incidentMarkerRef.current.getElement()?.parentNode;

      if (!incidentMarkerRef.current || !isAttached) {
        if (incidentMarkerRef.current) {
          incidentMarkerRef.current.remove();
          incidentMarkerRef.current = null;
        }

        const cat = resolveIncidentCategory(mission.title, mission.description, mission.hazardTags as string[]);
        const sev = (mission.severity === 3 ? 3 : mission.severity === 2 ? 2 : 1) as SeverityLevel;
        const color = mission.severity >= 3 ? '#DC2626' : mission.severity === 2 ? '#EA580C' : '#CA8A04';
        const el = document.createElement('div');
        el.className = 'cursor-pointer select-none';
        el.style.zIndex = '8';
        el.innerHTML = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: auto;">
            ${glowIncidentMarkerHtml(cat, sev, true)}

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
          .addTo(targetMap);

        incidentMarkerRef.current = marker;
      } else {
        incidentMarkerRef.current.setLngLat([mission.incidentLng, mission.incidentLat]);
      }
    },
    [
      mission.incidentLat,
      mission.incidentLng,
      mission.title,
      mission.description,
      mission.hazardTags,
      mission.severity,
      mission.address,
      mission.callerName,
      mission.callerPhone,
    ]
  );

  // Đồng bộ hoặc tạo mới Traffic Marker
  const syncTrafficMarker = useCallback(
    (targetMap: mapboxgl.Map) => {
      if (!targetMap) return;

      if (!activeTrafficTask) {
        if (trafficMarkerRef.current) {
          trafficMarkerRef.current.remove();
          trafficMarkerRef.current = null;
        }
        return;
      }

      const { latitude, longitude, title, locationAddress, congestionLevelName, congestionLevel, taskNotes } =
        activeTrafficTask;
      if (!latitude || !longitude) return;

      const isSevere =
        congestionLevel === 'Blocked' ||
        congestionLevel === 'Severe' ||
        congestionLevelName === 'Blocked' ||
        congestionLevelName === 'Severe';
      const color = isSevere ? '#DC2626' : '#EA580C';
      const badgeText = isSevere ? 'TẮC NGHẼN NẶNG' : 'ÙN TẮC GIAO THÔNG';

      const isAttached = trafficMarkerRef.current && trafficMarkerRef.current.getElement()?.parentNode;

      if (!trafficMarkerRef.current || !isAttached) {
        if (trafficMarkerRef.current) {
          trafficMarkerRef.current.remove();
          trafficMarkerRef.current = null;
        }

        const el = document.createElement('div');
        el.className = 'cursor-pointer select-none';
        el.style.zIndex = '7';
        el.innerHTML = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: auto;">
            ${glowTrafficJamMarkerHtml('active', false)}

            <div style="margin-top: 4px; white-space: nowrap; background: #0F172A; color: #FDBA74; border: 1.5px solid ${color}; padding: 2px 7px; border-radius: 6px; font-family: monospace; font-size: 10px; font-weight: 800; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 4px;">
              <span style="width: 6px; height: 6px; border-radius: 9999px; background: ${color}; box-shadow: 0 0 6px ${color};"></span>
              <span>${badgeText}</span>
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25, closeButton: true }).setHTML(`
          <div class="p-1 font-mono text-xs max-w-xs">
            <div class="font-bold text-amber-600 text-sm flex items-center gap-1.5">
              <span class="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">NHIỆM VỤ GIẢI TỎA</span>
              <span>${title}</span>
            </div>
            <div class="text-slate-800 mt-1 font-sans text-xs font-semibold">${locationAddress || 'Vị trí điểm nghẽn'}</div>
            ${taskNotes ? `<div class="text-slate-600 mt-1 text-[11px] font-sans bg-amber-50 p-1.5 rounded border border-amber-200">📌 ${taskNotes}</div>` : ''}
            <div class="text-slate-500 mt-1 text-[11px] text-amber-600 font-sans font-medium">Khu vực ùn tắc nội khu</div>
          </div>
        `);

        el.addEventListener('click', () => {
          targetMap.flyTo({
            center: [longitude, latitude],
            zoom: 16.5,
            duration: 700,
          });
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .setPopup(popup)
          .addTo(targetMap);

        trafficMarkerRef.current = marker;
      } else {
        trafficMarkerRef.current.setLngLat([longitude, latitude]);
      }
    },
    [activeTrafficTask]
  );

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
      style: createStaffBaseMapStyle(layerMode),
      center: initialCenter,
      zoom: 14.8,
      pitch: is3DMode ? 45 : 0,
      bearing: 15,
      attributionControl: false,
    });

    map.on('error', (e) => {
      console.warn('Staff Mapbox Notice:', e?.error?.message || e);
    });

    const ensureAllLayers = () => {
      const coords = routeCoordsRef.current;
      if (coords && coords.length >= 2) {
        setupRouteLayers(map, coords);
      }
      if (serviceAreaRef.current) {
        setupServiceAreaLayer(map, serviceAreaRef.current);
      }
    };

    map.on('load', () => {
      setMapLoaded(true);
      map.resize();
      ensureAllLayers();
      syncVehicleMarker(map);
      syncIncidentMarker(map);
      syncTrafficMarker(map);

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
      ensureAllLayers();
      syncVehicleMarker(map);
      syncIncidentMarker(map);
      syncTrafficMarker(map);
    });
    map.on('idle', ensureAllLayers);

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
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.remove();
        vehicleMarkerRef.current = null;
      }
      if (incidentMarkerRef.current) {
        incidentMarkerRef.current.remove();
        incidentMarkerRef.current = null;
      }
      if (trafficMarkerRef.current) {
        trafficMarkerRef.current.remove();
        trafficMarkerRef.current = null;
      }
      stepMarkersRef.current.forEach((m) => m.remove());
      stepMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []); // Mount 1 lần

  // 2. Chuyển đổi Style lớp bản đồ tức thì (CAD Tối, Vệ tinh, Đường phố) không bao giờ mất route line
  const handleSwitchLayer = (newMode: MapLayerMode) => {
    const map = mapRef.current;
    if (!map || newMode === layerMode) return;
    setLayerMode(newMode);
    applyStaffMapLayerMode(map, newMode);

    // Tuyệt đối không gọi map.setStyle() để giữ nguyên 100% đường chỉ dẫn cứu nạn và ranh giới trạm
    const coords = routeCoordsRef.current;
    if (coords && coords.length >= 2) {
      setupRouteLayers(map, coords);
    }
    if (serviceAreaRef.current) {
      setupServiceAreaLayer(map, serviceAreaRef.current);
    }
    syncVehicleMarker(map);
    syncIncidentMarker(map);
    syncTrafficMarker(map);
  };

  // 3. Bao quát toàn bộ lộ trình di chuyển (Fit Bounds toàn tuyến)
  const handleFitRoute = useCallback(() => {
    const map = mapRef.current;
    const coords = routeCoordsRef.current;
    if (!map || !coords || coords.length < 2) return;

    try {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([mission.vehicleLng, mission.vehicleLat]);
      bounds.extend([mission.incidentLng, mission.incidentLat]);
      coords.forEach((c) => bounds.extend(c));

      map.fitBounds(bounds, {
        padding: isFullscreen
          ? { top: 90, bottom: 90, left: 90, right: 90 }
          : { top: 75, bottom: 85, left: 65, right: 65 },
        maxZoom: 16.5,
        duration: 800,
      });
    } catch (err) {
      console.warn('Mapbox fitBounds warning:', err);
    }
  }, [mission.vehicleLng, mission.vehicleLat, mission.incidentLng, mission.incidentLat, isFullscreen]);

  // 4. Bật/Tắt Toàn màn hình & Tự động Zoom Out bao quát lộ trình
  const handleToggleFullscreen = () => {
    const el = mapOuterContainerRef.current;
    if (!el) return;

    if (!document.fullscreenElement && !isFullscreen) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          setIsFullscreen(true);
          setTimeout(() => {
            mapRef.current?.resize();
            handleFitRoute();
          }, 150);
        });
      } else {
        setIsFullscreen(true);
        setTimeout(() => {
          mapRef.current?.resize();
          handleFitRoute();
        }, 150);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
          setTimeout(() => {
            mapRef.current?.resize();
            handleFitRoute();
          }, 150);
        });
      } else {
        setIsFullscreen(false);
        setTimeout(() => {
          mapRef.current?.resize();
          handleFitRoute();
        }, 150);
      }
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      setTimeout(() => {
        const map = mapRef.current;
        if (!map) return;
        map.resize();
        handleFitRoute();
      }, 150);
    };

    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [handleFitRoute]);

  // 5. Đổi góc nghiêng 2D / 3D
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

  // 6. Cập nhật hoặc tạo Vehicle Marker (Ưu tiên z-index cao nhất: 10)
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      syncVehicleMarker(mapRef.current);
    }
  }, [mapLoaded, syncVehicleMarker]);

  // 7. Cập nhật hoặc tạo Incident Target Marker (z-index: 8) - Đồng bộ icon Quầng sáng như Operator
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      syncIncidentMarker(mapRef.current);
    }
  }, [mapLoaded, syncIncidentMarker]);

  // 8. Không cắm các marker số thứ tự chặng (step markers) dọc đường kẻ để giữ bản đồ thoáng và rõ tuyến đường
  useEffect(() => {
    stepMarkersRef.current.forEach((m) => m.remove());
    stepMarkersRef.current = [];
  }, [mission.routeSteps]);

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

  // Cập nhật lại đường polyline và khung hình bao quát khi coords thay đổi
  useEffect(() => {
    if (mapRef.current && mapLoaded && routeCoordsLngLat.length >= 2) {
      setupRouteLayers(mapRef.current, routeCoordsLngLat);

      try {
        const bounds = new mapboxgl.LngLatBounds();
        routeCoordsLngLat.forEach((c) => bounds.extend(c));
        mapRef.current.fitBounds(bounds, {
          padding: { top: 70, bottom: 85, left: 60, right: 60 },
          maxZoom: 16.5,
          duration: 800,
        });
      } catch (err) {
        console.warn('Mapbox fitBounds warning:', err);
      }
    }
  }, [routeCoordsLngLat, mapLoaded, setupRouteLayers]);

  // 10. Cập nhật Service Area Layer khi serviceArea prop thay đổi
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      setupServiceAreaLayer(mapRef.current, serviceArea);
    }
  }, [serviceArea, mapLoaded, setupServiceAreaLayer]);

  // 11. Cập nhật hoặc tạo Marker Điểm nghẽn giao thông (Traffic Hotspot Marker - Mục 20)
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      syncTrafficMarker(mapRef.current);
    }
  }, [mapLoaded, syncTrafficMarker]);

  // 12. Tính toán vị trí xe so với Ranh giới phục vụ của Trạm (Geofence status)
  const geofenceInfo = React.useMemo(() => {
    if (!serviceArea || !serviceArea.enabled || serviceArea.radiusKm <= 0) {
      return null;
    }
    const dist = getDistanceFromLatLonInKm(
      mission.vehicleLat,
      mission.vehicleLng,
      serviceArea.centerLat,
      serviceArea.centerLng
    );
    const isInside = dist <= serviceArea.radiusKm;
    return {
      isInside,
      distKm: dist.toFixed(1),
      radiusKm: serviceArea.radiusKm,
      name: serviceArea.name || 'Địa bàn quản lý trạm',
    };
  }, [serviceArea, mission.vehicleLat, mission.vehicleLng]);

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
      ref={mapOuterContainerRef}
      className={`relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950 transition-all isolate [&:fullscreen]:w-screen [&:fullscreen]:h-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-none ${
        isFullscreen ? 'fixed inset-0 z-[99999] w-screen h-screen rounded-none border-none' : ''
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

        {/* Fit Bounds to Entire Route (Zoom Out bao quát) */}
        <button
          type="button"
          onClick={handleFitRoute}
          className="p-2.5 rounded-xl bg-white/95 hover:bg-white border border-slate-200 text-slate-700 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          title="Bao quát toàn bộ tuyến đường (Zoom Out)"
        >
          <Route className="w-5 h-5" />
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

        {/* Fullscreen Toggle & Auto Fit Route */}
        <button
          type="button"
          onClick={handleToggleFullscreen}
          className={`p-2.5 rounded-xl border shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
            isFullscreen
              ? 'bg-red-600 text-white border-red-600 shadow-red-500/30'
              : 'bg-white/95 hover:bg-white border-slate-200 text-slate-700'
          }`}
          title={isFullscreen ? 'Thu nhỏ bản đồ (Thoát toàn màn hình)' : 'Phóng to toàn màn hình & bao quát lộ trình'}
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

      {/* Floating Top Header: Telemetry Card + Direct Map Style Switcher Pills (Desktop & Tablet) */}
      <div className="hidden sm:flex absolute top-4 left-4 right-16 sm:right-auto z-10 flex-wrap items-center gap-2 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-white shadow-xl pointer-events-auto flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400 leading-none">HỆ THỐNG ĐIỀU HƯỚNG TÁC CHIẾN</div>
            <div className="text-xs font-mono font-bold text-red-400 mt-0.5 flex items-center gap-2">
              <span>{mission.vehiclePlate}</span>
              <span className="text-slate-500">•</span>
              <span className="text-white" title={`Mã sự cố đầy đủ: ${mission.incidentId}`}>
                {formatShortId(mission.incidentCode || mission.incidentId)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Map Style Switcher Pills (Direct 1-Click UI Change) */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-0.5 sm:p-1 shadow-xl pointer-events-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSwitchLayer('satellite')}
            className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
            className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
            className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              layerMode === 'streets'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Đổi sang bản đồ đường bộ giao thông"
          >
            <span>ĐƯỜNG PHỐ</span>
          </button>
        </div>

        {/* Quick Fly-to Traffic Hotspot Button (Mục 20) */}
        {activeTrafficTask && (
          <button
            type="button"
            onClick={() => {
              if (mapRef.current && activeTrafficTask.longitude && activeTrafficTask.latitude) {
                mapRef.current.flyTo({
                  center: [activeTrafficTask.longitude, activeTrafficTask.latitude],
                  zoom: 16.5,
                  duration: 700,
                });
              }
            }}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 border border-amber-300 text-slate-950 shadow-xl backdrop-blur-md text-xs font-mono font-bold flex items-center gap-1.5 pointer-events-auto cursor-pointer transition-all active:scale-95"
            title="Bấm để bay camera tới Điểm nghẽn giao thông cần giải tỏa"
          >
            <Car className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            <span className="max-w-[140px] truncate">KẸT XE: {activeTrafficTask.title}</span>
          </button>
        )}
      </div>

      {/* Floating Bottom HUD Status Bar (Responsive, No-Overlap) */}
      <div className="hidden sm:flex absolute bottom-5 left-4 right-4 z-10 items-end justify-between pointer-events-none gap-2">
        {/* Left: Telemetry & Station Geofence Status */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto max-w-[calc(100%-250px)]">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-xs font-sans text-slate-200 shadow-xl">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
            <span className="font-bold text-white whitespace-nowrap">
              TÍN HIỆU ĐỊNH VỊ TRỰC TUYẾN
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-bold whitespace-nowrap">KẾT NỐI VỆ TINH TỐT</span>
          </div>

          {geofenceInfo && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-mono font-bold shadow-xl whitespace-nowrap ${
                geofenceInfo.isInside
                  ? 'bg-blue-950/90 text-blue-200 border-blue-700/80'
                  : 'bg-amber-950/90 text-amber-200 border-amber-600 animate-pulse'
              }`}
              title={`Khoảng cách đến tâm trạm: ${geofenceInfo.distKm} km • Bán kính phục vụ: ${geofenceInfo.radiusKm} km`}
            >
              <Shield className={`w-3.5 h-3.5 shrink-0 ${geofenceInfo.isInside ? 'text-blue-400' : 'text-amber-400'}`} />
              <span>{geofenceInfo.isInside ? 'TRONG RANH GIỚI TRẠM' : 'NGOÀI RANH GIỚI TRẠM'}</span>
              <span className="text-[10px] text-slate-400 font-normal">({geofenceInfo.radiusKm}km)</span>
            </div>
          )}
        </div>

        {/* Right: Distance & ETA remaining pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-600/95 border border-red-500 text-white backdrop-blur-md text-xs font-mono font-bold shadow-xl shadow-red-600/25 pointer-events-auto shrink-0 whitespace-nowrap ml-auto">
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
