import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { LocateFixed, MapPin, Loader2, Shield } from 'lucide-react';
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE, mapboxService } from '../../services/mapboxService';
import { liveMapService } from '../../services/liveMapService';
import { stationMarkerHtml } from '../operator/livemap/mapIcons';
import type { Station } from '../../types/vehicle';

interface MapboxLocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number, address?: string) => void;
  height?: string;
  scrollZoom?: boolean;
}

export const MapboxLocationPicker: React.FC<MapboxLocationPickerProps> = ({
  latitude,
  longitude,
  onChange,
  height = '220px',
  scrollZoom = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const stationMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [stationCount, setStationCount] = useState<number>(0);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLE,
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

    // Create Custom Red Marker Element
    const el = document.createElement('div');
    el.className = 'custom-sos-marker';
    el.innerHTML = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: grab;">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(220, 38, 38, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 24px; height: 24px; border-radius: 50%; background: #DC2626; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `;

    const marker = new mapboxgl.Marker({ element: el, draggable: true })
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
          stEl.innerHTML = stationMarkerHtml(false);

          const popup = new mapboxgl.Popup({ offset: [0, -32], closeButton: false }).setHTML(`
            <div style="font-family: inherit; font-size: 11px; padding: 4px 2px; min-width: 170px; color: #0F172A;">
              <p style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748B; margin: 0 0 2px 0;">Trạm cứu hộ</p>
              <p style="font-size: 12px; font-weight: 700; color: #0F172A; margin: 0 0 2px 0;">${st.name}</p>
              <p style="font-size: 11px; color: #64748B; margin: 0 0 4px 0; line-height: 1.3;">${st.address || 'Khu vực nội thành'}</p>
              <div style="padding-top: 4px; border-top: 1px solid #E2E8F0; font-size: 10px; font-weight: 600; color: #0284C7;">
                ${st.vehicleIds?.length ? `${st.vehicleIds.length} xe biên chế trực chiến` : 'Trực chiến 24/7'}
              </div>
            </div>
          `);

          const stMarker = new mapboxgl.Marker({ element: stEl, anchor: 'bottom' })
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

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-xs h-full w-full min-h-[280px]">
      <div ref={mapContainerRef} style={{ width: '100%', height }} className={height === '100%' ? 'h-full w-full' : ''} />

      {/* Floating Controls */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-2 z-10">
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
          <span>{isLocating ? 'Đang định vị GPS...' : 'Định vị vị trí của tôi'}</span>
        </button>

        {isReverseGeocoding && (
          <span className="px-2 py-1 rounded-md bg-slate-900/80 text-white text-[10px] font-mono flex items-center gap-1 shadow-md">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Mapbox đang tìm địa chỉ...</span>
          </span>
        )}
      </div>

      {/* Station Count Indicator */}
      {stationCount > 0 && (
        <div className="absolute top-2.5 right-12 z-10 hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur-xs text-sky-400 text-[10px] font-mono font-bold border border-sky-500/30 shadow-md">
          <Shield className="w-3.5 h-3.5 text-sky-400" />
          <span>{stationCount} Trạm Cứu Hộ trực chiến</span>
        </div>
      )}

      {/* Drag instruction notice */}
      <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2.5 py-1 rounded-md text-center pointer-events-none flex items-center justify-center gap-1.5 shadow-sm z-10">
        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
        <span>Kéo ghim đỏ hoặc chạm vào bản đồ Mapbox để điều chỉnh chính xác vị trí cứu nạn</span>
      </div>
    </div>
  );
};
