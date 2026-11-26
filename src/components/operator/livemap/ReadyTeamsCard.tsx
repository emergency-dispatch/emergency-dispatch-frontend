import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { DispatchTeamLabel } from '../teams/DispatchTeamLabel';
import { useReadyTeams } from './readyTeams';
import { useTranslation } from '../../../i18n';

/**
 * Thẻ nổi trên bản đồ Live Map: các tổ còn sẵn sàng (xe Sẵn sàng, tổ không bận, `canBeAssigned`). Chỉ để nắm lực
 * lượng; giao xe làm ở Chi tiết ca. Mặc định thu gọn để không che bản đồ.
 * §34: backend chỉ gợi ý / cho giao tổ `canBeAssigned` (có xe + ≥ 1 nhân viên cứu hộ đang hoạt động) → tổ có xe rảnh
 * nhưng không đủ điều kiện không tính là sẵn sàng, chỉ đếm riêng để Operator biết mà kiểm tra ở Trạm & Tổ.
 * Backend tìm tổ theo GPS xe → tổ có xe GPS lệch xa trạm vẫn liệt kê nhưng cảnh báo và không tính vào số sẵn sàng.
 */
export const ReadyTeamsCard: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { readyTeams, readyCount, blockedCount } = useReadyTeams();
  const hasFarTeam = readyTeams.length > readyCount;

  return (
    <div className="absolute left-4 top-[76px] z-[1000] w-[min(280px,calc(100%-2rem))] rounded-xl border border-slate-200 bg-white shadow-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-xl"
      >
        <Users className={`w-4 h-4 shrink-0 ${readyCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
        <span className="text-[13px] font-semibold text-slate-800">{t('liveMap.readyTeams.title')}</span>
        <span className={`text-xs font-bold ${readyCount > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
          {readyCount}
        </span>
        {hasFarTeam && (
          <span title={t('liveMap.readyTeams.gpsFarTitle')} className="inline-flex">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-label={t('liveMap.readyTeams.gpsFarTitle')} />
          </span>
        )}
        <span className="ml-auto text-slate-400">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open && (
        <div className="max-h-64 overflow-y-auto border-t border-slate-100 px-3 py-2 space-y-1.5">
          {readyTeams.length === 0 ? (
            <p className="text-xs text-slate-400 py-2 text-center">{t('liveMap.recommend.noReadyTeams')}</p>
          ) : (
            readyTeams.map(({ vehicle, team, farKm }) => (
              <div
                key={team.id}
                className={`rounded-lg border px-2.5 py-1.5 ${
                  farKm !== null ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <DispatchTeamLabel team={team} vehicle={vehicle} detail={` · ${vehicle.stationName}`} />
                {farKm !== null && (
                  <p className="flex items-start gap-1 mt-1 text-[10px] leading-snug text-amber-800">
                    <AlertTriangle className="w-3 h-3 mt-px shrink-0" />
                    {t('liveMap.readyTeams.gpsFar', { km: farKm.toFixed(1) })}
                  </p>
                )}
              </div>
            ))
          )}
          {blockedCount > 0 && (
            <p className="flex items-start gap-1.5 pt-1 text-[11px] leading-snug text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
              {t('liveMap.readyTeams.blocked', { count: blockedCount })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
