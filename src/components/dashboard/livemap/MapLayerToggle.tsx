import React from 'react';
import { Layers } from 'lucide-react';
import type { Style } from 'mapbox-gl';
import { createRasterStyle } from '../../../services/mapboxService';

export type MapTileMode = 'light' | 'dark' | 'satellite';

const ESRI_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

// Esri Canvas chỉ có tile tới zoom 16 — mapbox-gl tự phóng to tile ở zoom cao hơn.
export const TILE_STYLES: Record<MapTileMode, Style> = {
  light: createRasterStyle(
    ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
    { attribution: ESRI_ATTRIBUTION, maxzoom: 16 }
  ),
  dark: createRasterStyle(
    ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
    { attribution: ESRI_ATTRIBUTION, maxzoom: 16 }
  ),
  satellite: createRasterStyle(
    ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    { attribution: ESRI_ATTRIBUTION, maxzoom: 19 }
  ),
};

const MODE_ORDER: MapTileMode[] = ['light', 'dark', 'satellite'];
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
