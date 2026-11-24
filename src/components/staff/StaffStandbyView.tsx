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
  Sparkles,
  Car,
  Shield,
} from 'lucide-react';
import type { StaffProfile, StaffMission } from '../../types/staff';
import { StaffTrafficTaskCard, type ActiveTrafficTask } from './StaffTrafficTaskCard';
import type { ServiceAreaDto } from '../../services/liveMapService';
import { circlePolygon } from '../operator/livemap/MapServiceAreaLayer';
import {
  MAPBOX_ACCESS_TOKEN,
  createStaffBaseMapStyle,
  applyStaffMapLayerMode,
} from '../../services/mapboxService';
import { formatShortId, formatCrewRole } from '../../utils/incidentFormat';

interface StaffStandbyViewProps {
  profile: StaffProfile;
  loading: boolean;
  onRefresh: () => void;
  completedMissions: StaffMission[];
  activeTrafficTask?: ActiveTrafficTask | null;
  onResolveTrafficTask?: (hotspotId: string, note?: string) => Promise<boolean>;
  onOpenReportTrafficModal?: () => void;
  serviceArea?: ServiceAreaDto | null;
  onSelectMission?: (mission: StaffMission) => void;
  onOpenHistory?: () => void;
}

type MapLayerMode = 'satellite' | 'dark' | 'streets';

