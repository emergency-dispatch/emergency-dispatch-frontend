import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useAuth } from '../../../hooks/useAuth';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import { useTranslation } from '../../../i18n';
import { getBusyTeamIds } from '../../../utils/teamAvailability';
import type { DispatchShortage, Vehicle } from '../../../types/vehicle';

interface DispatchShortagesProps {
  shortages: DispatchShortage[];
  /** Số tổ còn thiếu theo loại xe (kế hoạch); không có thì chỉ ghi tên loại. */
  missingByType?: ReadonlyMap<string, number>;
  /** Ca đang xem — xe đã giao cho chính ca này không phải lý do thiếu. */
  incidentId: string;
  /** Mở ca đang giữ xe (để cân nhắc thu hồi); không truyền thì chỉ hiện mã ca. */
  onOpenIncident?: (incidentId: string) => void;
}

interface OwnRow {
  key: string;
  plate: string;
  teamName: string;
  reason: string;
  kind: 'mission' | 'unavailable' | 'ineligible' | 'far';
  openIncidentId?: string;
}

/**
 * FR-OP-04: các chức năng chưa có tổ để giao — mỗi chức năng một dòng kèm lý do chính, bấm mới mở chi tiết từng xe. Trạm
 * khác chỉ ghi số tổ đủ điều kiện nhưng ngoài bán kính; xe họ chưa đủ điều kiện là việc của trạm đó, không hiện ở đây.
 */
