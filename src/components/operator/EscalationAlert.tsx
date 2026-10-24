import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Siren } from 'lucide-react';
import { INCIDENT_CATEGORY_META } from '../../data/incidentMock';
import { useDispatchStore } from '../../context/DispatchContext';
import { useNow } from '../../hooks/useNow';
import { escalationThresholdMinutes, isNightShift } from '../../utils/escalation';

/**
 * Báo động leo thang toàn dashboard (FR-SYS-02): viền đỏ + banner khi backend đánh dấu sự cố
 * Escalated (Cấp 3 chưa có đội nhận quá ngưỡng cấu hình). Tự biến mất khi có đơn vị nhận.
 */
export const EscalationAlert: React.FC = () => {
  const { incidents, escalatedIncidentIds, incidentDrawerOpen, escalationSettings, escalationTiers } = useDispatchStore();
  const navigate = useNavigate();
  const now = useNow(15000);
  // Thu gọn theo "bộ sự cố" hiện tại — có sự cố mới leo thang thì banner tự mở lại.
  const [collapsedKey, setCollapsedKey] = useState<string | null>(null);
  // Khi Drawer đang mở, banner mặc định thu gọn; bấm nút nhỏ để xem nhanh ("peek").
  const [peekKey, setPeekKey] = useState<string | null>(null);

  const escalated = incidents.filter((i) => escalatedIncidentIds.has(i.id));
  if (escalated.length === 0) return null;

  const key = escalated.map((i) => i.id).sort().join('|');
  const collapsed = incidentDrawerOpen ? peekKey !== key : collapsedKey === key;

  const expand = () => (incidentDrawerOpen ? setPeekKey(key) : setCollapsedKey(null));
  const collapse = () => (incidentDrawerOpen ? setPeekKey(null) : setCollapsedKey(key));

  // Drawer chiếm tối đa 64rem bên phải → đặt banner vào giữa vùng còn trống bên trái để không che Drawer.
  const positionStyle = (halfWidth: string): React.CSSProperties =>
    incidentDrawerOpen ? { left: `max(1rem, calc((100vw - 64rem) / 2 - ${halfWidth}))` } : {};
  const centeredClass = incidentDrawerOpen ? '' : 'left-1/2 -translate-x-1/2';
  const thresholdMinutes = escalationThresholdMinutes(now, escalationSettings);
  const thresholdLabel = `${thresholdMinutes.toLocaleString('vi-VN')} phút${isNightShift(now, escalationSettings) ? ' (ca đêm)' : ''}`;

  const openIncident = (id: string, status: string) => {
    if (status === 'pending') navigate('/dashboard/command-center/incidents');
    else navigate('/dashboard/command-center/live-map', { state: { focusIncidentId: id } });
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[1500] border-4 border-red-600 animate-pulse" />

      {collapsed ? (
        <button
          onClick={expand}
          style={positionStyle('6rem')}
          className={`fixed top-20 ${centeredClass} z-[1501] px-3.5 py-2 rounded-full bg-red-600 text-white text-xs font-bold shadow-xl shadow-red-900/30 hover:bg-red-700`}
        >
          {/* Nhấp nháy bằng vòng lan ra phía sau — nền nút giữ đỏ đặc để chữ trắng luôn đọc được. */}
          <span aria-hidden className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-40" />
          <span className="relative flex items-center gap-2">
            <Siren className="w-4 h-4" />
            {escalated.length} sự cố đang leo thang
          </span>
        </button>
      ) : (
        <div
          role="alert"
          style={positionStyle('320px')}
          className={`fixed top-20 ${centeredClass} z-[1501] w-[min(640px,calc(100%-2rem))] rounded-xl bg-red-600 text-white shadow-2xl shadow-red-900/30`}
        >
          <div className="flex items-start gap-3 px-4 pt-3.5 pb-2">
            <Siren className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">
                {escalated.length} sự cố quá {thresholdLabel} chưa có đơn vị nhận
              </p>
              <p className="text-[11px] text-red-100 mt-0.5">
                Đã tự động báo Operator phụ trách trạm &amp; Admin (quá gấp đôi ngưỡng thì báo mọi trạm) · bán kính tìm xe đã nhân {escalationSettings.radiusMultiplier.toLocaleString('vi-VN')} lần (tối đa {escalationSettings.maxRadiusKm} km)
              </p>
            </div>
            <button
              onClick={collapse}
              className="p-1 rounded-md hover:bg-red-500 shrink-0"
              aria-label="Thu gọn cảnh báo"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="px-3 pb-3 space-y-1.5 max-h-48 overflow-y-auto">
            {escalated.map((incident) => {
              const category = INCIDENT_CATEGORY_META[incident.category];
              const CategoryIcon = category.icon;
              const waitMinutes = Math.max(0, Math.floor((now - new Date(incident.createdAt).getTime()) / 60000));
              return (
                <div key={incident.id} className="flex items-center gap-2.5 rounded-lg bg-red-700/60 px-3 py-2">
                  <CategoryIcon className="w-4 h-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {(escalationTiers.get(incident.id) ?? 1) >= 2 && (
                        <span className="mr-1.5 px-1 rounded bg-white text-red-700 text-[9px] font-black uppercase">
                          Cấp 2 · cần trạm khác hỗ trợ
                        </span>
                      )}
                      {incident.title}
                    </p>
                    <p className="text-[10px] text-red-100 truncate">
                      {incident.area} · chờ {waitMinutes} phút ·{' '}
                      {incident.status === 'pending' ? 'chưa thẩm định' : 'chưa có đội nhận'}
                    </p>
                  </div>
                  <button
                    onClick={() => openIncident(incident.id, incident.status)}
                    className="px-2.5 py-1 rounded-md bg-white text-red-700 text-[11px] font-bold hover:bg-red-50 shrink-0"
                  >
                    {incident.status === 'pending' ? 'Thẩm định' : 'Điều phối'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
