import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Clock,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Flame,
  Car,
  HeartPulse,
  RefreshCw,
  ExternalLink,
  Ban,
  Calendar,
  Sparkles,
  Phone,
  Image as ImageIcon,
  Navigation,
  Truck,
  PhoneCall,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth';
import { incidentService, type CitizenTrackingDto } from '../../services/incidentService';
import { getApiErrorMessage } from '../../services/apiClient';
import type { IncidentResponseDto } from '../../types/incident';
import { CitizenLiveTrackingMapModal } from './CitizenLiveTrackingMapModal';

interface CitizenReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIncident?: (incident: IncidentResponseDto) => void;
}

export const CitizenReportsModal: React.FC<CitizenReportsModalProps> = ({
  isOpen,
  onClose,
  onSelectIncident,
}) => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<IncidentResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [selectedIncident, setSelectedIncident] = useState<IncidentResponseDto | null>(null);

  // Tracking state for Citizen
  const [trackingIncident, setTrackingIncident] = useState<IncidentResponseDto | null>(null);
  const [trackingData, setTrackingData] = useState<CitizenTrackingDto | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState<boolean>(false);
  const [trackingError, setTrackingError] = useState<string>('');

  // Cancel incident modal state for Citizen
  const [cancellingIncident, setCancellingIncident] = useState<IncidentResponseDto | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Bấm nhầm SOS / Thử nghiệm');
  const [customReason, setCustomReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string>('');

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      let items: IncidentResponseDto[] = [];
      let localIds: string[] = [];
      try {
        localIds = JSON.parse(localStorage.getItem('resq_my_reported_incident_ids') || '[]');
      } catch {
        localIds = [];
      }

      // 1. Phân quyền theo Role để tránh lỗi 403 Forbidden và không chồng chéo với Operator:
      if (user?.role === UserRole.Operator || user?.role === UserRole.Admin) {
        // Operator / Admin: dùng getIncidents (có quyền truy cập toàn bộ hệ thống)
        const res = await incidentService.getIncidents({ pageSize: 50 });
        items = res.data?.items || [];
      } else if (user?.role === UserRole.Citizen) {
        // Citizen: gọi endpoint chuyên biệt GET /api/Incidents/my-reports (dành riêng cho người dân)
        const res = await incidentService.getMyReports({ pageSize: 50 });
        items = (res.data?.items || []).map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          locationAddress: item.locationAddress,
          latitude: item.latitude ?? 0,
          longitude: item.longitude ?? 0,
          status: item.status,
          severity: item.severity,
          createdAt: item.reportedAt,
          updatedAt: item.reportedAt,
          verifiedAt: item.verifiedAt,
          mediaItems: (item.mediaUrls || []).map((url, idx) => ({
            id: `${item.id}-media-${idx}`,
            incidentId: item.id,
            mediaUrl: url,
            mediaType: (url.toLowerCase().endsWith('.mp4') ? 'Video' : 'Image') as any,
            uploadedAt: item.reportedAt,
          })),
        } as IncidentResponseDto));
      }

      // 2. Bổ sung các sự cố vừa báo từ trình duyệt này (nếu chưa có trong kết quả trả về)
      const existingIdSet = new Set(items.map((i) => i.id));
      const missingLocalIds = localIds.filter((id) => !existingIdSet.has(id));

      if (missingLocalIds.length > 0) {
        const localFetches = await Promise.allSettled(
          missingLocalIds.slice(0, 10).map((id) => incidentService.getById(id))
        );
        for (const r of localFetches) {
          if (r.status === 'fulfilled' && r.value.success && r.value.data) {
            items.push(r.value.data);
          }
        }
      }

      // Sắp xếp mới nhất lên đầu
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setIncidents(items);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Không thể tải lịch sử báo cáo sự cố.'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchReports();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, fetchReports]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Đã xử lý xong</span>
          </span>
        );
      case 'Dispatched':
      case 'InProgress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Đang điều phối ứng cứu</span>
          </span>
        );
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
            <span>Đã xác minh</span>
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-slate-100 text-slate-500 border border-slate-200">
            <Ban className="w-3.5 h-3.5" />
            <span>Đã hủy / Báo sai</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-red-50 text-red-600 border border-red-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Chờ tiếp nhận</span>
          </span>
        );
    }
  };


  const handleOpenTracking = (incident: IncidentResponseDto) => {
    setTrackingIncident(incident);
  };

  const handleCloseTracking = () => {
    setTrackingIncident(null);
  };

  const handleOpenCancelModal = (incident: IncidentResponseDto) => {
    setCancellingIncident(incident);
    setCancelReason('Bấm nhầm SOS / Thử nghiệm');
    setCustomReason('');
    setCancelError('');
  };

  const handleCloseCancelModal = () => {
    if (isCancelling) return;
    setCancellingIncident(null);
    setCancelError('');
  };

  const handleConfirmCancel = async () => {
    if (!cancellingIncident) return;
    const finalReason = cancelReason === 'Khác' ? customReason.trim() : cancelReason;
    if (!finalReason) {
      setCancelError('Vui lòng chọn hoặc nhập lý do hủy báo cáo.');
      return;
    }

    try {
      setIsCancelling(true);
      setCancelError('');
      await incidentService.cancel(cancellingIncident.id, finalReason);
      await fetchReports();
      setCancellingIncident(null);
    } catch (err) {
      setCancelError(getApiErrorMessage(err, 'Không thể hủy sự cố lúc này.'));
    } finally {
      setIsCancelling(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Lịch sử báo cáo sự cố &amp; SOS</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                  {incidents.length} sự cố
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Các tín hiệu SOS và thông báo cứu nạn đã gửi đến Trung tâm Điều phối CAD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchReports}
              disabled={isLoading}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-red-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="px-6 pt-3 shrink-0">
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Body List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading && incidents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-mono space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-red-600 mx-auto" />
              <p>Đang tải danh sách lịch sử sự cố từ máy chủ...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="py-12 text-center space-y-3 font-mono">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">Bạn chưa có báo cáo sự cố nào</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Khi bạn bấm nút "Phát tín hiệu cứu nạn SOS", thông tin sự cố và tiến trình xử lý của lực lượng cứu hộ sẽ được lưu lại tại đây.
              </p>
            </div>
          ) : (
            incidents.map((incident) => {
              const dateFormatted = new Date(incident.createdAt).toLocaleString('vi-VN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <div
                  key={incident.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs space-y-3"
                >
                  {/* Item Top */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-extrabold text-red-600">
                          INC-{incident.id.substring(0, 8).toUpperCase()}
                        </span>
                        {getStatusBadge(incident.status)}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{incident.title}</h3>
                    </div>

                    <div className="text-right text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{dateFormatted}</span>
                    </div>
                  </div>

                  {/* Location & Description */}
                  <div className="space-y-1.5 text-xs font-mono text-slate-600">
                    <div className="flex items-center gap-2 text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span className="truncate">{incident.locationAddress}</span>
                    </div>

                    {incident.description && (
                      <p className="text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] leading-relaxed">
                        {incident.description}
                      </p>
                    )}

                    {incident.aiClassification && (
                      <div className="p-2.5 rounded-lg bg-red-50/50 border border-red-100 text-[11px] flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-red-700">Đánh giá AI: </span>
                          <span className="text-slate-700">{incident.aiClassification.summary}</span>
                          {incident.aiClassification.hazardTags && incident.aiClassification.hazardTags.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1">
                              {incident.aiClassification.hazardTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.2 rounded bg-white text-red-600 border border-red-200 text-[10px] font-bold"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attached Media Photos */}
                  {incident.mediaItems && incident.mediaItems.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                      {incident.mediaItems.map((media) => (
                        <a
                          key={media.id}
                          href={media.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="relative group shrink-0"
                        >
                          <img
                            src={media.mediaUrl}
                            alt="Hiện trường"
                            className="w-14 h-14 object-cover rounded-lg border border-slate-200 group-hover:opacity-85 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Item Actions */}
                  {/* Item Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {incident.status === 'Dispatched' || incident.status === 'InProgress' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenTracking(incident)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-mono font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 animate-pulse" />
                          <span>Theo dõi xe cứu hộ</span>
                        </button>
                      ) : null}

                      {incident.status === 'Pending' || incident.status === 'AiProcessed' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCancelModal(incident)}
                          className="text-[11px] font-mono text-slate-500 hover:text-red-600 font-bold transition-colors cursor-pointer"
                        >
                          Hủy báo cáo này
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Citizen Live Vehicle Tracking Modal Overlay */}
      {trackingIncident && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Theo dõi xe cứu hộ
                  </h3>
                  <p className="text-xs font-mono text-red-600 font-bold">
                    #INC-{trackingIncident.id.substring(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseTracking}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isTrackingLoading ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-red-600 mx-auto" />
                <p className="text-xs font-mono text-slate-500">Đang đồng bộ tọa độ GPS xe cứu hộ realtime...</p>
              </div>
            ) : trackingError ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Chưa thể kết nối xe cứu hộ</span>
                </div>
                <p>{trackingError}</p>
              </div>
            ) : trackingData ? (
              <div className="space-y-4 font-mono text-xs">
                {/* Status Hero Box */}
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">TRẠNG THÁI XE:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      {trackingData.dispatchStatus === 'EnRoute'
                        ? 'ĐANG DI CHUYỂN ĐẾN'
                        : trackingData.dispatchStatus === 'OnScene'
                          ? 'ĐÃ ĐẾN HIỆN TRƯỜNG'
                          : trackingData.dispatchStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400">DỰ KIẾN ĐẾN (ETA):</div>
                      <div className="text-lg font-extrabold text-amber-400">
                        ~{trackingData.estimatedArrivalMinutes || 3} phút
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">KHOẢNG CÁCH:</div>
                      <div className="text-lg font-extrabold text-white">
                        {trackingData.distanceKm ? trackingData.distanceKm.toFixed(1) : '1.2'} km
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">BIỂN SỐ XE:</span>
                    <span className="font-bold text-slate-900">{trackingData.plateNumber || 'Chưa định danh'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">CHỦNG LOẠI:</span>
                    <span className="font-bold text-slate-900">{trackingData.unitTypeName || 'Xe Cứu Hộ'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">ĐƠN VỊ TRỰC:</span>
                    <span className="font-bold text-slate-900">{trackingData.stationName || 'Trạm CAD'}</span>
                  </div>
                </div>

                {/* Direct Call hotline */}
                {trackingData.stationPhoneNumber && (
                  <a
                    href={`tel:${trackingData.stationPhoneNumber}`}
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Gọi tổng đài trạm ({trackingData.stationPhoneNumber})</span>
                  </a>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleCloseTracking}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs transition-colors cursor-pointer"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      )}
      {/* Citizen Cancel Incident Confirmation Modal */}
      {cancellingIncident && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Hủy Báo Cáo Sự Cố
                  </h3>
                  <p className="text-xs font-mono text-red-600 font-bold">
                    #INC-{cancellingIncident.id.substring(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCancelModal}
                disabled={isCancelling}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn hủy yêu cầu cứu hộ này? Vui lòng chọn hoặc ghi rõ lý do để trung tâm CAD nắm thông tin:
              </p>

              <div className="space-y-2">
                {[
                  'Bấm nhầm nút SOS / Thử nghiệm',
                  'Tình huống đã được tự xử lý an toàn',
                  'Đã có người khác gọi cứu hộ hỗ trợ',
                  'Khác',
                ].map((reason) => (
                  <label
                    key={reason}
                    onClick={() => setCancelReason(reason)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      cancelReason === reason
                        ? 'bg-red-50/80 border-red-500 text-red-700 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      checked={cancelReason === reason}
                      onChange={() => setCancelReason(reason)}
                      className="accent-red-600"
                    />
                    <span>{reason === 'Khác' ? 'Lý do khác...' : reason}</span>
                  </label>
                ))}
              </div>

              {cancelReason === 'Khác' && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Nhập chi tiết lý do hủy báo cáo..."
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-sans"
                  autoFocus
                />
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCloseCancelModal}
                disabled={isCancelling}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs transition-colors cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {isCancelling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang hủy...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>Xác nhận hủy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
