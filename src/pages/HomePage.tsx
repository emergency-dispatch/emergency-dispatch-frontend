import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { AiHighlightSection } from '../components/landing/AiHighlightSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { RoleSolutionsSection } from '../components/landing/RoleSolutionsSection';
import { HotlineBannerSection } from '../components/landing/HotlineBannerSection';
import { Footer } from '../components/layout/Footer';
import { PhoneCall, ShieldAlert, BellRing, X } from 'lucide-react';
import {
  SosModal,
  CitizenReportsModal,
  CitizenPhoneModal,
  CitizenRescueAlertModal,
  playCitizenRescueChime,
} from '../components/citizen';
import type { CitizenRescueAlertPayload } from '../components/citizen/CitizenRescueAlertModal';
import { BackToTop } from '../components/common/BackToTop';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth';
import type { IncidentResponseDto } from '../types/incident';
import { incidentService } from '../services/incidentService';
import { notificationService } from '../services/notificationService';
import { incidentHubService, HubEvents } from '../services/realtime/incidentHubService';
import { mapboxService } from '../services/mapboxService';
import { getLanguage, useTranslation } from '../i18n';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [rescueAlert, setRescueAlert] = useState<CitizenRescueAlertPayload | null>(null);
  const [areaAlertToast, setAreaAlertToast] = useState<{
    id: string;
    publicAlertId: string;
    notificationId?: string;
    message: string;
  } | null>(null);
  const handledAlertKeysRef = useRef<Set<string>>(new Set());
  const areaToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpenTrackFromAlert = useCallback(async (incidentId: string) => {
    setRescueAlert(null);
    let loaded: IncidentResponseDto | undefined;
    try {
      const res = await incidentService.getById(incidentId);
      if (res?.success && res.data) {
        loaded = res.data;
      }
    } catch {
      // ignore — HeroRadarMap will fetch or fall back
    }
    window.dispatchEvent(
      new CustomEvent('resq_focus_citizen_incident', {
        detail: { incidentId, incident: loaded, expand: true },
      })
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenSos = () => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: { message: t('citizen.sos.authRequiredPrompt') },
      });
      return;
    }
    setSosModalOpen(true);
  };

  const roleClean = String(user?.role || '').toLowerCase();
  const isCitizen = !user?.role || roleClean === 'citizen' || user?.role === UserRole.Citizen;
  const hasNoPhone = !user?.phoneNumber || user.phoneNumber.trim() === '';
  const isCitizenWithoutPhone = Boolean((isAuthenticated || !!user) && isCitizen && hasNoPhone);

  // Lắng nghe thông báo khẩn của Citizen (nhận lệnh / xác nhận trùng) -> pop-up giữa màn hình kèm chuông báo
  useEffect(() => {
    if (!isAuthenticated || !isCitizen) return;
    incidentHubService.start().catch(() => {});

    const triggerAlert = (payload: CitizenRescueAlertPayload) => {
      if (handledAlertKeysRef.current.has(payload.id)) return;
      handledAlertKeysRef.current.add(payload.id);
      playCitizenRescueChime();
      setRescueAlert(payload);
    };

    const showAreaAlertToast = (item: {
      id: string;
      publicAlertId: string;
      notificationId?: string;
      message: string;
    }) => {
      if (handledAlertKeysRef.current.has(item.id)) return;
      handledAlertKeysRef.current.add(item.id);
      if (user?.id && item.publicAlertId) {
        try {
          const storageKey = `resq_seen_citizen_alerts_${user.id}`;
          const prev = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];
          if (!prev.includes(item.publicAlertId)) {
            localStorage.setItem(storageKey, JSON.stringify([...prev.slice(-49), item.publicAlertId]));
          }
        } catch {
          // ignore storage quota errors
        }
      }
      if (areaToastTimerRef.current) clearTimeout(areaToastTimerRef.current);
      setAreaAlertToast(item);
      areaToastTimerRef.current = setTimeout(() => {
        setAreaAlertToast(null);
      }, 10000);
    };

    const parseAreaAlert = (notif: any): { publicAlertId?: string; type?: string } => {
      if (!notif?.dataJson) return {};
      try {
        return JSON.parse(notif.dataJson);
      } catch {
        return {};
      }
    };

    // Khi vừa đăng nhập hoặc SignalR nối lại / bản đồ công khai đổi: kiểm tra thông báo khu vực chưa đọc còn hiệu lực
    let cancelled = false;
    const syncUnreadAreaAlerts = () => {
      if (typeof notificationService?.list !== 'function') return;
      notificationService
        .list(10)
        .then(async (page) => {
          if (cancelled || !page?.items?.length) return;
          const seenIds = (() => {
            try {
              return new Set<string>(
                JSON.parse(localStorage.getItem(`resq_seen_citizen_alerts_${user?.id || ''}`) || '[]')
              );
            } catch {
              return new Set<string>();
            }
          })();
          for (const n of page.items) {
            if (n.isRead) continue;
            const d = parseAreaAlert(n);
            const rawType = n.type as unknown;
            const isAreaType =
              rawType === 'CitizenIncidentAlert' ||
              rawType === 6 ||
              d.type === 'citizen_incident_alert';
            if (!isAreaType || !d.publicAlertId || seenIds.has(d.publicAlertId)) continue;
            const activePin = await incidentService.getCitizenMapIncidentByAlert?.(d.publicAlertId);
            if (cancelled) return;
            if (activePin) {
              showAreaAlertToast({
                id: `area-${d.publicAlertId}`,
                publicAlertId: d.publicAlertId,
                notificationId: n.id,
                message: n.message || activePin.message,
              });
              break;
            }
          }
        })
        .catch(() => {});
    };

    syncUnreadAreaAlerts();
    const unsubReconn = incidentHubService.onReconnected(syncUnreadAreaAlerts);
    const unsubCitizenMapChanged = incidentHubService.on(HubEvents.ReceiveCitizenMapChanged, syncUnreadAreaAlerts);
    const onVisChange = () => {
      if (document.visibilityState === 'visible') syncUnreadAreaAlerts();
    };
    document.addEventListener('visibilitychange', onVisChange);
    const unreadFallbackTimer = setInterval(syncUnreadAreaAlerts, 15000);

    const unsubNotif = incidentHubService.on<any>(HubEvents.ReceiveNotification, async (notif) => {
      if (!notif) return;
      const msg = String(notif.message || '');
      const title = String(notif.title || '');
      const text = `${title} ${msg}`.toLowerCase();
      let parsedData: {
        type?: string;
        status?: string;
        assignmentId?: string;
        publicAlertId?: string;
        parentIncidentId?: string;
        reportId?: string;
        plateNumber?: string;
        stationName?: string;
      } = {};
      if (notif.dataJson) {
        try {
          parsedData = JSON.parse(notif.dataJson);
        } catch {
          // ignore
        }
      }

      if (
        notif.type === 'CitizenIncidentAlert' ||
        notif.type === 6 ||
        parsedData.type === 'citizen_incident_alert'
      ) {
        const publicAlertId = parsedData.publicAlertId || notif.id;
        showAreaAlertToast({
          id: `area-${publicAlertId}`,
          publicAlertId,
          notificationId: notif.id,
          message: msg,
        });
        return;
      }

      const isDuplicateConfirmed =
        text.includes('trùng với sự cố') || text.includes('duplicate');
      const statusNorm = String(parsedData.status || '').toLowerCase();
      const isDispatchedPendingAccept =
        statusNorm === 'dispatched' ||
        text.includes('đang chờ đội xác nhận') ||
        text.includes('đã giao sự cố') ||
        text.includes('waiting for the team to accept');
      const isAccepted =
        !isDispatchedPendingAccept &&
        (statusNorm === 'accepted' ||
          text.includes('đã nhận lệnh') ||
          text.includes('accepted'));

      if (!isDuplicateConfirmed && !isAccepted) return;

      const targetIncidentId = parsedData.parentIncidentId || notif.incidentId || null;
      if (!isDuplicateConfirmed && targetIncidentId) {
        try {
          const detailRes = await incidentService.getById(targetIncidentId);
          if (detailRes.data?.viewedAsDuplicateReporter) return;
        } catch {
          // ignore if lookup fails
        }
      }

      const alertDedupId = isDuplicateConfirmed
        ? `notif-${notif.id}`
        : `assign-${parsedData.assignmentId || targetIncidentId || notif.id}-accepted`;

      const cleanRawMsg = msg.replace(/^\s*\[[^\]]+\]\s*/, '').trim();
      const plateMatch = cleanRawMsg.match(/(?:Vehicle|Xe)\s+(.+?)\s+(?:has accepted|đã nhận lệnh)/i);
      const resolvedPlate = parsedData.plateNumber || plateMatch?.[1]?.trim() || null;
      const isVi = getLanguage() === 'vi';

      triggerAlert({
        id: alertDedupId,
        kind: isDuplicateConfirmed ? 'duplicate_confirmed' : 'accepted',
        title: isDuplicateConfirmed
          ? (isVi ? 'Sự cố đã có người báo cáo' : 'Incident already reported')
          : (isVi ? 'Đội cứu hộ đã nhận lệnh' : 'Rescue team accepted'),
        message: isDuplicateConfirmed
          ? (isVi
              ? 'Đã có người báo cáo sự cố này và trung tâm đang xử lý.'
              : 'This incident has already been reported and dispatch is handling it.')
          : (isVi
              ? (resolvedPlate
                  ? `Xe ${resolvedPlate} đã nhận lệnh và đang chuẩn bị xuất phát tới vị trí của bạn.`
                  : 'Đội cứu hộ đã nhận lệnh và đang chuẩn bị xuất phát tới vị trí của bạn.')
              : (resolvedPlate
                  ? `Vehicle ${resolvedPlate} has accepted and is preparing to head to your location.`
                  : 'Rescue team has accepted and is preparing to head to your location.')),
        incidentId: targetIncidentId,
        plateNumber: parsedData.plateNumber || null,
        stationName: parsedData.stationName || null,
      });
    });

    const unsubAssign = incidentHubService.on<any>(HubEvents.ReceiveAssignmentStatus, async (evt) => {
      if (!evt) return;
      const st = String(evt.status || evt.Status || '');
      if (st !== 'Accepted') return;
      const incId = evt.incidentId || evt.IncidentId;
      const assignId = evt.assignmentId || evt.AssignmentId;
      if (incId) {
        try {
          const detailRes = await incidentService.getById(incId);
          if (detailRes.data?.viewedAsDuplicateReporter) return;
        } catch {
          // ignore if lookup fails
        }
      }
      const isVi = getLanguage() === 'vi';
      triggerAlert({
        id: `assign-${assignId || incId}-accepted`,
        kind: 'accepted',
        title: isVi ? 'Đội cứu hộ đã nhận lệnh!' : 'Rescue team accepted!',
        message: isVi
          ? 'Yêu cầu cứu hộ đã được đội trực chiến tiếp nhận và chuẩn bị xuất phát.'
          : 'Your rescue request has been accepted by the duty team and they are preparing to depart.',
        incidentId: incId || null,
        plateNumber: evt.plateNumber || evt.PlateNumber || null,
        stationName: evt.stationName || evt.StationName || null,
      });
    });

    return () => {
      cancelled = true;
      clearInterval(unreadFallbackTimer);
      document.removeEventListener('visibilitychange', onVisChange);
      if (areaToastTimerRef.current) {
        clearTimeout(areaToastTimerRef.current);
        areaToastTimerRef.current = null;
      }
      unsubNotif();
      unsubAssign();
      unsubReconn();
      unsubCitizenMapChanged();
    };
  }, [isAuthenticated, isCitizen, user?.id]);

  // Yêu cầu lấy vị trí ngay lập tức khi mở web nếu người dùng là Citizen (hoặc vãng lai)
  useEffect(() => {
    if (!navigator.geolocation) return;
    const isCitizen = !user || user.role === UserRole.Citizen;
    if (isCitizen) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const addr = await mapboxService.reverseGeocode(lng, lat);
            localStorage.setItem(
              'resq_citizen_coords',
              JSON.stringify({ lat, lng, address: addr, updatedAt: Date.now() })
            );
          } catch {
            localStorage.setItem(
              'resq_citizen_coords',
              JSON.stringify({ lat, lng, updatedAt: Date.now() })
            );
          }
        },
        (err) => {
          console.info('Citizen geolocation prompt notice:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [user?.id, user?.role]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-red-600 selection:text-white flex flex-col">
      {/* Sticky Navbar */}
      <Navbar
        onOpenSos={handleOpenSos}
        onOpenReports={() => setReportsModalOpen(true)}
      />

      {/* Top-Right Stack: Phone Missing Alert + Citizen Public Incident Alert (trượt từ trái sang, tự tắt sau 10s) */}
      {(isCitizenWithoutPhone || areaAlertToast) && (
        <div className="fixed top-[74px] left-3 right-3 sm:left-auto sm:right-6 z-40 sm:max-w-md w-auto flex flex-col gap-2.5 pointer-events-none">
          {isCitizenWithoutPhone && (
            <aside
              aria-label="Cảnh báo bổ sung số điện thoại"
              className="pointer-events-auto animate-fadeIn"
            >
              <div className="relative bg-white/95 backdrop-blur-md border border-amber-300 rounded-2xl shadow-xl hover:shadow-2xl hover:border-amber-400 p-3 sm:p-3.5 text-slate-900 transition-all duration-300">
                <div className="flex items-center gap-3">
                  {/* Emergency Pulse Icon */}
                  <div className="relative p-2.5 rounded-xl bg-amber-500/15 border border-amber-300/80 text-amber-600 shrink-0">
                    <PhoneCall className="w-4 h-4 text-amber-600" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                    </span>
                  </div>

                  {/* Text Info */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        {t('citizen.landing.phoneMissingTitle')}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed text-pretty">
                      {t('citizen.landing.phoneMissingDesc')}
                    </p>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={() => setPhoneModalOpen(true)}
                    className="shrink-0 py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('citizen.landing.phoneMissingBtn')}</span>
                  </button>
                </div>
              </div>
            </aside>
          )}

          {areaAlertToast && (
            <aside
              aria-label="Thông báo sự cố khu vực"
              className="pointer-events-auto animate-slideInLeft"
            >
              <div
                onClick={() => {
                  const pid = areaAlertToast.publicAlertId;
                  const nid = areaAlertToast.notificationId;
                  setAreaAlertToast(null);
                  if (nid) notificationService.markRead?.(nid).catch(() => {});
                  window.dispatchEvent(new CustomEvent('resq_focus_citizen_map_alert', { detail: { publicAlertId: pid } }));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="relative bg-white/95 backdrop-blur-md border border-orange-300 rounded-2xl shadow-xl hover:shadow-2xl hover:border-orange-400 p-3 sm:p-3.5 text-slate-900 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="relative p-2.5 rounded-xl bg-orange-500/15 border border-orange-300/80 text-orange-600 shrink-0">
                    <BellRing className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      {getLanguage() === 'en' ? 'Area Incident Alert' : 'Cảnh báo sự cố khu vực'}
                    </h4>
                    <p className="text-xs text-slate-700 mt-0.5 leading-snug text-pretty font-medium">
                      {areaAlertToast.message}
                    </p>
                    <p className="text-[10px] font-semibold text-orange-600 mt-1">
                      Bấm để xem vị trí trên bản đồ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nid = areaAlertToast.notificationId;
                      setAreaAlertToast(null);
                      if (nid) notificationService.markRead?.(nid).catch(() => {});
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                    aria-label="Đóng thông báo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Main Landing Flow */}
      <main className="flex-grow">
        {/* Hero Section */}
        <HeroSection
          onOpenSos={handleOpenSos}
          onOpenReports={() => setReportsModalOpen(true)}
        />

        {/* Features Section */}
        <FeaturesSection />

        {/* AI Highlight Section (Interactive VLM Showcase) */}
        <AiHighlightSection />

        {/* How It Works (4-Step Horizontal Stepper) */}
        <HowItWorksSection />

        {/* Role-Based Solution Cards */}
        <RoleSolutionsSection onOpenSos={handleOpenSos} />

        {/* National Hotlines Direct Contact Banner */}
        <HotlineBannerSection onOpenSos={handleOpenSos} />
      </main>

      {/* Footer */}
      <Footer onOpenSos={handleOpenSos} />

      {/* Mobile Floating Sticky SOS Action Bar removed: Navbar already has SOS button on mobile */}

      {/* Emergency SOS Modal with Mapbox */}
      <SosModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        onOpenReports={() => setReportsModalOpen(true)}
      />

      {/* Citizen Report History Modal */}
      <CitizenReportsModal
        isOpen={reportsModalOpen}
        onClose={() => setReportsModalOpen(false)}
      />

      {/* Citizen Quick Phone Setup Modal */}
      <CitizenPhoneModal
        isOpen={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
      />

      {/* Citizen Center Rescue Alert Modal + Chime */}
      <CitizenRescueAlertModal
        alert={rescueAlert}
        onTrack={handleOpenTrackFromAlert}
        onDismiss={() => setRescueAlert(null)}
      />

      {/* Floating Back to Top Button */}
      <BackToTop />
    </div>
  );
};
