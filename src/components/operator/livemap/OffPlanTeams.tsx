import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { RecommendedTeamRow } from './RecommendedTeamRow';
import { OVERRIDE_REASON_MIN_LENGTH } from '../../../data/incidentMock';
import { useDispatchStore, type TeamAssignTarget } from '../../../context/DispatchContext';
import { useAuth } from '../../../hooks/useAuth';
import { useOffPlanTeams } from '../../../hooks/useOffPlanTeams';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import { useTranslation } from '../../../i18n';
import { getBusyTeamIds } from '../../../utils/teamAvailability';
import type { PlanProgressItem } from '../../../utils/dispatchPlan';
import type { DispatchAlgorithm, DispatchSuggestion } from '../../../types/vehicle';

interface OffPlanTeamsProps {
  incidentId: string;
  suggestion: DispatchSuggestion;
  /** Kế hoạch của ca; rỗng = chưa có kế hoạch. */
  items: PlanProgressItem[];
  maxVehicles: number;
  /** Ca đã đủ số tổ → giao thêm ở đây là vượt giới hạn (Cấp 1–2, dùng chung lý do). */
  isFull: boolean;
  algorithm: DispatchAlgorithm;
  refreshKey: string;
  assigningTeamId: string | null;
  onAssign: (target: TeamAssignTarget, reason: string) => Promise<boolean>;
}

/**
 * Tổ trạm mình đang sẵn sàng nhưng khác chức năng kế hoạch cần. Thu gọn sẵn; giao phải ghi lý do vì backend không chặn
 * sai loại xe (quy tắc phía FE).
 */
export const OffPlanTeams: React.FC<OffPlanTeamsProps> = ({
  incidentId,
  suggestion,
  items,
  maxVehicles,
  isFull,
  algorithm,
  refreshKey,
  assigningTeamId,
  onAssign,
}) => {
  const { vehicles, unitTypeLabel } = useDispatchStore();
  const { user } = useAuth();
  const teamByVehicle = useTeamByVehicle();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ key: string; reason: string } | null>(null);

  // Nhận diện từ dữ liệu đang có để biết có mục này hay không; khoảng cách / ETA chỉ tải khi mở.
  const readyByType = useMemo(() => {
    const planTypes = new Set([
      ...items.map((item) => item.unitType),
      ...suggestion.teams.flatMap((team) => team.options.map((o) => o.unitType)),
    ]);
    const suggestedTeams = new Set(suggestion.teams.map((team) => team.teamId));
    const busy = getBusyTeamIds(vehicles, teamByVehicle);
    const result = new Map<string, Set<string>>();
    vehicles.forEach((v) => {
      const team = teamByVehicle.get(v.id);
      if (v.status !== 'available' || v.stationId !== user?.stationId || planTypes.has(v.unitType)) return;
      if (!team?.canBeAssigned || busy.has(team.id) || suggestedTeams.has(team.id)) return;
      result.set(v.unitType, (result.get(v.unitType) ?? new Set()).add(team.id));
    });
    return result;
  }, [vehicles, teamByVehicle, user?.stationId, items, suggestion]);

  const unitTypes = [...readyByType.keys()];
  const teamCount = new Set([...readyByType.values()].flatMap((ids) => [...ids])).size;
  const suggestedIds = new Set(suggestion.teams.map((team) => team.teamId));
  const { teams, loading, error } = useOffPlanTeams(
    incidentId,
    open,
    algorithm,
    unitTypes,
    user?.stationId ?? null,
    refreshKey
  );
  if (teamCount === 0) return null;

  const rows = teams
    .filter((team) => !suggestedIds.has(team.teamId))
    .flatMap((team) => team.options.map((option) => ({ key: `${team.teamId}|${option.unitType}`, team, option })));
  const hasPlan = items.length > 0;
  const planText = items
    .map((item) => t('liveMap.plan.teams', { count: item.quantity, type: unitTypeLabel(item.unitType) }))
    .join(' · ');
  const planShort = items.some((item) => item.missing > 0);
  const busy = !!assigningTeamId;

  const confirm = async (target: TeamAssignTarget, reason: string) => {
    if (await onAssign(target, reason.trim())) setDraft(null);
  };

  return (
    <section className="border-t border-slate-200 pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-1.5 py-1 text-left text-xs font-semibold text-slate-600 hover:text-slate-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {t('liveMap.offPlan.title', { count: teamCount })}
        <span className="ml-auto text-[11px] font-normal text-slate-500">
          {t(hasPlan ? 'liveMap.offPlan.tag' : 'liveMap.offPlan.tagNoPlan')}
        </span>
      </button>

      {open && (
        <div className="mt-1.5 space-y-1.5">
          {loading && teams.length === 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 py-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t('liveMap.recommend.searching')}
            </div>
          )}
          {error && <p className="text-[11px] text-red-600">{error}</p>}
          {!loading && !error && rows.length === 0 && (
            <p className="text-[11px] text-slate-500">{t('liveMap.offPlan.none')}</p>
          )}
          {rows.map(({ key, team, option }) => {
            const editing = draft?.key === key;
            const reason = editing ? draft.reason : '';
            const reasonValid = reason.trim().length >= OVERRIDE_REASON_MIN_LENGTH;
            return (
              <div key={key} className="space-y-1.5">
                <RecommendedTeamRow
                  team={team}
                  option={option}
                  algorithm={algorithm}
                  action={
                    <button
                      onClick={() => setDraft(editing ? null : { key, reason: '' })}
                      disabled={busy}
                      aria-expanded={editing}
                      className="px-2.5 py-1.5 rounded-md border border-slate-300 text-[10px] font-bold text-slate-700 shrink-0 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {t('liveMap.offPlan.assign')}
                    </button>
                  }
                />
                {editing && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 space-y-1.5">
                    <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-900 leading-snug">
                      <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                      {hasPlan
                        ? t('liveMap.offPlan.warning', { plan: planText, type: unitTypeLabel(option.unitType) })
                        : t('liveMap.offPlan.warningNoPlan', { type: unitTypeLabel(option.unitType) })}
                    </p>
                    {planShort && !isFull && (
                      <p className="text-[11px] text-amber-800">{t('liveMap.offPlan.usesSlot', { max: maxVehicles })}</p>
                    )}
                    <textarea
                      value={reason}
                      onChange={(e) => setDraft({ key, reason: e.target.value })}
                      rows={2}
                      autoFocus
                      placeholder={t('liveMap.offPlan.reasonPlaceholder')}
                      className="w-full rounded border border-amber-300 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-300"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-700">
                        {reasonValid ? '' : t('liveMap.recommend.minChars', { min: OVERRIDE_REASON_MIN_LENGTH })}
                      </span>
                      <button
                        onClick={() => setDraft(null)}
                        disabled={busy}
                        className="ml-auto text-[11px] font-bold text-slate-500 hover:text-slate-800"
                      >
                        {t('liveMap.offPlan.cancel')}
                      </button>
                      <button
                        onClick={() =>
                          confirm({ teamId: team.teamId, teamName: team.teamName, unitType: option.unitType }, reason)
                        }
                        disabled={busy || !reasonValid}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold disabled:opacity-60"
                      >
                        {assigningTeamId === team.teamId && <Loader2 className="w-3 h-3 animate-spin" />}
                        {t('liveMap.offPlan.confirm')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
