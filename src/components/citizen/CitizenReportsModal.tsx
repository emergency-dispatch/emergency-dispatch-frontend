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
  Link2,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth';
import { incidentService } from '../../services/incidentService';
import { incidentHubService, HubEvents } from '../../services/realtime/incidentHubService';
import { getApiErrorMessage } from '../../services/apiClient';
import type { IncidentResponseDto } from '../../types/incident';
import { getIncidentVisualMeta, isAudioMediaUrl, isVideoMediaUrl } from '../../utils/incidentFormat';
import { CitizenSupplementModal } from './CitizenSupplementModal';
import { AudioEvidencePlayer } from '../common/AudioEvidencePlayer';
import { useTranslation } from '../../i18n';

interface CitizenReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIncident?: (incident: IncidentResponseDto) => void;
}

const isDuplicateCancellation = (reason?: string | number | null) => {
  const r = String(reason ?? '').toLowerCase();
  return r.includes('duplicate') || r.includes('trùng') || r === '1';
};

const isConfirmedDuplicateReport = (incident: IncidentResponseDto) =>
  incident.status === 'Cancelled' &&
  isDuplicateCancellation(incident.cancellationReason) &&
  Boolean(incident.linkedToIncidentId);

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

  // Supplement state for Citizen
  const [supplementTargetIncident, setSupplementTargetIncident] = useState<IncidentResponseDto | null>(null);

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
          code: item.code,
          title: item.title,
          description: item.description,
          locationAddress: item.locationAddress,
          latitude: item.latitude ?? 0,
          longitude: item.longitude ?? 0,
          status: item.status,
          severity: item.severity,
          cancellationReason: item.cancellationReason,
          linkedToIncidentId: item.linkedToIncidentId,
          linkedTo: item.linkedToIncidentId
            ? {
              incidentId: item.linkedToIncidentId,
              code: item.linkedToIncidentCode ?? undefined,
              title: item.linkedToIncidentTitle ?? '',
              locationAddress: item.linkedToIncidentAddress ?? '',
              eventType: 'None',
              status: item.linkedToIncidentStatus ?? 'Verified',
              distanceMeters: 0,
              assignedUnitPlates: [],
            }
            : undefined,
          reportedEventType: item.reportedEventType,
          createdAt: item.reportedAt,
          updatedAt: item.reportedAt,
          verifiedAt: item.verifiedAt,
          mediaItems: (item.mediaUrls || [])
            .filter((url) => Boolean(url) && !isAudioMediaUrl(url))
            .map((url, idx) => ({
              id: `${item.id}-media-${idx}`,
              incidentId: item.id,
              mediaUrl: url,
              mediaType: (isVideoMediaUrl(url) ? 'Video' : 'Image') as any,
              uploadedAt: item.reportedAt,
            })),
        } as IncidentResponseDto));

        // Chỉ gọi chi tiết bù nếu backend chưa trả linkedToIncidentId cho ca Linked / Cancelled (Duplicate)
        const needDetail = items.filter(
          (i) =>
            !i.linkedToIncidentId &&
            (i.status === 'Linked' || (i.status === 'Cancelled' && isDuplicateCancellation(i.cancellationReason)))
        );
        if (needDetail.length > 0) {
          const detailRes = await Promise.allSettled(
            needDetail.slice(0, 5).map((i) => incidentService.getById(i.id))
          );
          detailRes.forEach((r) => {
            if (r.status === 'fulfilled' && r.value.success && r.value.data) {
              const d = r.value.data;
              const idx = items.findIndex((x) => x.id === d.id);
              if (idx !== -1) {
                items[idx] = {
                  ...items[idx],
                  linkedToIncidentId: d.linkedToIncidentId,
                  linkedTo: d.linkedTo || items[idx].linkedTo,
                  cancellationReason: d.cancellationReason || items[idx].cancellationReason,
                };
              }
            }
          });
        }
      }

      // 2. Bổ sung các sự cố vừa báo từ trình duyệt này (chỉ cần thiết cho khách vãng lai chưa đăng nhập)
      const existingIdSet = new Set(items.map((i) => i.id));
      const isCitizenLoggedIn = user?.role === UserRole.Citizen;

      if (!isCitizenLoggedIn) {
        const missingLocalIds = localIds.filter((id) => !existingIdSet.has(id));
        if (missingLocalIds.length > 0) {
          const localFetches = await Promise.allSettled(
            missingLocalIds.slice(0, 10).map((id) => incidentService.getById(id))
          );
          const validIds: string[] = [];
          for (let idx = 0; idx < localFetches.length; idx++) {
            const r = localFetches[idx];
            if (r.status === 'fulfilled' && r.value.success && r.value.data) {
              items.push(r.value.data);
              validIds.push(missingLocalIds[idx]);
            }
          }
          // Dọn dẹp các ID không hợp lệ hoặc bị 403 khỏi localStorage
          if (validIds.length !== missingLocalIds.length) {
            localStorage.setItem('resq_my_reported_incident_ids', JSON.stringify(validIds));
          }
        }
      } else if (localIds.length > 0) {
        // Tài khoản đã đăng nhập: dọn dẹp các ID của tài khoản cũ để tránh gọi 403
        const myActiveIds = localIds.filter((id) => existingIdSet.has(id));
        if (myActiveIds.length !== localIds.length) {
          localStorage.setItem('resq_my_reported_incident_ids', JSON.stringify(myActiveIds));
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

  // Cập nhật trạng thái realtime khi đang mở lịch sử báo cáo (kể cả sự cố gốc cho người báo trùng)
  const watchIdsKey = Array.from(
    new Set(incidents.flatMap((i) => [i.id, i.linkedToIncidentId].filter(Boolean) as string[]))
  )
    .sort()
    .join(',');

  useEffect(() => {
    if (!isOpen) return;
    const watchIds = watchIdsKey ? watchIdsKey.split(',').filter(Boolean) : [];
    const watchSet = new Set(watchIds.map((id) => id.toLowerCase()));
    let subscribed = false;

    const subscribeAll = async () => {
      try {
        await incidentHubService.start();
        for (const id of watchIds) {
          await incidentHubService.invoke('SubscribeIncident', id).catch(() => { });
        }
        subscribed = true;
      } catch {
        // ignore
      }
    };
    void subscribeAll();

    const refresh = () => {
      fetchReports();
    };
    const u1 = incidentHubService.on(HubEvents.ReceiveIncidentStatus, refresh);
    const u2 = incidentHubService.on(HubEvents.ReceiveIncidentUpdate, refresh);
    const u3 = incidentHubService.on(HubEvents.ReceiveAssignmentStatus, refresh);
    const u4 = incidentHubService.on(HubEvents.ReceiveNotification, (notif: any) => {
      const targetId = String(notif?.incidentId || notif?.IncidentId || '').toLowerCase();
      if (!targetId || watchSet.has(targetId)) {
        refresh();
      }
    });
    const u5 = incidentHubService.onReconnected(() => {
      void subscribeAll();
      refresh();
    });
    return () => {
      if (subscribed) {
        watchIds.forEach((id) => {
          incidentHubService.invoke('UnsubscribeIncident', id).catch(() => { });
        });
      }
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  }, [isOpen, watchIdsKey, fetchReports]);

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
      case 'Linked':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-red-50 text-red-600 border border-red-200">
            <Clock className="w-3.5 h-3.5" />
            <span>{t('citizen.reports.status.pending')}</span>
          </span>
        );
    }
  };

  const focusOnHeroRadarMap = (incidentId: string, incident?: IncidentResponseDto) => {
    window.dispatchEvent(
      new CustomEvent('resq_focus_citizen_incident', {
        detail: { incidentId, incident, expand: true },
      })
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onClose();
  };

  const handleOpenTracking = (incident: IncidentResponseDto) => {
    if (incident.status === 'Completed' || incident.status === 'Cancelled') return;
    focusOnHeroRadarMap(incident.id, incident);
  };

  const handleOpenConfirmedDuplicateOriginal = async (report: IncidentResponseDto) => {
    const parentId = report.linkedToIncidentId;
    if (!parentId) return;
    if (report.linkedTo?.status === 'Completed' || report.linkedTo?.status === 'Cancelled') {
      return;
    }
    try {
      const res = await incidentService.getById(parentId);
      if (res?.success && res.data) {
        if (res.data.status === 'Completed' || res.data.status === 'Cancelled') {
          await fetchReports();
          return;
        }
        focusOnHeroRadarMap(parentId, {
          ...res.data,
          viewedAsDuplicateReporter: true,
        });
        return;
      }
    } catch {
      // Fallback sang thông tin tóm tắt đã có nếu gọi chi tiết tạm lỗi mạng
    }
    focusOnHeroRadarMap(parentId, {
      ...report,
      id: parentId,
      code: report.linkedTo?.code,
      title: report.linkedTo?.title || 'Sự cố gốc đang xử lý',
      locationAddress: report.linkedTo?.locationAddress || report.locationAddress,
      status: report.linkedTo?.status || 'Verified',
      viewedAsDuplicateReporter: true,
      reporterName: undefined,
      reporterPhone: undefined,
      mediaItems: [],
      operatorNotes: undefined,
      reporterMedicalProfile: null,
    });
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
                          {incident.code || `INC-${incident.id.substring(0, 8).toUpperCase()}`}
                        </span>
                        {getStatusBadge(
                          isConfirmedDuplicateReport(incident) && incident.linkedTo?.status
                            ? incident.linkedTo.status
                            : incident.status
                        )}
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

                  {/* Attached Media Photos & Audio (§55) */}
                  {(() => {
                    const isAudioItem = (m: IncidentResponseDto['mediaItems'][number]) =>
                      String(m.mediaType) === 'Audio' || (m.mediaType as any) === 2 || isAudioMediaUrl(m.mediaUrl);
                    const visualItems = (incident.mediaItems || []).filter((m) => Boolean(m.mediaUrl) && !isAudioItem(m));
                    const audioItems = (incident.mediaItems || []).filter((m) => String(m.mediaType) === 'Audio' || (m.mediaType as any) === 2);
                    return (
                      <>
                        {visualItems.length > 0 && (
                          <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                            {visualItems.map((media) => {
                              const isVid = String(media.mediaType) === 'Video' || (media.mediaType as any) === 1 || isVideoMediaUrl(media.mediaUrl);
                              return (
                                <a
                                  key={media.id}
                                  href={media.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="relative group shrink-0"
                                >
                                  {isVid ? (
                                    <video
                                      src={media.mediaUrl}
                                      preload="metadata"
                                      muted
                                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 bg-black"
                                    />
                                  ) : (
                                    <img
                                      src={media.mediaUrl}
                                      alt="Media"
                                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 group-hover:opacity-85 transition-opacity"
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                    <ExternalLink className="w-4 h-4" />
                                  </div>
                                </a>
                              );
                            })}
                          </div>
                        )}
                        {audioItems.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {audioItems.map((audio) => (
                              <AudioEvidencePlayer
                                key={audio.id}
                                audio={audio}
                                compact
                                resolvePlaybackUrl={() => incidentService.getAudioPlaybackUrl(incident.id, audio.id)}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Confirmed duplicate notice (only after Operator confirms) */}
                  {isConfirmedDuplicateReport(incident) ? (() => {
                    const parentStatus = incident.linkedTo?.status;
                    const origCode = incident.linkedTo?.code;
                    const codeTag = origCode ? ` ${origCode}` : '';
                    const isParentCompleted = parentStatus === 'Completed';
                    const isParentCancelled = parentStatus === 'Cancelled';
                    const isParentClosed = isParentCompleted || isParentCancelled;
                    const isEn = i18n.language === 'en';
                    return (
                      <div
                        className={`p-3 rounded-xl border text-xs space-y-2 ${isParentClosed
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-indigo-50/80 border-indigo-200'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div
                            className={`flex items-center gap-1.5 font-bold ${isParentClosed ? 'text-slate-700' : 'text-indigo-900'
                              }`}
                          >
                            <Link2
                              className={`w-4 h-4 shrink-0 ${isParentClosed ? 'text-slate-500' : 'text-indigo-600'
                                }`}
                            />
                            <span>
                              {isParentCompleted
                                ? (isEn
                                  ? `Original incident${codeTag} has been resolved.`
                                  : `Sự cố gốc${codeTag} đã được xử lý xong.`)
                                : isParentCancelled
                                  ? (isEn
                                    ? `Original incident${codeTag} has been cancelled.`
                                    : `Sự cố gốc${codeTag} đã bị hủy.`)
                                  : (isEn
                                    ? `Duplicate report linked to incident${codeTag} (currently being handled).`
                                    : `Đã có người báo cáo sự cố${codeTag} và trung tâm đang xử lý.`)}
                            </span>
                          </div>
                          {!isParentClosed && (
                            <button
                              type="button"
                              onClick={() => handleOpenConfirmedDuplicateOriginal(incident)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>{isEn ? 'View details & Track' : 'Xem chi tiết & Theo dõi'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })() : null}

                  {/* Item Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {incident.status !== 'Completed' && incident.status !== 'Cancelled' && (
                        <button
                          type="button"
                          onClick={() => setSupplementTargetIncident(incident)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-mono font-bold transition-all cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>{t('citizen.reports.supplementBtn', 'Bổ sung thông tin')}</span>
                        </button>
                      )}

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

      {/* Citizen Supplement Modal */}
      {supplementTargetIncident && (
        <CitizenSupplementModal
          isOpen={Boolean(supplementTargetIncident)}
          onClose={() => setSupplementTargetIncident(null)}
          incidentId={supplementTargetIncident.id}
          incidentCode={supplementTargetIncident.code}
          incidentTitle={supplementTargetIncident.title}
          isLinked={supplementTargetIncident.status === 'Linked'}
          onSuccess={fetchReports}
        />
      )}
    </div>,
    document.body
  );
};
