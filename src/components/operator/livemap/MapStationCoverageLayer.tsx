import { useEffect } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { GeoJSONSource } from 'mapbox-gl';
import { circlePolygon } from './MapServiceAreaLayer';
import type { Station } from '../../../types/vehicle';

const SOURCE_ID = 'station-coverage';
const FILL_LAYER_ID = 'station-coverage-fill';
const LINE_LAYER_ID = 'station-coverage-line';
const MY_STATION_COLOR = '#DC2626';
// Tím: nổi trên cả nền vệ tinh lẫn đường phố, không trùng màu cấp sự cố / khu vực phục vụ.
const OTHER_STATION_COLOR = '#7C3AED';

const toFeatureCollection = (stations: Station[], myStationId: string | null) => ({
  type: 'FeatureCollection' as const,
  features: stations
    .filter((s) => s.coverageRadiusKm > 0)
    .map((s) => ({
      type: 'Feature' as const,
      properties: { color: s.id === myStationId ? MY_STATION_COLOR : OTHER_STATION_COLOR },
      geometry: { type: 'Polygon' as const, coordinates: [circlePolygon(s.lat, s.lng, s.coverageRadiusKm)] },
    })),
});

/** Lớp đầu tiên không phải nền → chèn vòng phủ sóng ngay trên nền, dưới khu vực phục vụ / đường đi. */
const firstOverlayLayerId = (map: mapboxgl.Map) =>
  map.getStyle()?.layers?.find((l) => !l.id.startsWith('base-') && !l.id.startsWith(SOURCE_ID))?.id;

interface MapStationCoverageLayerProps {
  map: mapboxgl.Map;
  stations: Station[];
  myStationId: string | null;
  visible: boolean;
}

/**
 * Vòng phủ sóng của từng trạm (Station.coverageRadiusKm — backend chọn trạm phụ trách SOS theo vòng này).
 * Trạm của Operator màu đỏ, trạm khác màu tím; nét liền để không lẫn với vòng khu vực phục vụ (nét đứt xanh).
 */
export const MapStationCoverageLayer: React.FC<MapStationCoverageLayerProps> = ({ map, stations, myStationId, visible }) => {
  useEffect(() => {
    const update = () => {
      if (!map.getSource(SOURCE_ID)) {
        const beforeId = firstOverlayLayerId(map);
        map.addSource(SOURCE_ID, { type: 'geojson', data: toFeatureCollection([], null) });
        map.addLayer(
          {
            id: FILL_LAYER_ID,
            type: 'fill',
            source: SOURCE_ID,
            paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.06 },
          },
          beforeId
        );
        map.addLayer(
          {
            id: LINE_LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.9 },
          },
          beforeId
        );
      }
      (map.getSource(SOURCE_ID) as GeoJSONSource).setData(toFeatureCollection(stations, myStationId));
      const visibility = visible ? 'visible' : 'none';
      map.setLayoutProperty(FILL_LAYER_ID, 'visibility', visibility);
      map.setLayoutProperty(LINE_LAYER_ID, 'visibility', visibility);
    };

    // isStyleLoaded() còn false trong lúc tile đang tải → đợi 'idle' (luôn bắn lại) thay vì 'load' (chỉ bắn một lần).
    if (map.isStyleLoaded()) update();
    else map.once('idle', update);
    return () => {
      map.off('idle', update);
    };
  }, [map, stations, myStationId, visible]);

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