export const StaffStandbyView: React.FC<StaffStandbyViewProps> = ({
  profile,
  loading,
  onRefresh,
  completedMissions,
  activeTrafficTask,
  onResolveTrafficTask,
  onOpenReportTrafficModal,
  serviceArea,
  onSelectMission,
  onOpenHistory,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const trafficMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [layerMode, setLayerMode] = useState<MapLayerMode>('satellite');
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // BR-27: 5 phút hồi sức xe sau khi hoàn tất nghiệm thu nhiệm vụ
  useEffect(() => {
    const calculateCooldown = () => {
      if (!completedMissions || completedMissions.length === 0) {
        setCooldownSeconds(0);
        return;
      }
      const sorted = [...completedMissions].sort((a, b) => {
        const tA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const tB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return tB - tA;
      });
      const latestMission = sorted[0];
      if (!latestMission?.completedAt) {
        setCooldownSeconds(0);
        return;
      }
      const completedTime = new Date(latestMission.completedAt).getTime();
      if (isNaN(completedTime)) {
        setCooldownSeconds(0);
        return;
      }
      const diffSeconds = Math.floor((Date.now() - completedTime) / 1000);
      const remaining = Math.max(0, 300 - diffSeconds); // 5 minutes = 300s
      setCooldownSeconds(remaining);
    };

    calculateCooldown();
    const timer = setInterval(calculateCooldown, 1000);
    return () => clearInterval(timer);
  }, [completedMissions]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Vị trí mặc định: Tọa độ trạm PCCC Khu Công nghệ cao TP.HCM hoặc vị trí kíp xe
  const standbyLat = 10.8452;
  const standbyLng = 106.7955;

  // Helper để thêm/cập nhật GeoJSON Ranh giới phục vụ của Trạm
  const setupServiceAreaLayer = React.useCallback((map: mapboxgl.Map, area: ServiceAreaDto | null | undefined) => {
    const SOURCE_ID = 'standby-service-area-source';
    const FILL_ID = 'standby-service-area-fill';
    const LINE_ID = 'standby-service-area-line';

    const addOrUpdate = () => {
      try {
        const featureCollection = {
          type: 'FeatureCollection' as const,
          features:
            area && area.enabled && area.radiusKm > 0
              ? [
                {
                  type: 'Feature' as const,
                  properties: { name: area.name ?? 'Ranh giới phục vụ trạm' },
                  geometry: {
                    type: 'Polygon' as const,
                    coordinates: [circlePolygon(area.centerLat, area.centerLng, area.radiusKm)],
                  },
                },
              ]
              : [],
        };

        if (!map.getSource(SOURCE_ID)) {
          map.addSource(SOURCE_ID, {
            type: 'geojson',
            data: featureCollection,
          });

          if (!map.getLayer(FILL_ID)) {
            map.addLayer({
              id: FILL_ID,
              type: 'fill',
              source: SOURCE_ID,
              paint: {
                'fill-color': '#2563EB',
                'fill-opacity': 0.08,
              },
            });
          }

          if (!map.getLayer(LINE_ID)) {
            map.addLayer({
              id: LINE_ID,
              type: 'line',
              source: SOURCE_ID,
              paint: {
                'line-color': '#3B82F6',
                'line-width': 2.2,
                'line-opacity': 0.85,
                'line-dasharray': [3, 2],
              },
            });
          }
        } else {
          const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
          src.setData(featureCollection);

          if (!map.getLayer(FILL_ID)) {
            map.addLayer({
              id: FILL_ID,
              type: 'fill',
              source: SOURCE_ID,
              paint: {
                'fill-color': '#2563EB',
                'fill-opacity': 0.08,
              },
            });
          }

          if (!map.getLayer(LINE_ID)) {
            map.addLayer({
              id: LINE_ID,
              type: 'line',
              source: SOURCE_ID,
              paint: {
                'line-color': '#3B82F6',
                'line-width': 2.2,
                'line-opacity': 0.85,
                'line-dasharray': [3, 2],
              },
            });
          }
        }
      } catch (err) {
        console.warn('Standby Mapbox service area layer warning:', err);
      }
    };

    if (map.isStyleLoaded()) {
      addOrUpdate();
    } else {
      map.once('idle', addOrUpdate);
    }
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (MAPBOX_ACCESS_TOKEN) {
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: createStaffBaseMapStyle(layerMode),
      center: [standbyLng, standbyLat],
      zoom: 15.5,
      pitch: is3DMode ? 45 : 0,
      bearing: 20,
      attributionControl: false,
    });

    map.on('error', (e) => {
      console.warn('Standby Mapbox notice:', e?.error?.message || e);
    });

    const ensureLayer = () => {
      setupServiceAreaLayer(map, serviceArea);
    };

    map.on('load', ensureLayer);
    map.on('style.load', ensureLayer);
    map.on('idle', ensureLayer);

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
      if (trafficMarkerRef.current) {
        trafficMarkerRef.current.remove();
        trafficMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Cập nhật Service Area khi prop thay đổi
  useEffect(() => {
    if (mapRef.current) {
      setupServiceAreaLayer(mapRef.current, serviceArea);
    }
  }, [serviceArea, setupServiceAreaLayer]);

  // Cập nhật hoặc tạo Marker Điểm nghẽn giao thông (Traffic Hotspot Marker) trên bản đồ Standby
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!activeTrafficTask) {
      if (trafficMarkerRef.current) {
        trafficMarkerRef.current.remove();
        trafficMarkerRef.current = null;
      }
      return;
    }

    const { latitude, longitude, title, locationAddress, congestionLevelName, congestionLevel, taskNotes } =
      activeTrafficTask;
    if (!latitude || !longitude) return;

    const isSevere =
      congestionLevel === 'Blocked' ||
      congestionLevel === 'Severe' ||
      congestionLevelName === 'Blocked' ||
      congestionLevelName === 'Severe';
    const color = isSevere ? '#DC2626' : '#EA580C';
    const badgeText = isSevere ? 'TẮC NGHẼN NẶNG' : 'ÙN TẮC GIAO THÔNG';

    if (!trafficMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'cursor-pointer select-none';
      el.style.zIndex = '7';
      el.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: auto;">
          <div style="position: absolute; width: 48px; height: 48px; border-radius: 9999px; background: ${color}50; animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          
          <div style="width: 38px; height: 38px; border-radius: 12px; background: ${color}; border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px ${color}80; color: white;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          </div>

          <div style="margin-top: 4px; white-space: nowrap; background: #0F172A; color: #FDBA74; border: 1.5px solid ${color}; padding: 2px 7px; border-radius: 6px; font-family: monospace; font-size: 10px; font-weight: 800; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 4px;">
            <span style="width: 6px; height: 6px; border-radius: 9999px; background: ${color}; box-shadow: 0 0 6px ${color};"></span>
            <span>${badgeText}</span>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: true }).setHTML(`
        <div class="p-1 font-mono text-xs max-w-xs">
          <div class="font-bold text-amber-600 text-sm flex items-center gap-1.5">
            <span class="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">NHIỆM VỤ GIẢI TỎA</span>
            <span>${title}</span>
          </div>
          <div class="text-slate-800 mt-1 font-sans text-xs font-semibold">${locationAddress || 'Vị trí điểm nghẽn'}</div>
          ${taskNotes ? `<div class="text-slate-600 mt-1 text-[11px] font-sans bg-amber-50 p-1.5 rounded border border-amber-200">📌 ${taskNotes}</div>` : ''}
          <div class="text-slate-500 mt-1 text-[11px] font-mono">${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E</div>
        </div>
      `);

      el.addEventListener('click', () => {
        map.flyTo({
          center: [longitude, latitude],
          zoom: 16.5,
          duration: 700,
        });
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .setPopup(popup)
        .addTo(map);

      trafficMarkerRef.current = marker;
    } else {
      trafficMarkerRef.current.setLngLat([longitude, latitude]);
    }
  }, [activeTrafficTask]);

  const handleSwitchLayer = (newMode: MapLayerMode) => {
    if (!mapRef.current) return;
    setLayerMode(newMode);
    applyStaffMapLayerMode(mapRef.current, newMode);
    if (serviceArea) {
      setupServiceAreaLayer(mapRef.current, serviceArea);
    }
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
        {/* Active Traffic Task (Mục 20: Nhiệm vụ giải tỏa điểm nghẽn) */}
        {activeTrafficTask && onResolveTrafficTask && (
          <StaffTrafficTaskCard
            task={activeTrafficTask}
            onResolve={onResolveTrafficTask}
          />
        )}

        {/* Card 1: Standby Operational Radar Banner / BR-27 CoolDown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {cooldownSeconds > 0 ? (
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500" />
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700">
                  HỒI SỨC XE ({formatTimer(cooldownSeconds)})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                  TRỰC CHIẾN SẴN SÀNG (STANDBY)
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {onOpenReportTrafficModal && (
                <button
                  type="button"
                  onClick={onOpenReportTrafficModal}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-all cursor-pointer"
                  title="Báo cáo điểm nghẽn hoặc chướng ngại vật giao thông (POST /api/traffic/report)"
                >
                  <Car className="w-3.5 h-3.5 text-amber-600" />
                  <span>Báo Kẹt Xe</span>
                </button>
              )}

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
          </div>

          {cooldownSeconds > 0 ? (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 text-amber-950 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                  <Clock className="w-5 h-5 text-amber-600 animate-spin" />
                  <span>Phương Tiện Đang Trong Thời Gian Hồi Sức</span>
                </div>
                <span className="font-mono text-sm font-black px-2.5 py-0.5 bg-amber-200 text-amber-950 rounded-lg border border-amber-300">
                  {formatTimer(cooldownSeconds)}
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Theo quy định: Sau khi tổ hoàn tất nghiệm thu ca sự cố, toàn bộ phương tiện ({profile.teamPlates?.length ? profile.teamPlates.join(', ') : (profile.vehiclePlate || 'xe kíp trực')}) tự động bước vào <strong>5 phút CoolDown</strong> để bảo dưỡng trang bị, nạp dưỡng khí và kiểm tra sẵn sàng trước khi CAD phát lệnh mới.
              </p>
              <div className="w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-600 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.max(0, Math.min(100, ((300 - cooldownSeconds) / 300) * 100))}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Kíp Trực Sẵn Sàng Tiếp Nhận Lệnh Điều Động</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Hệ thống đang kết nối trực tuyến với Tổng đài Điều phối CAD qua SignalR. Khi có sự cố cứu nạn khẩn cấp phát lệnh tới đơn vị, còi hú cảnh báo và chỉ đường tác chiến sẽ tự động kích hoạt.
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Unit & Staff Specifications */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <span>THÔNG TIN ĐƠN VỊ &amp; KÍP XE TÚC TRỰC</span>
            </div>
            {profile.teamName && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">
                {profile.teamName}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Trạm trực thuộc</span>
              <p className="font-bold text-slate-900 truncate">{profile.stationName || 'Chưa phân trạm'}</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Phương tiện trực</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {profile.teamPlates && profile.teamPlates.length > 0 ? (
                  profile.teamPlates.map((plate) => (
                    <span key={plate} className="font-mono font-bold text-red-600 text-xs px-1.5 py-0.5 bg-red-50 border border-red-200 rounded">
                      {plate}
                    </span>
                  ))
                ) : (
                  <span className="font-mono font-bold text-red-600 text-xs truncate">
                    {profile.vehiclePlate || 'Chưa gán xe'}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">
                {profile.crewRole?.toLowerCase() === 'commander' ? 'Chỉ huy kíp trực' : 'Cán bộ trực ban'}
              </span>
              <p className="font-bold text-slate-900 truncate">{profile.name}</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Vai trò / Thẻ ngành</span>
              <p className="font-mono font-bold text-slate-700 truncate">
                {formatCrewRole(profile.crewRole || profile.role) ? `${formatCrewRole(profile.crewRole || profile.role)} • ` : ''}{profile.badgeNumber || 'Chưa cấp'}
              </p>
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
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
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700" title={m.incidentId}>
                        {formatShortId(m.incidentCode || m.incidentId)}
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
        <div className="absolute top-4 left-4 right-16 sm:right-20 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-white shadow-xl pointer-events-auto flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400">TRỰC BAN VỊ TRÍ</div>
              <div className="text-xs font-mono font-bold text-emerald-400">
                {profile.stationName || 'TRẠM CỨU HỘ'} • {profile.vehiclePlate}
              </div>
            </div>
          </div>

          {/* Map style pills */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-xl pointer-events-auto flex items-center gap-1">
            <button
              onClick={() => handleSwitchLayer('satellite')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${layerMode === 'satellite' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              VỆ TINH
            </button>
            <button
              onClick={() => handleSwitchLayer('dark')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${layerMode === 'dark' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              CAD TỐI
            </button>
            <button
              onClick={() => handleSwitchLayer('streets')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${layerMode === 'streets' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              ĐƯỜNG PHỐ
            </button>
          </div>

          {/* Service Area Geofence Pill */}
          {serviceArea && serviceArea.enabled && serviceArea.radiusKm > 0 && (
            <div
              className="hidden sm:flex bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-2.5 py-1.5 text-blue-300 text-xs font-mono font-bold items-center gap-1.5 shadow-xl max-w-[220px] md:max-w-[260px] xl:max-w-[320px] pointer-events-auto shrink min-w-0"
              title={`Ranh giới trạm: ${serviceArea.name || `${serviceArea.radiusKm} km`}`}
            >
              <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate whitespace-nowrap">
                RANH GIỚI TRẠM: {serviceArea.name || `${serviceArea.radiusKm} km`}
              </span>
            </div>
          )}

          {/* Quick Fly-to Traffic Hotspot Button (Mục 20) */}
          {activeTrafficTask && (
            <button
              type="button"
              onClick={() => {
                if (mapRef.current && activeTrafficTask.longitude && activeTrafficTask.latitude) {
                  mapRef.current.flyTo({
                    center: [activeTrafficTask.longitude, activeTrafficTask.latitude],
                    zoom: 16.5,
                    duration: 700,
                  });
                }
              }}
              className="bg-amber-500 hover:bg-amber-400 border border-amber-300 rounded-xl px-2.5 py-1.5 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xl cursor-pointer active:scale-95 transition-all pointer-events-auto shrink min-w-0"
              title="Bấm để bay camera tới điểm kẹt xe cần giải tỏa"
            >
              <Car className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span className="max-w-[130px] truncate whitespace-nowrap">KẸT XE: {activeTrafficTask.title}</span>
            </button>
          )}
        </div>

        {/* 3D tilt switch */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={handleToggle3D}
            className={`p-2.5 rounded-xl border shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center font-mono font-bold text-xs ${is3DMode
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
            <span className="text-slate-300">ĐANG LẮNG NGHE TỔNG ĐÀI CAD</span>
          </div>

          {serviceArea && serviceArea.enabled && serviceArea.radiusKm > 0 && (
            <div className="flex sm:hidden items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-950/90 border border-blue-700/80 backdrop-blur-md text-[11px] font-mono text-blue-200 shadow-xl">
              <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>VÙNG PHỤC VỤ: {serviceArea.radiusKm} KM</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
