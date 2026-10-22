import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, Loader2, MapPin, X } from 'lucide-react';
import { INCIDENT_CATEGORY_META } from '../../data/incidentMock';
import { useDispatchStore } from '../../context/DispatchContext';
import { useNow } from '../../hooks/useNow';
import { SeverityBadge } from './incidents/SeverityBadge';
import type { Incident } from '../../types/incident';

const MAX_VISIBLE = 3;
// Tự đóng sau 30 giây — sự cố vẫn nằm trong hàng đợi (và số đếm ở sidebar), chỉ thông báo nổi biến mất.
const AUTO_DISMISS_MS = 30000;
const QUEUE_PATH = '/dashboard/command-center/incidents';

const ToastCard: React.FC<{ incident: Incident; now: number; onOpen: () => void; onDismiss: () => void }> = ({
  incident,
  now,
  onOpen,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // Hẹn giờ một lần cho mỗi thông báo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const minutes = Math.max(0, Math.floor((now - new Date(incident.createdAt).getTime()) / 60000));

  return (
    <div
      role="alert"
      className="pointer-events-auto w-full rounded-xl bg-white border border-slate-200 border-l-4 border-l-red-600 shadow-xl shadow-slate-900/15 p-3 animate-drawer-in"
    >
      <div className="flex items-start gap-2.5">
        <span className="p-1.5 rounded-lg bg-red-50 text-red-600 shrink-0">
          <BellRing className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono-data uppercase tracking-widest text-red-600 font-bold">
              Tin báo mới
            </span>
            <span className="text-[10px] font-mono-data text-slate-400 whitespace-nowrap">
              {minutes === 0 ? 'vừa xong' : `${minutes} phút trước`}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{incident.title}</p>
          <p className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{incident.area}</span>
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            {incident.aiPending ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                AI đang phân tích
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: category.color }}>
                  <CategoryIcon className="w-3.5 h-3.5" />
                  {category.label}
                </span>
                <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
              </>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          aria-label="Đóng thông báo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        onClick={onOpen}
        className="mt-2.5 w-full py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
      >
        Thẩm định ngay
      </button>
    </div>
  );
};

/**
 * Thông báo nổi khi có tin báo mới từ người dân (SignalR ReceiveNewIncident, kèm tiếng bíp ở DispatchContext).
 * Hiện ở mọi màn Command Center; Drawer chi tiết đang mở thì dời sang trái để không che Drawer.
 */
export const IncomingIncidentToasts: React.FC = () => {
  const { incomingIncidents, dismissIncomingIncident, incidentDrawerOpen } = useDispatchStore();
  const navigate = useNavigate();
  const now = useNow(30000);

  if (incomingIncidents.length === 0) return null;

  const visible = incomingIncidents.slice(0, MAX_VISIBLE);
  const hidden = incomingIncidents.length - visible.length;

  const open = (id: string) => {
    dismissIncomingIncident(id);
    navigate(QUEUE_PATH, { state: { openIncidentId: id } });
  };

  return (
    <div
      className={`pointer-events-none fixed top-20 z-[1502] w-[min(22rem,calc(100vw-2rem))] space-y-2 ${
        incidentDrawerOpen ? 'left-4' : 'right-4'
      }`}
    >
      {visible.map((incident) => (
        <ToastCard
          key={incident.id}
          incident={incident}
          now={now}
          onOpen={() => open(incident.id)}
          onDismiss={() => dismissIncomingIncident(incident.id)}
        />
      ))}
      {hidden > 0 && (
        <button
          onClick={() => navigate(QUEUE_PATH)}
          className="pointer-events-auto w-full py-2 rounded-xl bg-slate-900/85 text-white text-xs font-bold shadow-lg hover:bg-slate-900"
        >
          +{hidden} tin báo mới khác — mở hàng đợi
        </button>
      )}
    </div>
  );
};
