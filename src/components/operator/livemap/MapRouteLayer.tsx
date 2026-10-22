import { useEffect } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { GeoJSONSource } from 'mapbox-gl';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMeta';
import type { DispatchRoute } from '../../../hooks/useDispatchRoutes';

const SOURCE_ID = 'dispatch-routes';
const LINE_LAYER_ID = 'dispatch-routes-line';
const CASING_LAYER_ID = 'dispatch-routes-casing';

const toFeatureCollection = (routes: DispatchRoute[], selectedVehicleId: string | null) => ({
  type: 'FeatureCollection' as const,
  features: routes.map((route) => ({
    type: 'Feature' as const,
    properties: {
      color: VEHICLE_STATUS_META[route.status].color,
      selected: route.vehicleId === selectedVehicleId,
    },
    geometry: { type: 'LineString' as const, coordinates: route.coordinates },
  })),
});

interface MapRouteLayerProps {
  map: mapboxgl.Map;
  routes: DispatchRoute[];
  selectedVehicleId: string | null;
}

/**
 * Lộ trình xe → hiện trường, vẽ bằng lớp GeoJSON nằm dưới các marker (marker là phần tử DOM).
 * Màu theo trạng thái xe; xe đang chọn được tô đậm. Bản đồ đổi lớp nền chỉ bật/tắt layer nên lớp này giữ nguyên.
 */
export const MapRouteLayer: React.FC<MapRouteLayerProps> = ({ map, routes, selectedVehicleId }) => {
  useEffect(() => {
    const ensureLayers = () => {
      if (map.getSource(SOURCE_ID)) return;
      map.addSource(SOURCE_ID, { type: 'geojson', data: toFeatureCollection([], null) });
      map.addLayer({
        id: CASING_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#FFFFFF', 'line-width': ['case', ['get', 'selected'], 9, 7], 'line-opacity': 0.9 },
      });
      map.addLayer({
        id: LINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'selected'], 6, 4],
          'line-opacity': ['case', ['get', 'selected'], 1, 0.75],
        },
      });
    };

    const update = () => {
      ensureLayers();
      (map.getSource(SOURCE_ID) as GeoJSONSource).setData(toFeatureCollection(routes, selectedVehicleId));
    };

    if (map.isStyleLoaded()) update();
    else map.once('load', update);
    return () => {
      map.off('load', update);
    };
  }, [map, routes, selectedVehicleId]);

  // Gỡ lớp khi rời Live Map (bản đồ bị hủy thì lớp cũng mất theo).
  useEffect(
    () => () => {
      try {
        if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
        if (map.getLayer(CASING_LAYER_ID)) map.removeLayer(CASING_LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // Bản đồ đã bị hủy (map.remove()) trước khi lớp này dọn dẹp — không còn gì để gỡ.
      }
    },
    [map]
  );

  return null;
};
