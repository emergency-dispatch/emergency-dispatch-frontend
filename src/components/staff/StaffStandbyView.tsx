import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Radio,
  RefreshCw,
  Building2,
  User,
  Truck,
  ShieldCheck,
  Clock,
  History,
  MapPin,
  ExternalLink,
  Layers,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import type { StaffProfile, StaffMission } from '../../types/staff';
import {
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_REALISTIC_STYLE,
  MAPBOX_DARK_STYLE,
  MAPBOX_STREETS_STYLE,
} from '../../services/mapboxService';

interface StaffStandbyViewProps {
  profile: StaffProfile;
  loading: boolean;
  onRefresh: () => void;
  completedMissions: StaffMission[];
  onSelectMission?: (mission: StaffMission) => void;
  onOpenHistory?: () => void;
}

type MapLayerMode = 'satellite' | 'dark' | 'streets';

export const StaffStandbyView: React.FC<StaffStandbyViewProps> = ({
  profile,
  loading,
  onRefresh,
  completedMissions,
  onSelectMission,
  onOpenHistory,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [layerMode, setLayerMode] = useState<MapLayerMode>('satellite');
  const [is3DMode, setIs3DMode] = useState<boolean>(true);

  // Vị trí mặc định: Tọa độ trạm PCCC Khu Công nghệ cao TP.HCM hoặc vị trí kíp xe
  const standbyLat = 10.8452;
  const standbyLng = 106.7955;

  const getStyleForMode = (mode: MapLayerMode) => {
    switch (mode) {
      case 'dark':
        return MAPBOX_DARK_STYLE;
      case 'streets':
        return MAPBOX_STREETS_STYLE;
      case 'satellite':
      default:
        return MAPBOX_REALISTIC_STYLE;
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (MAPBOX_ACCESS_TOKEN) {
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: getStyleForMode(layerMode),
      center: [standbyLng, standbyLat],
      zoom: 15.5,
      pitch: is3DMode ? 45 : 0,
      bearing: 20,
      attributionControl: false,
    });

    map.on('error', (e) => {
      console.warn('Standby Mapbox notice:', e?.error?.message || e);
    });

    // Marker trạm trực chiến (Xanh lá sẵn sàng)
    const el = document.createElement('div');
    el.className = 'select-none cursor-pointer';
    el.innerHTML = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 50px; height: 50px; border-radius: 9999px; background: rgba(34, 197, 94, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 42px; height: 42px; border-radius: 9999px; background: #16A34A; border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.6); color: white;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div style="margin-top: 4px; white-space: nowrap; background: #0F172A; color: #FFFFFF; border: 1.5px solid #22C55E; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 11px; font-weight: 800; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 5px;">
          <span style="width: 7px; height: 7px; border-radius: 9999px; background: #22C55E; box-shadow: 0 0 8px #22C55E;"></span>
          <span>${profile.stationName || 'VỊ TRÍ TRỰC CHIẾN'}</span>
        </div>
      </div>
    `;

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([standbyLng, standbyLat])
      .addTo(map);

    mapRef.current = map;

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleSwitchLayer = (newMode: MapLayerMode) => {
    if (!mapRef.current) return;
    setLayerMode(newMode);
    mapRef.current.setStyle(getStyleForMode(newMode));
  };

  const handleToggle3D = () => {
    if (!mapRef.current) return;
    const nextState = !is3DMode;
    setIs3DMode(nextState);
    mapRef.current.easeTo({
      pitch: nextState ? 45 : 0,
      duration: 600,
    });
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
      {/* Left Column: Standby Telemetry & Unit Status (5 cols) */}
      <div className="lg:col-span-5 space-y-4 overflow-y-auto pr-1">
        {/* Card 1: Standby Operational Radar Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                TRỰC CHIẾN SẴN SÀNG (STANDBY)
              </span>
            </div>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              title="Kiểm tra lệnh điều phối mới từ máy chủ CAD"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Đang đồng bộ...' : 'Đồng bộ CAD'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Kíp Trực Sẵn Sàng Tiếp Nhận Lệnh Điều Động</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Hệ thống đang kết nối trực tuyến với Tổng đài Điều phối CAD qua SignalR. Khi có sự cố cứu nạn khẩn cấp phát lệnh tới đơn vị, còi hú cảnh báo và chỉ đường tác chiến sẽ tự động kích hoạt.
            </p>
          </div>
        </div>

        {/* Card 2: Unit & Staff Specifications */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-600" />
            <span>THÔNG TIN ĐƠN VỊ &amp; KÍP XE TÚC TRỰC</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Trạm trực thuộc</span>
              <p className="font-bold text-slate-900 truncate">{profile.stationName || 'Chưa phân trạm'}</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Phương tiện trực</span>
              <p className="font-mono font-bold text-red-600 text-sm truncate">{profile.vehiclePlate || 'Chưa gán xe'}</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Chỉ huy kíp trực</span>
              <p className="font-bold text-slate-900 truncate">{profile.name}</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Mã số thẻ ngành</span>
              <p className="font-mono font-bold text-slate-700 truncate">{profile.badgeNumber || 'Chưa cấp'}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              GPS: 10.8452° N, 106.7955° E
            </span>
            <span className="font-mono text-emerald-600 font-bold">12 VỆ TINH KHÓA</span>
          </div>
        </div>

        {/* Card 3: Recent Mission Archive (Real completed history) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              <span>NHẬT KÝ ĐIỀU PHỐI GẦN ĐÂY</span>
            </div>
            {completedMissions.length > 0 && onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
              >
                Xem tất cả ({completedMissions.length})
              </button>
            )}
          </div>

          {completedMissions.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span>Chưa có nhiệm vụ nào hoàn tất trong phiên làm việc này.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {completedMissions.slice(0, 3).map((m) => (
                <div
                  key={m.id}
                  onClick={() => onSelectMission?.(m)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-slate-50/80 transition-all cursor-pointer flex items-start justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                        #{m.incidentId}
                      </span>
                      <span className="font-bold text-slate-900 truncate">{m.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{m.address}</span>
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    Đã hoàn tất
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Standby Readiness Map (7 cols) */}
      <div className="lg:col-span-7 h-[500px] lg:h-[calc(100vh-130px)] lg:sticky lg:top-0 min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Top Floating Controls */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-white shadow-xl flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">TRỰC BAN VỊ TRÍ</div>
              <div className="text-xs font-mono font-bold text-emerald-400">
                {profile.stationName || 'TRẠM CỨU HỘ'} • {profile.vehiclePlate}
              </div>
            </div>
          </div>

          {/* Map style pills */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-xl flex items-center gap-1">
            <button
              onClick={() => handleSwitchLayer('satellite')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                layerMode === 'satellite' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              VỆ TINH
            </button>
            <button
              onClick={() => handleSwitchLayer('dark')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                layerMode === 'dark' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              CAD TỐI
            </button>
            <button
              onClick={() => handleSwitchLayer('streets')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                layerMode === 'streets' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ĐƯỜNG PHỐ
            </button>
          </div>
        </div>

        {/* 3D tilt switch */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleToggle3D}
            className={`p-2.5 rounded-xl border shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center font-mono font-bold text-xs ${
              is3DMode
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white/95 hover:bg-white text-slate-700 border-slate-200'
            }`}
            title="Đổi góc nghiêng 2D / 3D"
          >
            <Compass className={`w-5 h-5 ${is3DMode ? 'rotate-45 text-white' : ''}`} />
          </button>
        </div>

        {/* Bottom HUD Bar */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto z-10 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-xs font-mono text-slate-200 shadow-xl">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
            <span className="text-slate-400">TRẠNG THÁI:</span>
            <span className="font-bold text-emerald-400">TÚC TRỰC TẠI TRẠM SẴN SÀNG</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">ĐANG LẮNG NGHE TỔNG ĐÀI CAD 114</span>
          </div>
        </div>
      </div>
    </div>
  );
};
