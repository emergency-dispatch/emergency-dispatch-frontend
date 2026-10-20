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
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { incidentService } from '../../services/incidentService';
import { getApiErrorMessage } from '../../services/apiClient';
import type { IncidentResponseDto } from '../../types/incident';

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

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      const res = await incidentService.getIncidents({ pageSize: 50 });
      let localIds: string[] = [];
      try {
        localIds = JSON.parse(localStorage.getItem('resq_my_reported_incident_ids') || '[]');
      } catch {
        localIds = [];
      }

      const localIdSet = new Set(localIds);
      const userPhoneClean = (user?.phoneNumber || '').replace(/\s+/g, '');
      const userIdClean = user?.id?.toLowerCase();

      const allItems = res.data?.items || [];
      const myItems = allItems.filter((item) => {
        if (userIdClean && item.reportedByUserId && item.reportedByUserId.toLowerCase() === userIdClean) {
          return true;
        }
        if (userPhoneClean && item.reporterPhone) {
          const itemPhone = item.reporterPhone.replace(/\s+/g, '');
          if (itemPhone === userPhoneClean) return true;
        }
        if (localIdSet.has(item.id)) {
          return true;
        }
        return false;
      });

      // Sort by createdAt descending
      myItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setIncidents(myItems);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Không thể tải lịch sử báo cáo sự cố.'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.phoneNumber]);

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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Level5':
      case 'Level4':
      case 'Level3':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-700 border border-red-200">
            Nghiêm trọng ({severity})
          </span>
        );
      case 'Level2':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-700 border border-amber-200">
            Trung bình ({severity})
          </span>
        );
      case 'Level1':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
            Cấp độ 1
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Đang chấm điểm AI
          </span>
        );
    }
  };

  const handleCancelIncident = async (id: string) => {
    const reason = window.prompt('Nhập lý do hủy báo cáo (ví dụ: Bấm nhầm SOS / Tình huống đã được người khác xử lý):');
    if (!reason || !reason.trim()) return;

    try {
      setIsLoading(true);
      await incidentService.cancel(id, reason.trim());
      await fetchReports();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Không thể hủy sự cố.'));
      setIsLoading(false);
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
                          #INC-{incident.id.substring(0, 8).toUpperCase()}
                        </span>
                        {getStatusBadge(incident.status)}
                        {getSeverityBadge(incident.severity)}
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
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">
                      Tọa độ: {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
                    </span>

                    {incident.status === 'Pending' || incident.status === 'AiProcessed' ? (
                      <button
                        type="button"
                        onClick={() => handleCancelIncident(incident.id)}
                        className="text-[11px] font-mono text-slate-500 hover:text-red-600 font-bold transition-colors cursor-pointer"
                      >
                        Hủy báo cáo này
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
