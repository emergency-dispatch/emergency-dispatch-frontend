import React from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import { MIN_TEAM_SIZE } from '../../../data/dispatchConfig';
import type { StationTeam } from '../../../types/stationTeam';

/** Tổ đi kèm xe trong Dispatch Panel — cảnh báo khi xe chưa có tổ hoặc tổ thiếu người. */
export const VehicleTeamTag: React.FC<{ team: StationTeam | undefined }> = ({ team }) => {
  if (!team) {
    return (
      <p className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 truncate">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        Chưa có tổ phụ trách
      </p>
    );
  }

  const size = team.members.length;
  const understaffed = size < MIN_TEAM_SIZE;
  const Icon = understaffed ? AlertTriangle : Users;
  return (
    <p
      className={`flex items-center gap-1 text-[10px] truncate ${
        understaffed ? 'font-semibold text-amber-600' : 'text-slate-500'
      }`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span className="truncate">
        {team.name} · {understaffed ? `thiếu người (${size}/${MIN_TEAM_SIZE})` : `${size} người`}
      </span>
    </p>
  );
};
