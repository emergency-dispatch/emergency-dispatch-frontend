import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE } from '../../../services/mapboxService';

const COVERAGE_SOURCE_ID = 'station-coverage';
const COVERAGE_COLOR = '#DC2626';

/** Approximates a geodesic circle as a GeoJSON polygon (Mapbox has no metric-radius circle primitive). */
const buildCoveragePolygon = (lat: number, lng: number, radiusKm: number, steps = 64) => {
  const earthRadiusKm = 6371;
  const latRad = (lat * Math.PI) / 180;
  const angular = radiusKm / earthRadiusKm;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 2 * Math.PI;
    const pLat = Math.asin(
      Math.sin(latRad) * Math.cos(angular) + Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing),
    );
    const pLng =
      (lng * Math.PI) / 180 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad),
        Math.cos(angular) - Math.sin(latRad) * Math.sin(pLat),
      );
    coords.push([(pLng * 180) / Math.PI, (pLat * 180) / Math.PI]);
  }
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
  };
};

const createPickerElement = () => {
  const el = document.createElement('div');
  el.style.cssText =
    'width:16px;height:16px;border-radius:9999px;background:#DC2626;border:2px solid #FFFFFF;box-shadow:0 0 8px 2px rgba(220,38,38,0.5);cursor:grab;';
  return el;
};

interface StationMapPickerProps {
  lat: number;
  lng: number;
  radiusKm: number;
  onChange: (lat: number, lng: number) => void;
}

/**
 * Uncontrolled after mount: the map view stays where the admin left it once
 * panning/zooming, only the marker + coverage circle move on click/drag.
 * Re-centering on every position change would be jarring UX.
 */
export const StationMapPicker: React.FC<StationMapPickerProps> = ({ lat, lng, radiusKm, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Latest values for the style 'load' callback, which fires after the initial render.
  const latestRef = useRef({ lat, lng, radiusKm });
  latestRef.current = { lat, lng, radiusKm };

  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [lng, lat],
      zoom: 13,
      attributionControl: false,
    });

    map.on('error', (err) => {
      console.warn('Mapbox canvas notice:', err?.error?.message || err);
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    const marker = new mapboxgl.Marker({ element: createPickerElement(), draggable: true })
      .setLngLat([lng, lat])
      .addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLngLat();
      onChangeRef.current(pos.lat, pos.lng);
    });

    map.on('click', (e) => {
      onChangeRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    map.on('load', () => {
      const { lat: cLat, lng: cLng, radiusKm: cRadius } = latestRef.current;
      map.addSource(COVERAGE_SOURCE_ID, {
        type: 'geojson',
        data: buildCoveragePolygon(cLat, cLng, cRadius),
      });
      map.addLayer({
        id: `${COVERAGE_SOURCE_ID}-fill`,
        type: 'fill',
        source: COVERAGE_SOURCE_ID,
        paint: { 'fill-color': COVERAGE_COLOR, 'fill-opacity': 0.1 },
      });
      map.addLayer({
        id: `${COVERAGE_SOURCE_ID}-line`,
        type: 'line',
        source: COVERAGE_SOURCE_ID,
        paint: { 'line-color': COVERAGE_COLOR, 'line-width': 1.5 },
      });
      map.resize();
    });

    // The picker lives inside a drawer that animates in, so the canvas must track container size.
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current);
    }

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat]);
    const source = mapRef.current?.getSource(COVERAGE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(buildCoveragePolygon(lat, lng, radiusKm));
  }, [lat, lng, radiusKm]);

  return <div ref={containerRef} className="h-full w-full" />;
};
