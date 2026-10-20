import React from 'react';
import { AlertTriangle, Building2, Crown, Pencil, Trash2 } from 'lucide-react';
import { LockableButton, VehicleStatusBadge } from '../../admin/common/ui';
import { iconButtonClass } from '../../admin/common/styles';
import { MIN_TEAM_SIZE } from '../../../data/dispatchConfig';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../../data/liveMapMock';
import { CREW_ROLE_LABEL } from '../../../types/shift';
import type { StationStaff, StationTeam } from '../../../types/stationTeam';
import type { Vehicle } from '../../../types/vehicle';

interface TeamCardProps {
  team: StationTeam;
  staffById: Map<string, StationStaff>;
  vehicle: Vehicle | undefined;
  /** Lý do khóa sửa/xóa (xe của tổ đang làm nhiệm vụ), null = thao tác được. */
  lockedReason: string | null;
  onEdit: () => void;
  onDelete: () => void;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, staffById, vehicle, lockedReason, onEdit, onDelete }) => {
  const members = [...team.members].sort(
    (a, b) => Number(b.crewRole === 'commander') - Number(a.crewRole === 'commander')
  );
  const understaffed = team.members.length < MIN_TEAM_SIZE;
  const TypeIcon = vehicle ? VEHICLE_TYPE_META[vehicle.type].icon : Building2;

  return (
    <div className={`rounded-xl border bg-white p-4 space-y-3 ${understaffed ? 'border-amber-300' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 truncate">{team.name}</h3>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
              <TypeIcon className="w-3.5 h-3.5 shrink-0" />
              {vehicle ? (
                <>
                  <span className="font-mono-data font-bold text-red-600">{vehicle.plate}</span>·{' '}
                  {VEHICLE_TYPE_META[vehicle.type].label}
                </>
              ) : team.vehicleId ? (
                'Xe không còn trên hệ thống'
              ) : (
                'Trực tại trạm'
              )}
            </span>
            {vehicle && (
              <VehicleStatusBadge
                label={VEHICLE_STATUS_META[vehicle.status].label}
                color={VEHICLE_STATUS_META[vehicle.status].color}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <LockableButton
            onClick={onEdit}
            lockedReason={lockedReason}
            title="Sửa tổ"
            aria-label={`Sửa ${team.name}`}
            className={iconButtonClass}
          >
            <Pencil className="w-4 h-4" />
          </LockableButton>
          <LockableButton
            onClick={onDelete}
            lockedReason={lockedReason}
            title="Xóa tổ"
            aria-label={`Xóa ${team.name}`}
            className={iconButtonClass}
          >
            <Trash2 className="w-4 h-4" />
          </LockableButton>
        </div>
      </div>

      {understaffed && (
        <div className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Tổ thiếu người ({team.members.length}/{MIN_TEAM_SIZE}) — sẽ bị cảnh báo khi giao xe
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-xs text-slate-400">Chưa có thành viên</p>
      ) : (
        <ul className="space-y-1.5">
          {members.map((m) => {
            const person = staffById.get(m.staffId);
            const isLeader = m.crewRole === 'commander';
            return (
              <li key={m.staffId} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 min-w-0">
                  {isLeader && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label="Tổ trưởng" />}
                  <span className={`truncate ${isLeader ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                    {person?.fullName ?? m.staffId}
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                  {isLeader ? 'Tổ trưởng' : CREW_ROLE_LABEL[m.crewRole]}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {lockedReason && <p className="text-[11px] text-slate-400">{lockedReason}</p>}
    </div>
  );
};
