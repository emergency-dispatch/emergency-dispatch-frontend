import React from 'react';
import { Layers } from 'lucide-react';
import type mapboxgl from 'mapbox-gl';
import type { RasterLayerSpecification, StyleSpecification } from 'mapbox-gl';

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

const MODE_LABELS: Record<MapTileMode, string> = {
  light: 'Sáng',
  dark: 'Tối',
  satellite: 'Vệ tinh',
};

interface MapLayerToggleProps {
  mode: MapTileMode;
  onChange: (mode: MapTileMode) => void;
}

export const MapLayerToggle: React.FC<MapLayerToggleProps> = ({ mode, onChange }) => {
  const handleClick = () => {
    const nextIndex = (MODE_ORDER.indexOf(mode) + 1) % MODE_ORDER.length;
    onChange(MODE_ORDER[nextIndex]);
  };

  return (
    <button
      onClick={handleClick}
      className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-md transition-all active:scale-95"
      title={`Đổi lớp bản đồ (Hiện tại: ${MODE_LABELS[mode]})`}
      aria-label="Đổi lớp bản đồ"
    >
      <Layers className="w-5 h-5" />
    </button>
  );
};
