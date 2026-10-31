import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronDown, LogOut, MapPin, Plus, Settings, ShieldAlert, Siren, User } from 'lucide-react';
import { useDispatchStore } from '../../context/DispatchContext';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import type { NotificationDto } from '../../services/notificationService';
import { incidentHubService, type HubStatus } from '../../services/realtime/incidentHubService';
import { LANGUAGE_OPTIONS, dateLocale, getLanguage, setLanguage, useTranslation } from '../../i18n';

// Chấm trạng thái = kết nối realtime thật. Mất kết nối thì dữ liệu vẫn tự tải lại định kỳ (poll dự phòng).
const HUB_STATUS_STYLE: Record<HubStatus, { dot: string; text: string; ping: boolean }> = {
  connected: { dot: 'bg-emerald-500', text: 'text-emerald-600', ping: true },
  connecting: { dot: 'bg-slate-400', text: 'text-slate-500', ping: false },
  reconnecting: { dot: 'bg-amber-500', text: 'text-amber-600', ping: true },
  disconnected: { dot: 'bg-amber-500', text: 'text-amber-600', ping: false },
};
import { UserProfileModal } from '../profile/UserProfileModal';

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleString(dateLocale(), { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
};

export const OperatorTopbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Thông báo thật từ backend (xe từ chối nhiệm vụ, leo thang, sự cố đóng…); chuông nhấp nháy khi còn sự cố leo thang.
  const { incidents, escalatedIncidentIds } = useDispatchStore();
  const { items: notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications();
  const hasCriticalAlert = escalatedIncidentIds.size > 0;
  const hubStatus = useSyncExternalStore(incidentHubService.subscribeStatus, incidentHubService.getStatus);
  const statusStyle = HUB_STATUS_STYLE[hubStatus];

  const openNotification = (notification: NotificationDto) => {
    markRead(notification.id);
    if (!notification.incidentId) return;
    setNotifOpen(false);
    const incident = incidents.find((i) => i.id === notification.incidentId);
    if (incident?.status === 'pending') navigate('/dashboard/command-center/incidents');
    else if (incident) navigate('/dashboard/command-center/live-map', { state: { focusIncidentId: incident.id } });
  };

  // Tạo sự cố từ tin báo ngoài app: mở form trên Live Map.
  const openCreateIncident = () => navigate('/dashboard/command-center/live-map?create=1');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout('/login');
  };

  const displayName = user?.fullName || t('layout.topbar.defaultName');
  const displayRole = user?.role || 'Operator';
  const displayStation = user?.stationName || t('layout.topbar.defaultStation');
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'CAD';

  return (
    <header className="relative z-[1300] h-16 shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs flex items-center justify-between px-5">
      {/* Left: Logo + Station on duty */}
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-black text-slate-900 tracking-wide hidden xl:inline whitespace-nowrap">
            ResQ<span className="text-red-600">-AI</span>
          </span>
        </Link>

        <div className="h-6 w-px bg-slate-200 shrink-0" />

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span className="text-xs font-semibold text-slate-900 truncate">{displayStation}</span>
          <span
            className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200 shrink-0"
            title={t(`layout.hubStatus.${hubStatus}.title`)}
            role="status"
          >
            <span className="relative flex h-1.5 w-1.5">
              {statusStyle.ping && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusStyle.dot}`} />
              )}
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusStyle.dot}`} />
            </span>
            <span className={`text-[10px] font-mono-data font-semibold whitespace-nowrap ${statusStyle.text}`}>
              {t(`layout.hubStatus.${hubStatus}.label`)}
            </span>
          </span>
        </div>
      </div>

      {/* Right: Notification bell + Avatar */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={openCreateIncident}
          title={t('layout.topbar.createIncidentHint')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('layout.topbar.createIncident')}</span>
        </button>
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            aria-label={t('layout.topbar.notifications')}
            className={`relative p-2.5 rounded-lg border transition-colors ${
              hasCriticalAlert
                ? 'bg-red-50 border-red-300 text-red-600 animate-flash-critical'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-xl cad-glass overflow-hidden z-[1200]">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
                <span className="text-xs font-mono-data uppercase tracking-wider text-slate-600 font-bold">
                  {t('layout.topbar.notifications')}
                  {unreadCount > 0 && t('layout.topbar.unreadSuffix', { count: unreadCount })}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    {t('layout.topbar.markAllRead')}
                  </button>
                )}
              </div>
              {hasCriticalAlert && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2 text-[11px] font-semibold text-red-700">
                  <Siren className="w-3.5 h-3.5 shrink-0" />
                  {t('layout.topbar.escalatingBanner', { count: escalatedIncidentIds.size })}
                </div>
              )}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {loading ? (
                  <p className="px-4 py-6 text-center text-xs text-slate-500">{t('layout.topbar.loadingNotifications')}</p>
                ) : error ? (
                  <p className="px-4 py-6 text-center text-xs text-red-600">{error}</p>
                ) : notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-slate-500">{t('layout.topbar.noNotifications')}</p>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => openNotification(notification)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-slate-50 ${
                        notification.isRead ? '' : 'bg-red-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-xs ${notification.isRead ? 'font-medium' : 'font-bold'} ${
                            notification.type === 'Escalation' ? 'text-red-700' : 'text-slate-900'
                          }`}
                        >
                          {notification.title}
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono-data text-slate-400">
                            {formatTime(notification.createdAt)}
                          </span>
                          {!notification.isRead && <span className="w-2 h-2 rounded-full bg-red-500" />}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div
          role="group"
          aria-label={t('layout.topbar.language')}
          className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setLanguage(option.value)}
              aria-pressed={getLanguage() === option.value}
              className={`px-2 py-1 rounded-md text-[11px] font-bold font-mono-data transition-colors ${
                getLanguage() === option.value ? 'bg-white text-red-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="relative shrink-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover shadow-xs border border-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                  {initials}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div className="hidden lg:flex flex-col items-start leading-tight">
              <span className="text-xs font-semibold text-slate-900">{displayName}</span>
              <span className="text-[10px] font-mono-data text-slate-500">{displayRole}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl cad-glass overflow-hidden z-[1200]">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-3">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
                  <p className="text-[10px] font-mono-data text-red-600 font-semibold uppercase">{displayRole}</p>
                  <p className="text-[10px] font-mono-data text-slate-400 truncate mt-0.5">{user?.email}</p>
                </div>
              </div>
              <div className="py-1.5">
                <button
                  onClick={() => {
                    setUserOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('layout.topbar.profile')}</span>
                </button>
                <button
                  onClick={() => {
                    setUserOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('layout.topbar.settings')}</span>
                </button>
              </div>
              <div className="py-1.5 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('layout.topbar.logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  );
};
