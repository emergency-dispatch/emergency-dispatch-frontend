import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { FeatureCollection } from 'geojson';
import type { PolygonCoords } from './serviceAreaBoundary';

// Công cụ vẽ đa giác khu vực phục vụ (§33). Tách file riêng, chỉ ServiceAreaSettingsPage import: thư viện vẽ không bị
// nạp vào drawer Trạm (cũng dùng StationMapPicker).

// Cùng màu xanh với vòng khu vực trên Live Map của Operator (MapServiceAreaLayer).
const AREA_COLOR = '#2563EB';
const ACTIVE_COLOR = '#DC2626';

// Style riêng thay bộ mặc định (cam / xanh dương): màu theo hệ thống, nét vẽ dở dạng đứt.
// Draw đặt properties.active = 'true' | 'false' (chuỗi) cho đối tượng đang chọn.
const DRAW_STYLES: object[] = [
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': ['case', ['==', ['get', 'active'], 'true'], ACTIVE_COLOR, AREA_COLOR],
      'fill-opacity': 0.12,
    },
  },
  {
    id: 'gl-draw-polygon-stroke',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['case', ['==', ['get', 'active'], 'true'], ACTIVE_COLOR, AREA_COLOR],
      'line-width': 2.5,
    },
  },
  {
    // Cạnh đang vẽ dở (trước khi khép đa giác).
    id: 'gl-draw-line',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ACTIVE_COLOR, 'line-width': 2, 'line-dasharray': [2, 2] },
  },
  {
    id: 'gl-draw-vertex-halo',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
    paint: { 'circle-radius': 6, 'circle-color': '#FFFFFF' },
  },
  {
    id: 'gl-draw-vertex',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
    paint: { 'circle-radius': 4, 'circle-color': ACTIVE_COLOR },
  },
  {
    // Điểm giữa cạnh: kéo để thêm đỉnh.
    id: 'gl-draw-midpoint',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'midpoint'], ['==', '$type', 'Point']],
    paint: { 'circle-radius': 3, 'circle-color': ACTIVE_COLOR, 'circle-opacity': 0.7 },
  },
];

export const createBoundaryDraw = () =>
  new MapboxDraw({
    displayControlsDefault: false,
    controls: { polygon: true, trash: true },
    styles: DRAW_STYLES,
  });

/** Đối tượng trên bản đồ vẽ → danh sách đa giác (bỏ qua mọi thứ không phải Polygon / MultiPolygon). */
export const polygonsFromDraw = (collection: FeatureCollection): PolygonCoords[] =>
  collection.features.flatMap((f) =>
    f.geometry.type === 'Polygon'
      ? [f.geometry.coordinates as PolygonCoords]
      : f.geometry.type === 'MultiPolygon'
        ? (f.geometry.coordinates as PolygonCoords[])
        : []
  );
