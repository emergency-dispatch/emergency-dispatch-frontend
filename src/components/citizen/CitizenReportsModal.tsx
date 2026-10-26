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
import { getIncidentVisualMeta } from '../../utils/incidentFormat';
import { CitizenLiveTrackingMapModal } from './CitizenLiveTrackingMapModal';
import { useTranslation } from '../../i18n';

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
  const { t, i18n } = useTranslation();
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
            <span>{t('citizen.reports.status.completed')}</span>
          </span>
        );
      case 'Dispatched':
      case 'InProgress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{status === 'Dispatched' ? t('citizen.reports.status.dispatched') : t('citizen.reports.status.inProgress')}</span>
          </span>
        );
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
            <span>{t('citizen.reports.status.verified')}</span>
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-slate-100 text-slate-500 border border-slate-200">
            <Ban className="w-3.5 h-3.5" />
            <span>{t('citizen.reports.status.cancelled')}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-red-50 text-red-600 border border-red-200">
            <Clock className="w-3.5 h-3.5" />
            <span>{t('citizen.reports.status.pending')}</span>
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[90vh] rounded-none sm:rounded-2xl bg-white border-0 sm:border border-slate-200 shadow-2xl text-slate-900 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2">
                <span>{t('citizen.reports.modalTitle')}</span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                  {incidents.length}
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 font-mono line-clamp-1">
                {t('citizen.reports.modalSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={fetchReports}
              disabled={isLoading}
              className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title={t('citizen.reports.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-red-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="px-4 pt-2.5 sm:px-6 sm:pt-3 shrink-0">
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Body List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
          {isLoading && incidents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-mono space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-red-600 mx-auto" />
              <p>{t('citizen.reports.loading')}</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="py-12 text-center space-y-3 font-mono">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">{t('citizen.reports.emptyTitle')}</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t('citizen.reports.emptyDesc')}
              </p>
            </div>
          ) : (
            incidents.map((incident) => {
              const visual = getIncidentVisualMeta(incident);
              const isTypeKnown = visual.category === 'fire' || visual.category === 'accident';
              const displayTitle = isTypeKnown
                ? visual.label
                : incident.title && !incident.title.includes('Tín hiệu') && !incident.title.includes('SOS')
                ? incident.title
                : t('citizen.reports.incidentTypes.sosSignal');
              const dateFormatted = new Date(incident.createdAt).toLocaleString(
                i18n.language === 'en' ? 'en-US' : 'vi-VN',
                {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }
              );
              const displayDesc = i18n.language === 'en' && incident.description?.startsWith('Tín hiệu cứu nạn SOS từ người dân tại')
                ? incident.description.replace('Tín hiệu cứu nạn SOS từ người dân tại', 'Emergency SOS signal from citizen at')
                : incident.description;

              return (
                <div
                  key={incident.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs space-y-3"
                >
                  {/* Item Top: Category, Code, Status & Date */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${visual.badgeClass}`}>
                          <span>{visual.icon}</span>
                          <span>{visual.label}</span>
                        </span>
                        <span className="font-mono text-xs font-extrabold text-slate-500">
                          INC-{incident.id.substring(0, 8).toUpperCase()}
                        </span>
                        {getStatusBadge(incident.status)}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{displayTitle}</h3>
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

                    {displayDesc && (
                      <p className="text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] leading-relaxed">
                        {displayDesc}
                      </p>
                    )}

                    {(() => {
                      const isAiKnown = incident.aiClassification?.isSuccess === true &&
                        incident.aiClassification?.eventType !== 'None' &&
                        Boolean(incident.aiClassification?.summary) &&
                        !/không thể phân loại|cần operator|đánh giá thủ công|unclassified|needshumanreview/i.test(incident.aiClassification?.summary || '');
                      if (!isAiKnown || !incident.aiClassification) return null;
                      const cleanSummary = incident.aiClassification.summary?.replace(/^\[.*?\]\s*/, '');
                      const filteredTags = (incident.aiClassification.hazardTags || []).filter(
                        (tag) => !/unclassified|needshumanreview/i.test(tag)
                      );

                      return (
                        <div className="p-2.5 rounded-lg bg-red-50/50 border border-red-100 text-[11px] flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-red-700">{t('citizen.reports.sceneAssessment')} </span>
                            <span className="text-slate-700">{cleanSummary}</span>
                            {filteredTags.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1">
                                {filteredTags.map((tag) => (
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
                      );
                    })()}
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
                            alt="Media"
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
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {incident.status === 'Dispatched' || incident.status === 'InProgress' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenTracking(incident)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-mono font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 animate-pulse" />
                          <span>{t('citizen.reports.trackRescueUnit')}</span>
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
                    {t('citizen.reports.trackRescueUnit')}
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
                <p className="text-xs font-mono text-slate-500">{t('citizen.reports.connectingToRescueUnit')}</p>
              </div>
            ) : trackingError ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{t('citizen.reports.cannotConnectRescueUnit')}</span>
                </div>
                <p>{trackingError}</p>
              </div>
            ) : trackingData ? (
              <div className="space-y-4 font-mono text-xs">
                {/* Status Hero Box */}
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{t('citizen.reports.vehicleStatus')}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      {trackingData.dispatchStatus === 'EnRoute'
                        ? t('citizen.reports.statusEnRoute')
                        : trackingData.dispatchStatus === 'OnScene'
                          ? t('citizen.reports.statusOnScene')
                          : trackingData.dispatchStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400">{t('citizen.reports.etaTitle')}</div>
                      <div className="text-lg font-extrabold text-amber-400">
                        ~{trackingData.estimatedArrivalMinutes || 3} {t('citizen.reports.minutes')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">{t('citizen.reports.distanceTitle')}</div>
                      <div className="text-lg font-extrabold text-white">
                        {trackingData.distanceKm ? trackingData.distanceKm.toFixed(1) : '1.2'} km
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{t('citizen.reports.plateNumberTitle')}</span>
                    <span className="font-bold text-slate-900">{trackingData.plateNumber || t('citizen.reports.unidentified')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{t('citizen.reports.unitTypeTitle')}</span>
                    <span className="font-bold text-slate-900">{trackingData.unitTypeName || t('citizen.reports.rescueUnitDefault')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{t('citizen.reports.stationTitle')}</span>
                    <span className="font-bold text-slate-900">{trackingData.stationName || t('citizen.reports.cadStationDefault')}</span>
                  </div>
                </div>

                {/* Direct Call hotline */}
                {trackingData.stationPhoneNumber && (
                  <a
                    href={`tel:${trackingData.stationPhoneNumber}`}
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>{t('citizen.reports.callStation')} ({trackingData.stationPhoneNumber})</span>
                  </a>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleCloseTracking}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs transition-colors cursor-pointer"
            >
              {t('citizen.reports.closeWindow')}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
