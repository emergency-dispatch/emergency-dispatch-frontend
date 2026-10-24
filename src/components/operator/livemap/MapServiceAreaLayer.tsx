import { useEffect } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { GeoJSONSource } from 'mapbox-gl';
import type { ServiceAreaDto } from '../../../services/liveMapService';

const SOURCE_ID = 'service-area';
const FILL_LAYER_ID = 'service-area-fill';
const LINE_LAYER_ID = 'service-area-line';
const CIRCLE_STEPS = 72;
const EARTH_RADIUS_KM = 6371;

/** Vòng tròn bán kính `radiusKm` quanh tâm, xấp xỉ bằng đa giác (tọa độ [lng, lat]). */
function circlePolygon(lat: number, lng: number, radiusKm: number): [number, number][] {
  const latRad = (lat * Math.PI) / 180;
  const angular = radiusKm / EARTH_RADIUS_KM;
  const points: [number, number][] = [];
  for (let i = 0; i <= CIRCLE_STEPS; i++) {
    const bearing = (2 * Math.PI * i) / CIRCLE_STEPS;
    const pLat = Math.asin(
      Math.sin(latRad) * Math.cos(angular) + Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing)
    );
    const pLng =
      (lng * Math.PI) / 180 +
      Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad), Math.cos(angular) - Math.sin(latRad) * Math.sin(pLat));
    points.push([(pLng * 180) / Math.PI, (pLat * 180) / Math.PI]);
  }
  return points;
}

const toFeatureCollection = (area: ServiceAreaDto | null) => ({
  type: 'FeatureCollection' as const,
  features:
    area && area.enabled && area.radiusKm > 0
      ? [
          {
            type: 'Feature' as const,
            properties: { name: area.name ?? '' },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [circlePolygon(area.centerLat, area.centerLng, area.radiusKm)],
            },
          },
        ]
      : [],
});

interface MapServiceAreaLayerProps {
  map: mapboxgl.Map;
  area: ServiceAreaDto | null;
}

/**
 * Vòng khu vực phục vụ (Admin cấu hình ở GET/PUT /api/settings/service-area). SOS ngoài vòng vẫn được nhận nhưng gắn
 * cờ "ngoài khu vực". Admin tắt (enabled = false) thì không vẽ. Nằm dưới đường đi và các marker.
 */
export const MapServiceAreaLayer: React.FC<MapServiceAreaLayerProps> = ({ map, area }) => {
  useEffect(() => {
    const update = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, { type: 'geojson', data: toFeatureCollection(null) });
        map.addLayer({
          id: FILL_LAYER_ID,
          type: 'fill',
          source: SOURCE_ID,
          paint: { 'fill-color': '#2563EB', 'fill-opacity': 0.04 },
        });
        map.addLayer({
          id: LINE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          paint: { 'line-color': '#2563EB', 'line-width': 2, 'line-opacity': 0.6, 'line-dasharray': [3, 2] },
        });
      }
      (map.getSource(SOURCE_ID) as GeoJSONSource).setData(toFeatureCollection(area));
    };

    if (map.isStyleLoaded()) update();
    else map.once('load', update);
    return () => {
      map.off('load', update);
    };
  }, [map, area]);

  // Gỡ lớp khi rời Live Map (bản đồ bị hủy thì lớp cũng mất theo).
  useEffect(
    () => () => {
      try {
        if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
        if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // Bản đồ đã bị hủy trước khi lớp này dọn dẹp.
      }
    },
    [map]
  );

  return null;
};
