import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useAuth } from '../../../hooks/useAuth';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import { useTranslation } from '../../../i18n';
import { getBusyTeamIds } from '../../../utils/teamAvailability';
import type { DispatchShortage } from '../../../types/vehicle';

interface DispatchShortagesProps {
  shortages: DispatchShortage[];
}

interface ReasonRow {
  key: string;
  plate: string;
  owner: string;
  reason: string;
}

/**
 * FR-OP-04: vì sao một chức năng không có tổ để giao. Xe trạm mình nói rõ từng xe; xe trạm khác chỉ biết trường hợp
 * quá xa (Operator không xem được tổ của trạm khác).
 */
export const DispatchShortages: React.FC<DispatchShortagesProps> = ({ shortages }) => {
  const { vehicles, unitTypeLabel } = useDispatchStore();
  const { user } = useAuth();
  const teamByVehicle = useTeamByVehicle();
  const { t } = useTranslation();
  const busyTeamIds = getBusyTeamIds(vehicles, teamByVehicle);

  const reasonsOf = ({ unitType, farTeams }: DispatchShortage): { rows: ReasonRow[]; noOwnVehicle: boolean } => {
    const far = farTeams ?? [];
    const farTeamIds = new Set(far.map((f) => f.teamId));
    const rows: ReasonRow[] = far.map((f) => ({
      key: f.vehicleId,
      plate: f.plate,
      owner: `${f.teamName} · ${f.stationName}`,
      reason: t('liveMap.shortage.tooFar', { km: f.km.toFixed(1) }),
    }));
    // Chưa biết cần chức năng nào → không suy được xe nào của trạm bị loại vì lý do gì.
    if (!unitType) return { rows, noOwnVehicle: false };

    const own = vehicles.filter(
      (v) => v.status === 'available' && v.unitType === unitType && !!user?.stationId && v.stationId === user.stationId
    );
    own.forEach((v) => {
      const team = teamByVehicle.get(v.id);
      // Backend chỉ trả xe gần nhất của mỗi tổ: tổ đã có dòng "quá xa" thì các xe còn lại của tổ không cần lặp.
      if (rows.some((r) => r.key === v.id) || (team && farTeamIds.has(team.id))) return;
      const reason = !team
        ? t('liveMap.shortage.noTeam')
        : !team.canBeAssigned
          ? t('liveMap.shortage.noStaff')
          : busyTeamIds.has(team.id)
            ? t('liveMap.shortage.busy')
            : t('liveMap.shortage.unknown');
      rows.push({ key: v.id, plate: v.plate, owner: team?.name ?? '', reason });
    });
    return { rows, noOwnVehicle: own.length === 0 };
  };

  return (
    <>
      {shortages.map((shortage) => {
        const { rows, noOwnVehicle } = reasonsOf(shortage);
        return (
          <div
            key={shortage.unitType ?? 'any'}
            className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 space-y-1.5"
          >
            <p className="flex items-start gap-1.5 text-[11px] font-bold text-amber-900 leading-snug">
              <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
              {shortage.unitType
                ? t('liveMap.shortage.title', { type: unitTypeLabel(shortage.unitType) })
                : t('liveMap.recommend.noneLeft')}
            </p>
            <p className="text-[11px] text-amber-800 leading-snug">{shortage.message}</p>
            {rows.length > 0 && (
              <ul className="space-y-1 border-t border-amber-200 pt-1.5">
                {rows.map((row) => (
                  <li key={row.key} className="text-[11px] text-slate-700 leading-snug">
                    <span className="font-mono-data font-semibold">{row.plate}</span>
                    {row.owner && <span className="text-slate-500"> · {row.owner}</span>}
                    <span className="block text-red-700">{row.reason}</span>
                  </li>
                ))}
              </ul>
            )}
            {noOwnVehicle && <p className="text-[11px] text-slate-600">{t('liveMap.shortage.noOwnVehicle')}</p>}
            {shortage.farTeams === null && (
              <p className="text-[11px] text-slate-600">{t('liveMap.shortage.probeFailed')}</p>
            )}
          </div>
        );
      })}
    </>
  );
};
