import React from 'react';
import { AlertTriangle, Crown, Users } from 'lucide-react';
import { TEAM_FUNCTION_META } from './teamFunction';
import { MIN_TEAM_SIZE } from '../../../data/dispatchConfig';
import type { StationTeam } from '../../../types/stationTeam';
import type { Vehicle } from '../../../types/vehicle';
import { useTranslation } from '../../../i18n';

interface DispatchTeamLabelProps {
  team: StationTeam;
  vehicle: Vehicle;
  /** Dòng phụ dưới cùng (khoảng cách, trạng thái, ETA…), đứng sau biển số xe. */
  detail?: React.ReactNode;
}

/** Tổ trong Dispatch Panel: tên tổ + chức năng (theo loại xe), tổ trưởng / số người, biển số xe ghi nhỏ. */
export const DispatchTeamLabel: React.FC<DispatchTeamLabelProps> = ({ team, vehicle, detail }) => {
  const { t } = useTranslation();
  const fn = TEAM_FUNCTION_META[vehicle.type];
  const FnIcon = fn.icon;
  const leader = team.members.find((m) => m.crewRole === 'commander');
  const size = team.members.length;
  const understaffed = size < MIN_TEAM_SIZE;

  return (
    <div className="min-w-0 space-y-0.5">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs font-bold text-slate-900 truncate">{team.name}</span>
        <span
          className={`inline-flex items-center gap-0.5 px-1.5 py-px rounded border text-[9px] font-bold whitespace-nowrap shrink-0 ${fn.badgeClass}`}
        >
          <FnIcon className="w-2.5 h-2.5" />
          {t(`enums.teamFunction.${vehicle.type}`)}
        </span>
      </div>
      <p
        className={`flex items-center gap-1 text-[10px] truncate ${understaffed ? 'font-semibold text-amber-600' : 'text-slate-500'}`}
      >
        {understaffed ? (
          <AlertTriangle className="w-3 h-3 shrink-0" />
        ) : leader ? (
          <Crown className="w-3 h-3 text-amber-500 shrink-0" />
        ) : (
          <Users className="w-3 h-3 shrink-0" />
        )}
        <span className="truncate">
          {leader?.fullName ? `${leader.fullName} · ` : ''}
          {understaffed
            ? t('liveMap.teamLabel.understaffed', { size, min: MIN_TEAM_SIZE })
            : t('liveMap.teamLabel.members', { count: size })}
        </span>
      </p>
      <p className="text-[10px] text-slate-400 truncate">
        <span className="font-mono-data">{vehicle.plate}</span>
        {detail}
      </p>
    </div>
  );
};
