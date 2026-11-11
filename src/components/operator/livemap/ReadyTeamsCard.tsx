import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { DispatchTeamLabel } from '../teams/DispatchTeamLabel';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import { getBusyTeamIds } from '../../../utils/teamAvailability';
import { useTranslation } from '../../../i18n';

/**
 * Thẻ nổi trên bản đồ Live Map: các tổ còn sẵn sàng (xe Sẵn sàng, tổ không bận). Chỉ để nắm lực lượng;
 * giao xe làm ở Chi tiết ca. Mặc định thu gọn để không che bản đồ.
 */
export const ReadyTeamsCard: React.FC = () => {
  const { vehicles } = useDispatchStore();
  const teamByVehicle = useTeamByVehicle();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const readyTeams = useMemo(() => {
    const busyTeamIds = getBusyTeamIds(vehicles, teamByVehicle);
    // Một tổ nhiều xe sẵn sàng → hiện một dòng theo xe đầu tiên.
    const seen = new Set<string>();
    return vehicles
      .filter((v) => v.status === 'available')
      .flatMap((v) => {
        const team = teamByVehicle.get(v.id);
        if (!team || busyTeamIds.has(team.id) || seen.has(team.id)) return [];
        seen.add(team.id);
        return [{ vehicle: v, team }];
      })
      .sort((a, b) => a.team.name.localeCompare(b.team.name, 'vi'));
  }, [vehicles, teamByVehicle]);

  return (
    <div className="absolute left-4 top-[76px] z-[1000] w-[min(280px,calc(100%-2rem))] rounded-xl border border-slate-200 bg-white shadow-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-xl"
      >
        <Users className={`w-4 h-4 shrink-0 ${readyTeams.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
        <span className="text-[13px] font-semibold text-slate-800">{t('liveMap.readyTeams.title')}</span>
        <span className={`text-xs font-bold ${readyTeams.length > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
          {readyTeams.length}
        </span>
        <span className="ml-auto text-slate-400">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open && (
        <div className="max-h-64 overflow-y-auto border-t border-slate-100 px-3 py-2 space-y-1.5">
          {readyTeams.length === 0 ? (
            <p className="text-xs text-slate-400 py-2 text-center">{t('liveMap.recommend.noReadyTeams')}</p>
          ) : (
            readyTeams.map(({ vehicle, team }) => (
              <div key={team.id} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                <DispatchTeamLabel team={team} vehicle={vehicle} detail={` · ${vehicle.stationName}`} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
