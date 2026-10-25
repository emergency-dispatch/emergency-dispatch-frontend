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
  ShieldAlert,
  Flame,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { StaffMission } from '../../types/staff';
import { SEVERITY_META } from '../../data/incidentMock';
import { HazardTagBadge } from '../common/HazardTagBadge';
import { staffAudioService } from '../../services/staffAudioService';
import { MAPBOX_ACCESS_TOKEN, MAPBOX_REALISTIC_STYLE } from '../../services/mapboxService';

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

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!isOpen) {
      staffAudioService.stopEmergencySiren();
      setIsDeclineDialogOpen(false);
      setDeclineNotes('');
      setDeclineError(null);
      return;
    }

    staffAudioService.playEmergencySiren();

    return () => {
      staffAudioService.stopEmergencySiren();
    };
  }, [isOpen, mission.id]);

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

    const addAlertRoute = () => {
      try {
        if (!map.getSource('alert-route') && mission.vehicleLng && mission.vehicleLat) {
          map.addSource('alert-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  [mission.vehicleLng, mission.vehicleLat],
                  [mission.incidentLng, mission.incidentLat],
                ],
              },
            },
          });

          map.addLayer({
            id: 'alert-route-line',
            type: 'line',
            source: 'alert-route',
            paint: {
              'line-color': '#DC2626',
              'line-width': 3,
              'line-dasharray': [2, 2],
            },
          });
        }
      } catch (err) {
        console.warn('Alert route notice:', err);
      }
    };

    map.on('load', () => {
      map.resize();
      addAlertRoute();
    });

    map.on('style.load', () => {
      addAlertRoute();
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

  if (!isOpen) return null;

  const severityMeta = SEVERITY_META[mission.severity];

  const toggleSound = () => {
    const nextState = !isMuted;
    staffAudioService.setMuted(nextState);
    setIsMuted(nextState);
  };

  const handleAccept = () => {
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
                <span className="text-xs uppercase font-mono font-black tracking-widest text-red-100">
                  LỆNH ĐIỀU ĐỘNG TỔNG ĐÀI CAD 114
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
                <span className="text-red-600 font-mono-data font-bold text-base">~1.4 km</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-800 font-mono-data font-bold text-base">~4 - 6 Phút</span>
              </div>
              <div className="text-xs text-slate-500 pl-5">Tuyến đường tối ưu nhất đã được định tuyến</div>
            </div>
          </div>

          {/* Reporter info & CAD notes */}
          <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-600" />
              <span className="text-slate-600">Người báo: <strong className="text-slate-900">{mission.callerName}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-red-600" />
              <a href={`tel:${mission.callerPhone}`} className="text-red-600 font-mono-data font-bold hover:underline">
                {mission.callerPhone}
              </a>
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
              Từ Chối Lệnh (BR-22)
            </button>

            <button
              onClick={handleAccept}
              className="w-full sm:w-2/3 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base font-bold shadow-md shadow-red-600/20 border border-red-600 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-white animate-pulse" />
              Tiếp Nhận Nhiệm Vụ Ngay
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
