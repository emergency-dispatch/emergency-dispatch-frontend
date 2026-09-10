import React from 'react';
import { Layers } from 'lucide-react';

export type MapTileMode = 'light' | 'dark' | 'satellite';

export const TILE_URLS: Record<MapTileMode, string> = {
  light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
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
