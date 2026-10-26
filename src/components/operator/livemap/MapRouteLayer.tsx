import { useEffect } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { GeoJSONSource } from 'mapbox-gl';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMeta';
import type { DispatchRoute } from '../../../hooks/useDispatchRoutes';
import type { VehiclePlacement } from './LiveMapView';

const SOURCE_ID = 'dispatch-routes';
const LINE_LAYER_ID = 'dispatch-routes-line';
const CASING_LAYER_ID = 'dispatch-routes-casing';
// Tuyến ước lượng (máy chủ chỉ đường lỗi → chỉ là đoạn thẳng) vẽ nét đứt ở lớp riêng: line-dasharray không đổi theo feature.
const DASHED_LAYER_ID = 'dispatch-routes-dashed';

/**
 * Tọa độ đúng chỗ marker xe đang hiện. Xe đậu được dời theo pixel dưới ghim trạm → đổi pixel đó ra tọa độ ở mức
 * zoom hiện tại để đường đi bắt đầu từ chính chiếc xe, không phải từ mũi ghim trạm.
 */
function markerCoordinate(map: mapboxgl.Map, place: VehiclePlacement): [number, number] {
  if (!place.offset) return [place.lng, place.lat];
  const point = map.project([place.lng, place.lat]);
  const at = map.unproject([point.x + place.offset[0], point.y + place.offset[1]]);
  return [at.lng, at.lat];
}

const toFeatureCollection = (
  map: mapboxgl.Map,
  routes: DispatchRoute[],
  placements: Map<string, VehiclePlacement>,
  selectedVehicleId: string | null
) => ({
  type: 'FeatureCollection' as const,
  features: routes.map((route) => {
    const place = placements.get(route.vehicleId);
    const coordinates = place ? [markerCoordinate(map, place), ...route.coordinates] : route.coordinates;
    return {
      type: 'Feature' as const,
      properties: {
        color: VEHICLE_STATUS_META[route.status].color,
        selected: route.vehicleId === selectedVehicleId,
        approximate: route.approximate,
      },
      geometry: { type: 'LineString' as const, coordinates },
    };
  }),
});

interface MapRouteLayerProps {
  map: mapboxgl.Map;
  routes: DispatchRoute[];
  /** Vị trí marker xe — để đường bắt đầu đúng tại chiếc xe được giao. */
  placements: Map<string, VehiclePlacement>;
  selectedVehicleId: string | null;
}

/**
 * Lộ trình xe → hiện trường, vẽ bằng lớp GeoJSON nằm dưới các marker (marker là phần tử DOM).
 * Màu theo trạng thái xe; xe đang chọn được tô đậm. Bản đồ đổi lớp nền chỉ bật/tắt layer nên lớp này giữ nguyên.
 */
export const MapRouteLayer: React.FC<MapRouteLayerProps> = ({ map, routes, placements, selectedVehicleId }) => {
  useEffect(() => {
    const ensureLayers = () => {
      if (map.getSource(SOURCE_ID)) return;
      map.addSource(SOURCE_ID, { type: 'geojson', data: toFeatureCollection(map, [], placements, null) });
      map.addLayer({
        id: CASING_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        filter: ['!', ['get', 'approximate']],
        paint: { 'line-color': '#FFFFFF', 'line-width': ['case', ['get', 'selected'], 9, 7], 'line-opacity': 0.9 },
      });
      map.addLayer({
        id: LINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        filter: ['!', ['get', 'approximate']],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'selected'], 6, 4],
          'line-opacity': ['case', ['get', 'selected'], 1, 0.75],
        },
      });
      map.addLayer({
        id: DASHED_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'butt' },
        filter: ['==', ['get', 'approximate'], true],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'selected'], 5, 3.5],
          'line-opacity': ['case', ['get', 'selected'], 1, 0.8],
          'line-dasharray': [2, 1.5],
        },
      });
    };

    const update = () => {
      ensureLayers();
      (map.getSource(SOURCE_ID) as GeoJSONSource).setData(toFeatureCollection(map, routes, placements, selectedVehicleId));
    };
    // Độ dời pixel của xe đậu đổi ra tọa độ khác nhau theo mức zoom / góc xoay → tính lại điểm đầu khi các giá trị này đổi.
    const refreshStart = () => {
      if (map.getSource(SOURCE_ID)) update();
    };

    // isStyleLoaded() còn false trong lúc tile đang tải (kể cả sau sự kiện 'load') → đợi 'idle' (luôn bắn lại),
    // không đợi 'load' (chỉ bắn một lần, lỡ rồi thì đường đi không được vẽ tới lần làm mới sau).
    if (map.isStyleLoaded()) update();
    else map.once('idle', update);
    map.on('zoom', refreshStart);
    map.on('rotate', refreshStart);
    map.on('pitch', refreshStart);
    return () => {
      map.off('idle', update);
      map.off('zoom', refreshStart);
      map.off('rotate', refreshStart);
      map.off('pitch', refreshStart);
    };
  }, [map, routes, placements, selectedVehicleId]);

  // Gỡ lớp khi rời Live Map (bản đồ bị hủy thì lớp cũng mất theo).
  useEffect(
    () => () => {
      try {
        if (map.getLayer(DASHED_LAYER_ID)) map.removeLayer(DASHED_LAYER_ID);
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
