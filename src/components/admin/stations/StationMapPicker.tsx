import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { FeatureCollection } from 'geojson';
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE } from '../../../services/mapboxService';
import { boundaryBounds, type PolygonCoords } from '../settings/serviceAreaBoundary';
import { STATION_ICON_SIZE, glowStationMarkerHtml } from '../../operator/livemap/glowMarkers';

const COVERAGE_SOURCE_ID = 'station-coverage';
const DEFAULT_COVERAGE_COLOR = '#DC2626';
// Lớp tham chiếu (không bấm được): khu vực phục vụ xanh nét đứt như Live Map (MapServiceAreaLayer),
// trạm khác dùng icon trạm của Live Map Operator + tên — không vẽ bán kính trạm vì backend giao trạm theo quãng
// đường bộ (OSRM).
const REFERENCE_SOURCE_ID = 'picker-reference';
const SERVICE_AREA_COLOR = '#2563EB';
// Icon trạm (glowStationMarkerHtml) là ô vuông neo tâm.
const STATION_ICON_HALF = STATION_ICON_SIZE / 2;

export interface MapReferenceStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Trạm tạm ngưng → vẽ màu xám. */
  inactive?: boolean;
}

export interface MapReferenceArea {
  lat: number;
  lng: number;
  radiusKm: number;
  /** §33: ranh giới đa giác đã lưu — có thì vẽ đa giác thay cho vòng tròn tâm + bán kính. */
  polygons?: PolygonCoords[];
}

const toReferenceCollection = (area: MapReferenceArea | null) => ({
  type: 'FeatureCollection' as const,
  features: [
    ...(area?.polygons?.length
      ? [
          {
            type: 'Feature' as const,
            geometry: { type: 'MultiPolygon' as const, coordinates: area.polygons },
            properties: { kind: 'area', color: SERVICE_AREA_COLOR },
          },
        ]
      : area && area.radiusKm > 0
        ? [{ ...buildCoveragePolygon(area.lat, area.lng, area.radiusKm, 96), properties: { kind: 'area', color: SERVICE_AREA_COLOR } }]
        : []),
  ],
});

/**
 * Icon trạm khác (như Live Map Operator: viền xám) + tên; trạm tạm ngưng thì mờ đi.
 * pointer-events:none để bấm lên vẫn đặt được vị trí.
 */
