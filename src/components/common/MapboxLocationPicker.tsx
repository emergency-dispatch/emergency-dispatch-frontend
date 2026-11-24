import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { LocateFixed, MapPin, Loader2, Shield, Maximize2, Minimize2, Layers } from 'lucide-react';
import {
  MAPBOX_ACCESS_TOKEN,
  applyStaffMapLayerMode,
  createStaffBaseMapStyle,
  mapboxService,
} from '../../services/mapboxService';
import { liveMapService, type ServiceAreaDto } from '../../services/liveMapService';
import { glowStationMarkerHtml, pickPinMarkerHtml } from '../operator/livemap/glowMarkers';
import { serviceAreaToFeatureCollection } from '../operator/livemap/MapServiceAreaLayer';
import { parseBoundary } from '../admin/settings/serviceAreaBoundary';
import { normalizeServiceArea } from '../../utils/serviceArea';
import type { Station } from '../../types/vehicle';
import { useTranslation } from '../../i18n';

interface MapboxLocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number, address?: string) => void;
  height?: string;
  scrollZoom?: boolean;
  serviceArea?: ServiceAreaDto | null;
}

export const MapboxLocationPicker: React.FC<MapboxLocationPickerProps> = ({
  latitude,
  longitude,
  onChange,
  height = '220px',
  scrollZoom = true,
  serviceArea,
}) => {
  const { i18n } = useTranslation();
  const normalizedArea = serviceArea ? normalizeServiceArea(serviceArea) : null;
  const areaRadiusKm = normalizedArea?.radiusKm ?? 0;
  const areaEnabled = Boolean(normalizedArea?.enabled);
  const hasPolygonBoundary = parseBoundary(normalizedArea?.boundaryGeoJson).length > 0;
  const serviceAreaRef = useRef<ServiceAreaDto | null>(normalizedArea);
  serviceAreaRef.current = normalizedArea;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const stationMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [stationCount, setStationCount] = useState<number>(0);
  const [mapLayerMode, setMapLayerMode] = useState<'satellite' | 'streets' | 'dark'>('satellite');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChangeLayer = (nextMode: 'satellite' | 'streets' | 'dark') => {
    setMapLayerMode(nextMode);
    if (mapRef.current) {
      applyStaffMapLayerMode(mapRef.current, nextMode);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: createStaffBaseMapStyle('satellite'),
      center: [longitude, latitude],
      zoom: 15,
      attributionControl: false,
      scrollZoom: scrollZoom,
    });

    if (scrollZoom) {
      map.scrollZoom.enable();
    }

    // Error handling to prevent unhandled tile load breaks
    map.on('error', (err) => {
      console.warn('Mapbox canvas notice:', err?.error?.message || err);
    });

    // Navigation Controls (Zoom in/out)
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    // Create Custom Pick-Pin Marker Element
    const el = document.createElement('div');
    el.className = 'custom-sos-marker';
    el.innerHTML = pickPinMarkerHtml();

    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom', draggable: true })
      .setLngLat([longitude, latitude])
      .addTo(map);

    const updatePosition = async (lng: number, lat: number) => {
      setIsReverseGeocoding(true);
      try {
        const address = await mapboxService.reverseGeocode(lng, lat);
        onChangeRef.current(lat, lng, address);
      } catch {
        onChangeRef.current(lat, lng);
      } finally {
        setIsReverseGeocoding(false);
      }
    };

    // Marker Drag Event
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      updatePosition(lngLat.lng, lngLat.lat);
    });

    // Map Click to reposition marker
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      marker.setLngLat([lng, lat]);
      updatePosition(lng, lat);
    });

    // Draw operational boundary (polygon boundaryGeoJson if configured by Admin, else circle)
    const addKcnBoundary = () => {
      if (!map.getSource('kcn-boundary')) {
        map.addSource('kcn-boundary', {
          type: 'geojson',
          data: serviceAreaToFeatureCollection(serviceAreaRef.current) as any,
        });
        map.addLayer({
          id: 'kcn-boundary-fill',
          type: 'fill',
          source: 'kcn-boundary',
          paint: { 'fill-color': '#EF4444', 'fill-opacity': 0.05 },
        });
        map.addLayer({
          id: 'kcn-boundary-line',
          type: 'line',
          source: 'kcn-boundary',
          paint: {
            'line-color': '#DC2626',
            'line-width': 2.5,
            'line-dasharray': [3, 2],
            'line-opacity': 0.85,
          },
        });
      }
    };

    if (map.isStyleLoaded()) addKcnBoundary();
    else map.once('idle', addKcnBoundary);

    // Critical: Ensure canvas is resized once container finishes rendering in modal
    map.on('load', () => {
      map.resize();
    });

    // Load real rescue stations from database using standard livemap icons
    liveMapService
      .getStations()
      .then((stations) => {
        if (!mapRef.current) return;
        setStationCount(stations.length);
        stations.forEach((st) => {
          if (!st.lat || !st.lng) return;
          const stEl = document.createElement('div');
          stEl.className = 'custom-rescue-station-marker';
          stEl.innerHTML = glowStationMarkerHtml(false);

          const popup = new mapboxgl.Popup({ offset: [0, -24], closeButton: false }).setHTML(`
            <div style="font-family: inherit; font-size: 11px; padding: 4px 2px; min-width: 170px; color: #0F172A;">
              <p style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748B; margin: 0 0 2px 0;">Trạm cứu hộ</p>
              <p style="font-size: 12px; font-weight: 700; color: #0F172A; margin: 0 0 2px 0;">${st.name}</p>
              <p style="font-size: 11px; color: #64748B; margin: 0 0 4px 0; line-height: 1.3;">${st.address || 'Khu vực nội thành'}</p>
              <div style="padding-top: 4px; border-top: 1px solid #E2E8F0; font-size: 10px; font-weight: 600; color: #0284C7;">
                ${st.vehicleIds?.length ? `${st.vehicleIds.length} xe biên chế trực chiến` : 'Trực chiến 24/7'}
              </div>
            </div>
          `);

          const stMarker = new mapboxgl.Marker({ element: stEl, anchor: 'center' })
            .setLngLat([st.lng, st.lat])
            .setPopup(popup)
            .addTo(map);

          stationMarkersRef.current.push(stMarker);
        });
      })
      .catch((err) => {
        console.warn('Stations fetch error:', err);
      });

    const t1 = setTimeout(() => map.resize(), 100);
    const t2 = setTimeout(() => map.resize(), 300);
    const t3 = setTimeout(() => map.resize(), 600);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) resizeObserver.disconnect();
      stationMarkersRef.current.forEach((m) => m.remove());
      stationMarkersRef.current = [];
      try {
        if (map.getLayer('kcn-boundary-line')) map.removeLayer('kcn-boundary-line');
        if (map.getLayer('kcn-boundary-fill')) map.removeLayer('kcn-boundary-fill');
        if (map.getSource('kcn-boundary')) map.removeSource('kcn-boundary');
      } catch {
        // Map cleaned up
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center when props change from external (e.g. GPS found)
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      const current = markerRef.current.getLngLat();
      const dist = Math.hypot(current.lng - longitude, current.lat - latitude);
      if (dist > 0.0001) {
        markerRef.current.setLngLat([longitude, latitude]);
        mapRef.current.flyTo({ center: [longitude, latitude], zoom: 16 });
      }
    }
  }, [latitude, longitude]);

  // Dynamically update boundary if serviceArea changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const source = map.getSource('kcn-boundary') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(serviceAreaToFeatureCollection(normalizedArea) as any);
    }
  }, [normalizedArea]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (mapRef.current && markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
          mapRef.current.flyTo({ center: [lng, lat], zoom: 16 });
        }
        setIsReverseGeocoding(true);
        try {
          const address = await mapboxService.reverseGeocode(lng, lat);
          onChangeRef.current(lat, lng, address);
        } finally {
          setIsReverseGeocoding(false);
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.resize(), 80);
    return () => clearTimeout(t);
  }, [isExpanded]);

  return (
    <div
      className={
        isExpanded
          ? 'fixed inset-3 sm:inset-6 z-[10050] rounded-2xl overflow-hidden border border-slate-300 shadow-2xl bg-slate-950'
          : 'relative rounded-xl overflow-hidden border border-slate-300 shadow-xs h-full w-full min-h-[280px]'
      }
    >
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: isExpanded ? '100%' : height }}
        className={isExpanded || height === '100%' ? 'h-full w-full' : ''}
      />

      {/* Floating Controls */}
      <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5 z-10 max-w-[calc(100%-64px)]">
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="px-2.5 py-1.5 rounded-lg bg-white/95 backdrop-blur-xs hover:bg-white text-slate-800 border border-slate-200 text-[11px] font-mono font-bold shadow-md flex items-center gap-1.5 hover:text-red-600 transition-all cursor-pointer"
        >
          {isLocating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
          ) : (
            <LocateFixed className="w-3.5 h-3.5 text-red-600" />
          )}
          <span>
            {isLocating
              ? (i18n.language === 'en' ? 'Locating GPS...' : 'Đang định vị GPS...')
              : (i18n.language === 'en' ? 'Locate My Position' : 'Định vị vị trí của tôi')}
          </span>
        </button>

        <div className="flex items-center gap-0.5 bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 p-0.5 rounded-lg shadow-md">
          {(
            [
              { id: 'satellite', label: i18n.language === 'en' ? 'Sat' : 'Vệ tinh' },
              { id: 'streets', label: i18n.language === 'en' ? 'Street' : 'Đường phố' },
              { id: 'dark', label: 'CAD' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleChangeLayer(mode.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                mapLayerMode === mode.id
                  ? 'bg-red-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {mode.id === 'satellite' && <Layers className="w-3 h-3" />}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="p-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-800 border border-slate-200 shadow-md transition-colors cursor-pointer"
          title={isExpanded ? 'Thu nhỏ bản đồ' : 'Phóng to bản đồ'}
          aria-label={isExpanded ? 'Thu nhỏ bản đồ' : 'Phóng to bản đồ'}
        >
          {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {isReverseGeocoding && (
          <span className="px-2 py-1 rounded-md bg-slate-900/80 text-white text-[10px] font-mono flex items-center gap-1 shadow-md">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{i18n.language === 'en' ? 'Finding address...' : 'Mapbox đang tìm địa chỉ...'}</span>
          </span>
        )}
      </div>

      {/* Operational Boundary Indicator */}
      {normalizedArea && areaEnabled && (areaRadiusKm > 0 || hasPolygonBoundary) && (
        <div className="absolute top-2.5 right-12 z-10 hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur-xs text-red-400 text-[10px] font-mono font-bold border border-red-500/30 shadow-md">
          <Shield className="w-3.5 h-3.5 text-red-400" />
          <span>
            {hasPolygonBoundary
              ? normalizedArea.name || (i18n.language === 'en' ? 'Service Area' : 'Khu vực phục vụ')
              : i18n.language === 'en'
              ? `Service Area (${areaRadiusKm} km)`
              : `Ranh giới KCN (${areaRadiusKm} km)`}
          </span>
        </div>
      )}

      {/* Drag instruction notice */}
      <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2.5 py-1 rounded-md text-center pointer-events-none flex items-center justify-center gap-1.5 shadow-sm z-10">
        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
        <span>
          {i18n.language === 'en'
            ? 'Drag red pin or tap Mapbox map to fine-tune exact rescue location'
            : 'Kéo ghim đỏ hoặc chạm vào bản đồ Mapbox để điều chỉnh chính xác vị trí cứu nạn'}
        </span>
      </div>
    </div>
  );
};
