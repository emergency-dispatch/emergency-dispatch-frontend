import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  AlertTriangle,
  Siren,
  MapPin,
  Clock,
  Phone,
  User,
  UserCheck,
  ShieldAlert,
  Flame,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import type { StaffMission } from '../../types/staff';
import { SEVERITY_META } from '../../data/incidentMock';
import { HazardTagBadge } from '../common/HazardTagBadge';
import { staffAudioService } from '../../services/staffAudioService';
import { MAPBOX_ACCESS_TOKEN, MAPBOX_REALISTIC_STYLE } from '../../services/mapboxService';
import { routingService } from '../../services/routingService';

import type { RejectionReason } from '../../types/dispatch';

interface StaffMissionAlertModalProps {
  mission: StaffMission;
  isOpen: boolean;
  onAccept: () => void;
  onDecline: (reason: RejectionReason, notes?: string) => void;
}

export const StaffMissionAlertModal: React.FC<StaffMissionAlertModalProps> = ({
  mission,
  isOpen,
  onAccept,
  onDecline,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(staffAudioService.getIsMuted());
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState<boolean>(false);
  const [declineReason, setDeclineReason] = useState<RejectionReason>('VehicleBreakdown');
  const [declineNotes, setDeclineNotes] = useState<string>('');
  const [declineError, setDeclineError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState<boolean>(false);

  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>(() => {
    if (mission.routePolyline && mission.routePolyline.length > 2) {
      return mission.routePolyline.map(([lat, lng]) => [lng, lat]);
    }
    if (mission.routeSteps && mission.routeSteps.length > 2) {
      return mission.routeSteps.map((s) => [s.lng, s.lat]);
    }
    if (mission.vehicleLng && mission.vehicleLat) {
      return [
        [mission.vehicleLng, mission.vehicleLat],
        [mission.incidentLng, mission.incidentLat],
      ];
    }
    return [];
  });

  const [routeEstimate, setRouteEstimate] = useState<{
    distanceKm: number;
    durationMinutes: number;
  } | null>(() => {
    if (mission.routeSteps && mission.routeSteps.length > 0) {
      const dist = mission.routeSteps.reduce((acc, s) => acc + s.distanceMeters, 0);
      const dur = mission.routeSteps.reduce((acc, s) => acc + s.durationSeconds, 0);
      if (dist > 0) {
        return {
          distanceKm: Math.round((dist / 1000) * 10) / 10,
          durationMinutes: Math.max(1, Math.round(dur / 60)),
        };
      }
    }
    return null;
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!isOpen) {
      staffAudioService.stopEmergencySiren();
      setIsDeclineDialogOpen(false);
      setDeclineNotes('');
      setDeclineError(null);
      setIsAccepting(false);
      return;
    }

    staffAudioService.playEmergencySiren();

    return () => {
      staffAudioService.stopEmergencySiren();
    };
  }, [isOpen, mission.id]);

  // Tự động tính toán tuyến đường giao thông thực tế nếu chưa có hoặc mới chỉ có 2 điểm thẳng
  useEffect(() => {
    if (!isOpen || !mission.vehicleLat || !mission.vehicleLng || !mission.incidentLat || !mission.incidentLng) return;

    if (mission.routePolyline && mission.routePolyline.length > 2) {
      setRouteCoordinates(mission.routePolyline.map(([lat, lng]) => [lng, lat]));
      if (mission.routeSteps && mission.routeSteps.length > 0) {
        const dist = mission.routeSteps.reduce((acc, s) => acc + s.distanceMeters, 0);
        const dur = mission.routeSteps.reduce((acc, s) => acc + s.durationSeconds, 0);
        setRouteEstimate({
          distanceKm: Math.round((dist / 1000) * 10) / 10,
          durationMinutes: Math.max(1, Math.round(dur / 60)),
        });
      }
      return;
    }

    let isMounted = true;
    routingService
      .calculateDrivingRoute([mission.vehicleLat, mission.vehicleLng], [mission.incidentLat, mission.incidentLng])
      .then((res) => {
        if (!isMounted) return;
        if (res.polyline && res.polyline.length > 0) {
          setRouteCoordinates(res.polyline.map(([lat, lng]) => [lng, lat]));
        }
        setRouteEstimate({
          distanceKm: Math.round((res.totalDistanceMeters / 1000) * 10) / 10,
          durationMinutes: Math.max(1, Math.round(res.totalDurationSeconds / 60)),
        });
      })
      .catch((err) => {
        console.warn('Staff mission alert driving route notice:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    mission.id,
    mission.vehicleLat,
    mission.vehicleLng,
    mission.incidentLat,
    mission.incidentLng,
    mission.routePolyline,
    mission.routeSteps,
  ]);

  // Helper vẽ tuyến đường thực tế (Solid Line + Glow dưới)
  const applyRouteToMap = (currentMap: mapboxgl.Map, coords: [number, number][]) => {
    if (coords.length < 2) return;
    try {
      const geojsonData: any = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
      };

      const existingSource = currentMap.getSource('alert-route') as mapboxgl.GeoJSONSource | undefined;
      if (existingSource) {
        existingSource.setData(geojsonData);
      } else {
        currentMap.addSource('alert-route', {
          type: 'geojson',
          data: geojsonData,
        });

        // 1. Viền đỏ phát sáng (Glow aura underlay)
        currentMap.addLayer({
          id: 'alert-route-glow',
          type: 'line',
          source: 'alert-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#EF4444',
            'line-width': 8,
            'line-opacity': 0.45,
            'line-blur': 2.5,
          },
        });

        // 2. Tuyến đường thực địa liền mạch, sắc nét (Solid tactical line - không đứt chân chim)
        currentMap.addLayer({
          id: 'alert-route-line',
          type: 'line',
          source: 'alert-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#DC2626',
            'line-width': 4.5,
            'line-opacity': 0.95,
          },
        });
      }

      // Tự động căn khung hình (fit bounds) chứa trọn cả xe và hiện trường
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((c) => bounds.extend(c));
      currentMap.fitBounds(bounds, {
        padding: { top: 30, bottom: 30, left: 30, right: 30 },
        maxZoom: 16,
        duration: 500,
      });
    } catch (err) {
      console.warn('Alert route render notice:', err);
    }
  };

  // Khởi tạo Mapbox Tactical Mini Preview
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (MAPBOX_ACCESS_TOKEN) {
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_REALISTIC_STYLE,
      center: [mission.incidentLng, mission.incidentLat],
      zoom: 14.8,
      pitch: 35,
      attributionControl: false,
      scrollZoom: false,
    });

    map.on('error', (e) => {
      console.warn('Staff Alert Mapbox notice:', e?.error?.message || e);
    });

    map.on('load', () => {
      map.resize();
      applyRouteToMap(map, routeCoordinates);
    });

    map.on('style.load', () => {
      applyRouteToMap(map, routeCoordinates);
    });

    // Marker mục tiêu sự cố với hiệu ứng radar ping
    const incidentEl = document.createElement('div');
    incidentEl.className = 'cursor-pointer select-none';
    incidentEl.innerHTML = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background: rgba(220, 38, 38, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 32px; height: 32px; border-radius: 9999px; background: #DC2626; border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px rgba(220, 38, 38, 0.8); color: white;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
          </svg>
        </div>
      </div>
    `;
    new mapboxgl.Marker({ element: incidentEl })
      .setLngLat([mission.incidentLng, mission.incidentLat])
      .addTo(map);

    // Marker kíp xe xuất phát
    if (mission.vehicleLng && mission.vehicleLat) {
      const vehEl = document.createElement('div');
      vehEl.className = 'cursor-pointer select-none';
      vehEl.innerHTML = `
        <div style="width: 28px; height: 28px; border-radius: 9999px; background: #0F172A; border: 2px solid #22C55E; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>
      `;
      new mapboxgl.Marker({ element: vehEl })
        .setLngLat([mission.vehicleLng, mission.vehicleLat])
        .addTo(map);
    }

    const t1 = setTimeout(() => map.resize(), 150);
    const t2 = setTimeout(() => map.resize(), 450);

    mapRef.current = map;

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
      mapRef.current = null;
    };
  }, [isOpen, mission.incidentLng, mission.incidentLat, mission.vehicleLng, mission.vehicleLat]);

  // Cập nhật tuyến đường khi routeCoordinates được tính toán xong
  useEffect(() => {
    if (!isOpen || !mapRef.current || routeCoordinates.length < 2) return;
    const map = mapRef.current;
    if (map.isStyleLoaded()) {
      applyRouteToMap(map, routeCoordinates);
    }
  }, [isOpen, routeCoordinates]);

  if (!isOpen) return null;

  const severityMeta = SEVERITY_META[mission.severity];

  const toggleSound = () => {
    const nextState = !isMuted;
    staffAudioService.setMuted(nextState);
    setIsMuted(nextState);
  };

  const handleAccept = () => {
    if (isAccepting) return;
    setIsAccepting(true);
    staffAudioService.stopEmergencySiren();
    staffAudioService.playSuccessChime();
    onAccept();
  };

  const handleConfirmDecline = () => {
    if (declineReason === 'Other' && declineNotes.trim().length < 5) {
      setDeclineError('Khi chọn "Lý do khác", bắt buộc nhập ghi chú tối thiểu 5 ký tự (theo quy định BR-22).');
      return;
    }
    setDeclineError(null);
    staffAudioService.stopEmergencySiren();
    onDecline(declineReason, declineNotes.trim() || undefined);
  };

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white border-2 border-red-600 rounded-2xl shadow-2xl overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">
        {/* Flashing Top Siren Header */}
        <div className="relative bg-red-600 px-4 sm:px-6 py-3.5 flex items-center justify-between overflow-hidden shadow-md text-white">
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white/20 rounded-xl animate-bounce">
              <Siren className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono font-black tracking-widest text-red-100 flex items-center gap-1.5">
                  {mission.isAiDispatched && <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />}
                  {mission.isAiDispatched ? 'LỆNH TỰ ĐIỀU ĐỘNG TỪ AI' : 'LỆNH ĐIỀU ĐỘNG TỔNG ĐÀI CAD'}
                </span>
                <span className="px-2 py-0.5 rounded bg-black/20 text-[11px] font-mono font-bold text-white">
                  #{mission.incidentId}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                Phân Công Nhiệm Vụ Cứu Nạn
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button
              onClick={toggleSound}
              className="p-2 rounded-lg bg-black/20 hover:bg-black/30 text-white transition-all cursor-pointer"
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-white/70" /> : <Volume2 className="w-5 h-5 text-white animate-pulse" />}
            </button>
            <div className="px-3 py-1 bg-black/25 rounded-lg text-center font-mono">
              <div className="text-[10px] text-red-100 uppercase font-bold">Trạng thái</div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Chờ phản hồi
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-white">
          {/* Incident Title & Severity */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-mono-data font-bold flex items-center gap-1.5 border ${severityMeta.badgeClass}`}>
                <ShieldAlert className="w-3.5 h-3.5" />
                MỨC ĐỘ NGUY HIỂM: CẤP {mission.severity} ({severityMeta.label})
              </span>
              <span className="text-xs text-slate-500 font-mono-data">
                Sự cố #{mission.incidentId}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900">{mission.title}</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{mission.description}</p>

            {/* Hazard Tags */}
            <div className="pt-2 flex flex-wrap gap-1.5">
              {mission.hazardTags.map((tag) => (
                <HazardTagBadge key={tag} tag={tag} size="sm" />
              ))}
            </div>
          </div>

          {/* Mapbox Tactical Radar Mini Preview */}
          <div className="relative w-full h-[160px] sm:h-[180px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950">
            <div ref={mapContainerRef} className="w-full h-full" />

            <div className="absolute top-2.5 left-2.5 z-10 px-2 py-1 rounded-md bg-slate-900/85 backdrop-blur-xs border border-slate-800 text-[10px] font-mono text-slate-300 flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span>RADAR KHẨN CẤP HIỆN TRƯỜNG</span>
            </div>

            <div className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-white/90">
              {mission.incidentLat.toFixed(4)}° N, {mission.incidentLng.toFixed(4)}° E
            </div>
          </div>

          {/* Location & Navigation Estimate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-semibold uppercase font-mono-data">Địa Điểm Sự Cố</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 pl-5">{mission.address}</div>
              <div className="text-xs text-slate-500 pl-5">Khu vực: <span className="text-red-600 font-medium">{mission.area}</span></div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="font-semibold uppercase font-mono-data">Lộ Trình Ước Tính</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 pl-5 flex items-center gap-3">
                <span className="text-red-600 font-mono-data font-bold text-base">
                  ~{routeEstimate ? `${routeEstimate.distanceKm} km` : '1.4 km'}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-800 font-mono-data font-bold text-base">
                  ~{routeEstimate ? `${routeEstimate.durationMinutes} Phút` : '4 - 6 Phút'}
                </span>
              </div>
              <div className="text-xs text-slate-500 pl-5">Tuyến đường tối ưu nhất theo mạng lưới giao thông</div>
            </div>
          </div>

          {/* Dispatcher & Reporter info */}
          <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              {mission.isAiDispatched || mission.dispatcherName === 'AI tự điều phối' ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 border border-purple-300 font-bold font-mono text-[11px] shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse shrink-0" />
                  <span>AI TỰ ĐIỀU PHỐI</span>
                </div>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="text-slate-600 truncate">
                    Điều phối: <strong className="text-slate-900">{mission.dispatcherName || 'Điều phối viên CAD'}</strong>
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-slate-600 truncate">
                  Báo tin: <strong className="text-slate-900">{mission.callerName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Phone className="w-3.5 h-3.5 text-red-600" />
                <a href={`tel:${mission.callerPhone}`} className="text-red-600 font-mono-data font-bold hover:underline">
                  {mission.callerPhone}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons or Decline Reason Form */}
        {isDeclineDialogOpen ? (
          <div className="p-4 bg-amber-50/70 border-t border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase font-mono">
                Xác Nhận Lý Do Từ Chối Lệnh Điều Phối (Quy định BR-22)
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsDeclineDialogOpen(false);
                  setDeclineError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
              >
                Hủy
              </button>
            </div>

            {declineError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {declineError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Lý do từ chối (Bắt buộc):</label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value as RejectionReason)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 font-medium"
              >
                <option value="VehicleBreakdown">Phương tiện gặp sự cố kỹ thuật / hỏng hóc (chuyển sang Bảo trì)</option>
                <option value="AlreadyOnMission">Đang xử lý nhiệm vụ khẩn cấp khác tại hiện trường</option>
                <option value="TooFar">Quá xa vùng tiếp cận, thời gian di chuyển vượt ngưỡng</option>
                <option value="MedicalLeave">Lý do sức khỏe / y tế cán bộ kíp trực</option>
                <option value="Other">Lý do khác (yêu cầu ghi chú cụ thể tối thiểu 5 ký tự)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Ghi chú chi tiết cho Tổng đài CAD:</label>
              <textarea
                rows={2}
                value={declineNotes}
                onChange={(e) => setDeclineNotes(e.target.value)}
                placeholder="Ghi rõ chi tiết lý do từ chối lệnh để Operator nắm tình hình..."
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsDeclineDialogOpen(false);
                  setDeclineError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Xác Nhận Từ Chối Lệnh
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => setIsDeclineDialogOpen(true)}
              className="w-full sm:w-1/3 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <XCircle className="w-4 h-4 text-slate-500" />
              Từ Chối Lệnh
            </button>

            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full sm:w-2/3 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold shadow-md shadow-red-600/20 border border-red-600 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className={`w-5 h-5 text-white ${isAccepting ? 'animate-spin' : 'animate-pulse'}`} />
              {isAccepting ? 'Đang tiếp nhận...' : 'Tiếp Nhận Nhiệm Vụ Ngay'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