const createReferenceStationElement = (name: string, inactive: boolean) => {
  const el = document.createElement('div');
  el.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:1px;pointer-events:none;${inactive ? 'opacity:0.5;' : ''}`;
  const icon = document.createElement('div');
  icon.innerHTML = glowStationMarkerHtml(false).replace('cursor-pointer', '');
  const label = document.createElement('div');
  label.textContent = name;
  label.style.cssText =
    'padding:1px 6px;border-radius:4px;background:rgba(255,255,255,0.92);color:#334155;font-size:10px;font-weight:600;white-space:nowrap;box-shadow:0 1px 2px rgba(15,23,42,0.25);';
  el.append(icon, label);
  return el;
};

const boundsOfCircle = (lat: number, lng: number, radiusKm: number) =>
  buildCoveragePolygon(lat, lng, radiusKm, 32).geometry.coordinates[0].reduce(
    (b, c) => b.extend(c),
    new mapboxgl.LngLatBounds()
  );

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

/** Điểm đang chọn: icon trạm của tôi (viền đỏ, như Live Map) khi chọn vị trí trạm; chấm đỏ cho tâm khu vực. */
const createPickerElement = (variant: 'point' | 'station') => {
  const el = document.createElement('div');
  if (variant === 'station') {
    el.style.cursor = 'grab';
    // Luôn nằm trên icon các trạm khác (marker thêm sau sẽ đè lên nếu không đặt z-index).
    el.style.zIndex = '2';
    el.innerHTML = glowStationMarkerHtml(true).replace('cursor-pointer', '');
    return el;
  }
  el.style.cssText =
    'width:16px;height:16px;border-radius:9999px;background:#DC2626;border:2px solid #FFFFFF;box-shadow:0 0 8px 2px rgba(220,38,38,0.5);cursor:grab;';
  return el;
};

interface StationMapPickerProps {
  lat: number;
  lng: number;
  /** Bán kính vòng tròn quanh điểm chọn (chỉ khu vực phục vụ dạng hình tròn); bỏ trống thì không vẽ vòng. */
  radiusKm?: number;
  onChange: (lat: number, lng: number) => void;
  /** Đổi giá trị này để bay bản đồ tới vị trí hiện tại (VD sau khi chọn địa chỉ từ ô tìm kiếm). */
  recenterKey?: number;
  /** Màu vòng tròn (mặc định đỏ). */
  color?: string;
  /** Vòng tròn lớn (khu vực phục vụ): mở bản đồ và recenter thì thu vừa cả vòng thay vì zoom sát vào tâm. */
  fitToRadius?: boolean;
  /** Khu vực phục vụ để tham chiếu (null/bỏ trống = không vẽ). Truyền giá trị đã memo. */
  referenceArea?: MapReferenceArea | null;
  /** Các trạm khác để tham chiếu (icon trạm + tên). Truyền mảng đã memo. */
  referenceStations?: MapReferenceStation[];
  /** Hình điểm đang chọn: 'station' = icon trạm (form trạm), 'point' = chấm đỏ (tâm khu vực, mặc định). Chỉ đọc lúc khởi tạo. */
  markerVariant?: 'point' | 'station';
  /**
   * Chế độ vẽ đa giác (khu vực phục vụ, §33): không có chấm tâm / bấm đặt tâm, thay bằng công cụ vẽ.
   * Chỉ đọc lúc khởi tạo → đổi chế độ hoặc vẽ lại từ đầu thì đổi `key` để dựng lại bản đồ.
   * `createDraw` do trang truyền vào để thư viện vẽ không bị nạp kèm drawer Trạm.
   */
  boundary?: {
    polygons: PolygonCoords[];
    onChange: (polygons: PolygonCoords[]) => void;
    createDraw: () => MapboxDraw;
    readPolygons: (collection: FeatureCollection) => PolygonCoords[];
  };
}

/**
 * Uncontrolled after mount: the map view stays where the admin left it once
 * panning/zooming, only the marker + coverage circle move on click/drag.
 * Re-centering on every position change would be jarring UX.
 */
export const StationMapPicker: React.FC<StationMapPickerProps> = ({
  lat,
  lng,
  radiusKm,
  onChange,
  recenterKey,
  color = DEFAULT_COVERAGE_COLOR,
  fitToRadius = false,
  referenceArea = null,
  referenceStations,
  markerVariant = 'point',
  boundary,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Latest values for the style 'load' callback, which fires after the initial render.
  const latestRef = useRef({ lat, lng, radiusKm, color, fitToRadius, referenceArea, polygons: boundary?.polygons });
  latestRef.current = { lat, lng, radiusKm, color, fitToRadius, referenceArea, polygons: boundary?.polygons };
  const boundaryRef = useRef(boundary);
  boundaryRef.current = boundary;
  // Người dùng đã tự kéo/zoom bản đồ → thôi tự căn lại theo vòng khi khung đổi kích thước.
  const userMovedRef = useRef(false);
  const fitViewRef = useRef<((duration: number) => boolean) | null>(null);

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

    // Căn khung nhìn: đa giác (nếu có) → vòng tròn (fitToRadius) → vòng tham chiếu. false = không có gì để căn.
    const fitView = (duration: number) => {
      const { lat: cLat, lng: cLng, radiusKm: cRadius, fitToRadius: cFit, referenceArea: cArea, polygons } = latestRef.current;
      const b = polygons ? boundaryBounds(polygons) : null;
      if (b) {
        map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 48, duration });
        return true;
      }
      if (!cFit) return false;
      if (cRadius !== undefined) {
        map.fitBounds(boundsOfCircle(cLat, cLng, cRadius), { padding: 24, duration });
        return true;
      }
      if (cArea && cArea.radiusKm > 0) {
        map.fitBounds(boundsOfCircle(cArea.lat, cArea.lng, cArea.radiusKm), { padding: 24, duration });
        return true;
      }
      return false;
    };
    fitViewRef.current = fitView;

    const initialBoundary = boundaryRef.current;
    let marker: mapboxgl.Marker | null = null;
    if (initialBoundary) {
      // Thêm công cụ vẽ trước 'load' để Draw tự gắn nguồn / lớp khi style sẵn sàng.
      const draw = initialBoundary.createDraw();
      map.addControl(draw, 'top-right');
      const emit = () => {
        const current = boundaryRef.current;
        current?.onChange(current.readPolygons(draw.getAll()));
      };
      map.on('draw.create', emit);
      map.on('draw.update', emit);
      map.on('draw.delete', emit);
      map.once('load', () => {
        const polygons = initialBoundary.polygons;
        if (polygons.length > 0) {
          draw.add({
            type: 'FeatureCollection',
            features: polygons.map((coordinates) => ({
              type: 'Feature',
              properties: {},
              geometry: { type: 'Polygon', coordinates },
            })),
          });
        } else {
          // Chưa có đa giác → vào thẳng chế độ vẽ.
          draw.changeMode('draw_polygon');
        }
      });
    } else {
      marker = new mapboxgl.Marker({ element: createPickerElement(markerVariant), draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);

      marker.on('dragend', () => {
        const pos = marker!.getLngLat();
        onChangeRef.current(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        onChangeRef.current(e.lngLat.lat, e.lngLat.lng);
      });
    }

    map.on('load', () => {
      const { lat: cLat, lng: cLng, radiusKm: cRadius, color: cColor } = latestRef.current;
      if (cRadius === undefined) {
        map.resize();
        fitView(0);
        return;
      }
      map.addSource(COVERAGE_SOURCE_ID, {
        type: 'geojson',
        data: buildCoveragePolygon(cLat, cLng, cRadius),
      });
      map.addLayer({
        id: `${COVERAGE_SOURCE_ID}-fill`,
        type: 'fill',
        source: COVERAGE_SOURCE_ID,
        paint: { 'fill-color': cColor, 'fill-opacity': 0.1 },
      });
      map.addLayer({
        id: `${COVERAGE_SOURCE_ID}-line`,
        type: 'line',
        source: COVERAGE_SOURCE_ID,
        paint: { 'line-color': cColor, 'line-width': 1.5 },
      });
      map.resize();
      fitView(0);
    });

    // Chỉ thao tác của người dùng mới có originalEvent (fitBounds / flyTo trong code thì không).
    map.on('movestart', (e) => {
      if (e.originalEvent) userMovedRef.current = true;
    });

    // The picker lives inside a drawer that animates in, so the canvas must track container size.
    // fitToRadius: lúc 'load' khung có thể chưa đạt kích thước cuối (bố cục co giãn theo màn hình) → căn lại
    // vòng sau mỗi lần đổi kích thước, cho tới khi người dùng tự kéo/zoom.
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.resize();
        if (!userMovedRef.current && map.isStyleLoaded()) fitView(0);
      });
      resizeObserver.observe(containerRef.current);
    }

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      fitViewRef.current = null;
    };
  }, []);

  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat]);
    if (radiusKm === undefined) return;
    const source = mapRef.current?.getSource(COVERAGE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(buildCoveragePolygon(lat, lng, radiusKm));
  }, [lat, lng, radiusKm]);

  // Lớp tham chiếu nằm dưới vòng tròn của điểm đang chọn. Dữ liệu về sau (gọi API) nên đợi style sẵn sàng.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const stations = referenceStations ?? [];
    const update = () => {
      if (!map.getSource(REFERENCE_SOURCE_ID)) {
        const ownFill = `${COVERAGE_SOURCE_ID}-fill`;
        const beforeId = map.getLayer(ownFill) ? ownFill : undefined;
        map.addSource(REFERENCE_SOURCE_ID, { type: 'geojson', data: toReferenceCollection(null) });
        map.addLayer(
          {
            id: `${REFERENCE_SOURCE_ID}-area-line`,
            type: 'line',
            source: REFERENCE_SOURCE_ID,
            filter: ['==', ['get', 'kind'], 'area'],
            paint: { 'line-color': SERVICE_AREA_COLOR, 'line-width': 2.5, 'line-dasharray': [3, 2] },
          },
          beforeId
        );
      }
      (map.getSource(REFERENCE_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(toReferenceCollection(referenceArea));
    };

    // isStyleLoaded() còn false lúc tile đang tải → đợi 'idle' (luôn bắn lại), giống MapServiceAreaLayer.
    if (map.isStyleLoaded()) update();
    else map.once('idle', update);

    const markers = stations.map((s) =>
      new mapboxgl.Marker({
        element: createReferenceStationElement(s.name, !!s.inactive),
        anchor: 'top',
        offset: [0, -STATION_ICON_HALF],
      })
        .setLngLat([s.lng, s.lat])
        .addTo(map)
    );

    return () => {
      map.off('idle', update);
      markers.forEach((m) => m.remove());
    };
  }, [referenceArea, referenceStations]);

  useEffect(() => {
    if (!recenterKey) return;
    userMovedRef.current = false;
    if (fitViewRef.current?.(800)) return;
    const { lat: cLat, lng: cLng } = latestRef.current;
    mapRef.current?.flyTo({ center: [cLng, cLat], zoom: Math.max(mapRef.current.getZoom(), 15), duration: 800 });
  }, [recenterKey]);

  return <div ref={containerRef} className="h-full w-full" />;
};
