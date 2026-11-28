import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { COMPLETION_PATH, INCIDENT_QUEUE_PATH, dashboardNavGroups } from '../../data/dashboardMock';
import { useDispatchStore } from '../../context/DispatchContext';
import { hasPendingCompletion } from './completion/completionGroups';
import { autoDispatchVerdictAt, needsOperator } from './incidents/autoDispatchVerdict';
import { useNow } from '../../hooks/useNow';
import { useTranslation } from '../../i18n';

const LIVE_MAP_PATH = '/dashboard/command-center/live-map';

const NAV_LABEL_KEY = {
  '/dashboard/command-center/live-map': 'layout.nav.liveMap',
  '/dashboard/command-center/incidents': 'layout.nav.incidentQueue',
  '/dashboard/command-center/completion': 'layout.nav.completion',
  '/dashboard/command-center/station-teams': 'layout.nav.stationTeams',
  '/dashboard/command-center/vehicles': 'layout.nav.vehicles',
} as const;

const NAV_SHORT_KEY = {
  '/dashboard/command-center/live-map': 'layout.navShort.liveMap',
  '/dashboard/command-center/incidents': 'layout.navShort.incidentQueue',
  '/dashboard/command-center/completion': 'layout.navShort.completion',
  '/dashboard/command-center/station-teams': 'layout.navShort.stationTeams',
  '/dashboard/command-center/vehicles': 'layout.navShort.vehicles',
} as const satisfies Record<keyof typeof NAV_LABEL_KEY, string>;

/**
 * Thanh điều hướng Operator (80 px, kiểu navigation rail): icon + nhãn ngắn luôn hiện, tên đầy đủ trong tooltip; badge đỏ
 * = ca chờ người thẩm định (Hàng đợi), badge vàng = ca còn tổ chưa nghiệm thu.
 */
export const OperatorSidebar: React.FC = () => {
  const { incidents, assignmentsByIncident, autoDispatchSettings } = useDispatchStore();
  // Chỉ để ca "AI chưa quyết" quá hạn rơi về đếm của người — không cần chính xác từng giây.
  const now = useNow(30_000);
  const { t } = useTranslation();
  // §31.E: chỉ đếm ca cần Operator (AI đang phân tích / điều phối thì chưa tới lượt người) — badge đỏ trên icon Hàng đợi.
  const pendingCount = incidents.filter(
    (i) => i.status === 'pending' && needsOperator(autoDispatchVerdictAt(i, autoDispatchSettings, now))
  ).length;
  // §26.2: sự cố đang xử lý còn tổ chưa ký nghiệm thu (badge vàng — không khẩn như ca chờ thẩm định).
  const awaitingCompletionCount = incidents.filter(
    (i) => i.status === 'approved' && hasPendingCompletion(assignmentsByIncident.get(i.id))
  ).length;

  const location = useLocation();
  const navigate = useNavigate();
  // Đang ở Live Map mà bấm lại icon → về "Theo dõi ca". Giữ query (VD ?create=1) để trang tự hỏi trước khi bỏ form.
  const handleNavClick = (e: React.MouseEvent, path: string) => {
    if (path !== LIVE_MAP_PATH || location.pathname !== LIVE_MAP_PATH) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(`${location.pathname}${location.search}`, { replace: true, state: { liveMapHome: true } });
  };

  return (
    // Thanh điều hướng 80px dưới topbar: icon + nhãn ngắn luôn hiện (không cần rê chuột); tên đầy đủ trong tooltip.
    <aside className="flex flex-col h-full w-20 shrink-0 bg-white border-r border-slate-200">
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-1.5 flex flex-col gap-1">
        {dashboardNavGroups.map((group) =>
          group.items.map((item) => {
            const Icon = item.icon;
            const badge =
              item.path === INCIDENT_QUEUE_PATH ? pendingCount : item.path === COMPLETION_PATH ? awaitingCompletionCount : 0;
            const badgeClass = item.path === COMPLETION_PATH ? 'bg-amber-500' : 'bg-red-600';
            const known = item.path in NAV_LABEL_KEY ? (item.path as keyof typeof NAV_LABEL_KEY) : null;
            const fullLabel = known ? t(NAV_LABEL_KEY[known]) : item.label;
            const shortLabel = known ? t(NAV_SHORT_KEY[known]) : item.label;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavClick(e, item.path)}
                title={badge > 0 ? `${fullLabel} (${badge})` : fullLabel}
                className={({ isActive }) =>
                  `relative flex flex-col items-center gap-1 w-full px-1 pt-2 pb-1.5 rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-500 ${
                    isActive ? 'bg-red-50 text-red-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Mục đang mở: vạch đỏ sát mép trái thanh bên. */}
                    {isActive && (
                      <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r bg-red-600" />
                    )}
                    <span className="relative">
                      <Icon className="w-5 h-5" />
                      {badge > 0 && (
                        <span
                          className={`absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full ${badgeClass} text-white text-[10px] font-bold flex items-center justify-center border-2 border-white`}
                        >
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </span>
                    <span
                      className={`w-full text-center text-[11px] leading-tight break-words ${isActive ? 'font-bold' : 'font-semibold'}`}
                    >
                      {shortLabel}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })
        )}
      </nav>
    </aside>
  );
};
