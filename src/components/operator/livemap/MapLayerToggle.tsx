import React from 'react';
import type mapboxgl from 'mapbox-gl';
import type { RasterLayerSpecification, StyleSpecification } from 'mapbox-gl';
import { useTranslation } from '../../../i18n';

export type MapTileMode = 'light' | 'dark' | 'satellite';

// Cùng nguồn tile Google với bản đồ SOS / landing (services/mapboxService.ts) để ảnh nền đồng bộ.
// lyrs=m: bản đồ đường · lyrs=y: vệ tinh kèm tên đường.
const googleTiles = (layer: 'm' | 'y') =>
  [0, 1, 2, 3].map((n) => `https://mt${n}.google.com/vt/lyrs=${layer}&hl=vi&x={x}&y={y}&z={z}`);

const googleSource = (layer: 'm' | 'y') => ({
  type: 'raster' as const,
  tiles: googleTiles(layer),
  tileSize: 256,
  maxzoom: 20,
  attribution: '&copy; Google',
});

const MODE_ORDER: MapTileMode[] = ['light', 'dark', 'satellite'];

const BASE_LAYERS: Record<MapTileMode, { source: 'google-road' | 'google-satellite'; paint?: RasterLayerSpecification['paint'] }> = {
  light: { source: 'google-road' },
  // Google không có tile tối miễn phí → đảo độ sáng + bỏ màu bản đồ đường để ra nền tối cho phòng điều phối.
  dark: {
    source: 'google-road',
    paint: {
      'raster-brightness-min': 0.92,
      'raster-brightness-max': 0.08,
      'raster-saturation': -0.85,
      'raster-contrast': 0.1,
    },
  },
  satellite: { source: 'google-satellite' },
};

export const baseLayerId = (mode: MapTileMode) => `base-${mode}`;

/**
 * Một style chứa sẵn cả 3 lớp nền; đổi lớp chỉ bật/tắt visibility (applyTileMode)
 * thay vì setStyle() — tránh tải lại style và lỗi diff khi các style trùng id source.
 */
export const createBaseMapStyle = (initialMode: MapTileMode): StyleSpecification => ({
  version: 8,
  sources: {
    'google-road': googleSource('m'),
    'google-satellite': googleSource('y'),
  },
  layers: MODE_ORDER.map((mode) => ({
    id: baseLayerId(mode),
    type: 'raster' as const,
    source: BASE_LAYERS[mode].source,
    // Style spec bắt buộc paint là object — `paint: undefined` làm cả style bị từ chối (bản đồ trắng).
    paint: BASE_LAYERS[mode].paint ?? {},
    layout: { visibility: mode === initialMode ? ('visible' as const) : ('none' as const) },
  })),
});

export function applyTileMode(map: mapboxgl.Map, mode: MapTileMode) {
  MODE_ORDER.forEach((m) => map.setLayoutProperty(baseLayerId(m), 'visibility', m === mode ? 'visible' : 'none'));
}

interface MapLayerToggleProps {
  mode: MapTileMode;
  onChange: (mode: MapTileMode) => void;
}

// Thứ tự nút giống bản đồ Staff: Vệ tinh · CAD tối · Đường phố.
const PILL_ORDER: MapTileMode[] = ['satellite', 'dark', 'light'];

/** Ba nút chọn lớp nền (cùng kiểu với bản đồ Staff). */
export const MapLayerToggle: React.FC<MapLayerToggleProps> = ({ mode, onChange }) => {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t('liveMap.layers.toggle')}
      className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-xl flex items-center gap-1"
    >
      {PILL_ORDER.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono-data font-bold uppercase transition-all ${
            mode === m ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {t(`liveMap.layers.${m}`)}
        </button>
      ))}
    </div>
  );
};
