import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, ClipboardCheck, HandHelping, MapPinOff, MessageSquarePlus, Radio, TrafficCone, X } from 'lucide-react';
import { useDispatchStore, type OperatorAlert } from '../../context/DispatchContext';
import { useTranslation } from '../../i18n';
import { COMPLETION_PATH } from '../../data/dashboardMock';

const KIND_META: Record<
  OperatorAlert['kind'],
  {
    icon: React.ElementType;
    className: string;
    iconClassName: string;
    action?: 'verify' | 'viewOnMap' | 'viewDetail' | 'assignTrafficTeam' | 'openFieldRequest' | 'viewCompletion';
  }
> = {
  out_of_area: {
    icon: MapPinOff,
    className: 'border-red-300 bg-red-600 text-white',
    iconClassName: 'text-white',
    action: 'verify',
  },
  support_dispatched: {
    icon: HandHelping,
    className: 'border-blue-200 bg-white text-slate-800',
    iconClassName: 'text-blue-600',
    action: 'viewOnMap',
  },
  transferred: {
    icon: ArrowRightLeft,
    className: 'border-slate-200 bg-white text-slate-800',
    iconClassName: 'text-slate-500',
  },
  transferred_in: {
    icon: ArrowRightLeft,
    className: 'border-blue-200 bg-white text-slate-800',
    iconClassName: 'text-blue-600',
  },
  supplement: {
    icon: MessageSquarePlus,
    className: 'border-amber-300 bg-white text-slate-800',
    iconClassName: 'text-amber-600',
    action: 'viewDetail',
  },
  traffic_escalation: {
    icon: TrafficCone,
    className: 'border-red-300 bg-red-600 text-white',
    iconClassName: 'text-white',
    action: 'assignTrafficTeam',
  },
  field_request: {
    icon: Radio,
    className: 'border-orange-300 bg-white text-slate-800',
    iconClassName: 'text-orange-600',
    action: 'openFieldRequest',
  },
  field_request_escalated: {
    icon: Radio,
    className: 'border-red-300 bg-red-600 text-white',
    iconClassName: 'text-white',
    action: 'openFieldRequest',
  },
  team_completed: {
    icon: ClipboardCheck,
    className: 'border-emerald-200 bg-white text-slate-800',
    iconClassName: 'text-emerald-600',
    action: 'viewCompletion',
  },
};

/**
 * Thông báo vận hành theo trạm (từ SignalR): SOS ngoài khu vực phục vụ (đỏ, giữ tới khi đóng),
 * xe trạm mình được điều hỗ trợ trạm khác, sự cố chuyển đi / chuyển tới trạm mình, người báo bổ sung thông tin (tự đóng).
 */
export const OperatorAlerts: React.FC = () => {
  const { operatorAlerts, dismissOperatorAlert, incidents } = useDispatchStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (operatorAlerts.length === 0) return null;

  const open = (alert: OperatorAlert) => {
    dismissOperatorAlert(alert.id);
    if (alert.trafficJamId) {
      navigate('/dashboard/command-center/live-map', { state: { focusTrafficJamId: alert.trafficJamId } });
      return;
    }
    // §21.2: mở Live Map, làm nổi yêu cầu trong mục "Yêu cầu từ hiện trường".
    if (alert.fieldRequestId) {
      navigate('/dashboard/command-center/live-map', {
        state: { focusFieldRequestId: alert.fieldRequestId, focusIncidentId: alert.incidentId },
      });
      return;
    }
    // §26.2: mở màn Nghiệm thu đúng sự cố.
    if (alert.kind === 'team_completed') {
      navigate(`${COMPLETION_PATH}?incident=${encodeURIComponent(alert.incidentId)}`);
      return;
    }
    const incident = incidents.find((i) => i.id === alert.incidentId);
    // Sự cố chưa duyệt → mở drawer thẩm định ở hàng đợi; đã duyệt → chọn trên Live Map.
    if ((alert.kind === 'out_of_area' || alert.kind === 'supplement') && incident?.status === 'pending') {
      navigate('/dashboard/command-center/incidents', { state: { openIncidentId: alert.incidentId } });
    } else {
      navigate('/dashboard/command-center/live-map', { state: { focusIncidentId: alert.incidentId } });
    }
  };

  return (
    // Trên cả modal tin báo mới (z-[9999]): chuyển trạm / SOS ngoài khu vực luôn tới cùng lúc với modal đó.
    <div className="pointer-events-none fixed bottom-4 right-4 z-[10000] w-[min(24rem,calc(100vw-2rem))] space-y-2">
      {operatorAlerts.map((alert) => {
        const meta = KIND_META[alert.kind];
        const Icon = meta.icon;
        const isDanger =
          alert.kind === 'out_of_area' || alert.kind === 'traffic_escalation' || alert.kind === 'field_request_escalated';
        return (
          <div
            key={alert.id}
            role={isDanger ? 'alert' : 'status'}
            className={`pointer-events-auto rounded-xl border shadow-xl p-3 animate-drawer-in ${meta.className}`}
          >
            <div className="flex items-start gap-2.5">
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${meta.iconClassName}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{alert.title}</p>
                <p className={`text-xs mt-0.5 ${isDanger ? 'text-red-50' : 'text-slate-600'}`}>{alert.message}</p>
                {meta.action && (
                  <button
                    onClick={() => open(alert)}
                    className={`mt-2 px-2.5 py-1 rounded-md text-xs font-bold ${
                      isDanger ? 'bg-white text-red-700 hover:bg-red-50' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {t(`layout.operatorAlerts.${meta.action}`)}
                  </button>
                )}
              </div>
              <button
                onClick={() => dismissOperatorAlert(alert.id)}
                aria-label={t('layout.operatorAlerts.dismiss')}
                className={`p-1 rounded-md shrink-0 ${isDanger ? 'hover:bg-red-500' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