export const DispatchShortages: React.FC<DispatchShortagesProps> = ({
  shortages,
  missingByType,
  incidentId,
  onOpenIncident,
}) => {
  const { vehicles, incidents, assignmentsByIncident, unitTypeLabel } = useDispatchStore();
  const { user } = useAuth();
  const teamByVehicle = useTeamByVehicle();
  const { t } = useTranslation();
  const [openKey, setOpenKey] = useState<string | null>(null);
  if (shortages.length === 0) return null;

  const busyTeamIds = getBusyTeamIds(vehicles, teamByVehicle);
  const myStationId = user?.stationId ?? null;

  const ownRowOf = (v: Vehicle, farKm: number | undefined): OwnRow => {
    const team = teamByVehicle.get(v.id);
    const base = { key: v.id, plate: v.plate, teamName: team?.name ?? '' };
    if (v.status !== 'available') {
      const status =
        v.unitStatus === 'OutOfService' ? t('enums.vehicleStatus.outOfService') : t(`enums.vehicleStatus.${v.status}`);
      if (!v.incidentId) return { ...base, reason: status, kind: 'unavailable' };
      const incident = incidents.find((i) => i.id === v.incidentId);
      // Xe đi hỗ trợ ca trạm khác: ca không có trong bảng, lấy mã từ lượt điều xe.
      const code =
        incident?.code ?? assignmentsByIncident.get(v.incidentId)?.find((a) => a.rescueUnitId === v.id)?.incidentCode;
      return {
        ...base,
        reason: code || t('liveMap.shortage.otherCase'),
        kind: 'mission',
        openIncidentId: incident?.status === 'approved' ? incident.id : undefined,
      };
    }
    if (farKm !== undefined) return { ...base, reason: t('liveMap.shortage.tooFar', { km: farKm.toFixed(1) }), kind: 'far' };
    const reason = !team
      ? t('liveMap.shortage.noTeam')
      : !team.canBeAssigned
        ? t('liveMap.shortage.noStaff')
        : busyTeamIds.has(team.id)
          ? t('liveMap.shortage.busy')
          : t('liveMap.shortage.unknown');
    return { ...base, reason, kind: 'ineligible' };
  };

  const detailOf = ({ unitType, farTeams }: DispatchShortage) => {
    const far = farTeams ?? [];
    const farKmByVehicle = new Map(far.map((f) => [f.vehicleId, f.km]));
    const isOwn = (vehicleId: string) => vehicles.some((v) => v.id === vehicleId && v.stationId === myStationId);
    const farOthers = far.filter((f) => !isOwn(f.vehicleId));
    // Chưa biết cần chức năng nào (chưa có kế hoạch) → không suy được xe nào bị loại vì lý do gì.
    const sameType = unitType ? vehicles.filter((v) => v.unitType === unitType) : [];
    const own = sameType
      .filter((v) => !!myStationId && v.stationId === myStationId && v.incidentId !== incidentId)
      .map((v) => ownRowOf(v, farKmByVehicle.get(v.id)));
    const count = (kind: OwnRow['kind']) => own.filter((row) => row.kind === kind).length;
    const summary = [
      count('mission') > 0 && t('liveMap.shortage.sumMission', { count: count('mission') }),
      count('unavailable') > 0 && t('liveMap.shortage.sumUnavailable', { count: count('unavailable') }),
      count('ineligible') > 0 && t('liveMap.shortage.sumIneligible', { count: count('ineligible') }),
      count('far') > 0 && t('liveMap.shortage.sumFar', { count: count('far') }),
    ].filter(Boolean) as string[];
    const others =
      farOthers.length > 0
        ? t('liveMap.shortage.othersFar', { count: farOthers.length, km: farOthers[0].km.toFixed(0) })
        : null;
    return { own, summary, others };
  };

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/60">
      <h4 className="flex items-center gap-1.5 px-2.5 pt-2 pb-1 text-[11px] font-semibold text-amber-800">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        {t('liveMap.shortage.heading')}
      </h4>
      <ul className="divide-y divide-amber-200/70">
        {shortages.map((shortage) => {
          const key = shortage.unitType ?? 'any';
          const { own, summary, others } = detailOf(shortage);
          const open = openKey === key;
          const expandable = own.length > 0 || !!others;
          const missing = shortage.unitType ? missingByType?.get(shortage.unitType) : undefined;
          const summaryText = !shortage.unitType
            ? shortage.message
            : summary.length > 0
              ? summary.slice(0, 2).join(' · ')
              : t('liveMap.shortage.noOwnVehicle');
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => setOpenKey(open ? null : key)}
                disabled={!expandable}
                aria-expanded={expandable ? open : undefined}
                // Câu của backend (có bán kính đã tìm) để trong tooltip, khỏi lặp ở từng dòng.
                title={shortage.message}
                className="w-full flex items-start gap-2 px-2.5 py-1.5 text-left enabled:hover:bg-amber-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-slate-800">
                    {shortage.unitType
                      ? missing
                        ? t('liveMap.plan.teams', { count: missing, type: unitTypeLabel(shortage.unitType) })
                        : t('liveMap.plan.group', { type: unitTypeLabel(shortage.unitType) })
                      : t('liveMap.recommend.noneLeft')}
                  </span>
                  <span className="block text-[11px] leading-snug text-slate-600">{summaryText}</span>
                </span>
                {expandable &&
                  (open ? (
                    <ChevronUp className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
                  ))}
              </button>
              {open && (
                <div className="px-2.5 pb-2 space-y-1">
                  {own.map((row) => (
                    <div key={row.key} className="flex items-baseline justify-between gap-2 text-[11px] leading-snug">
                      <span className="min-w-0 truncate text-slate-700">
                        <span className="font-mono-data">{row.plate}</span>
                        {row.teamName && ` · ${row.teamName}`}
                      </span>
                      {onOpenIncident && row.openIncidentId ? (
                        <button
                          type="button"
                          onClick={() => onOpenIncident(row.openIncidentId!)}
                          title={t('liveMap.shortage.openCase')}
                          className="shrink-0 font-mono-data text-slate-800 underline underline-offset-2 hover:text-red-700"
                        >
                          {row.reason}
                        </button>
                      ) : (
                        <span className="max-w-[55%] text-right text-slate-500">{row.reason}</span>
                      )}
                    </div>
                  ))}
                  {others && <p className="text-[11px] leading-snug text-slate-500">{others}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
