import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, HandHelping, Loader2 } from 'lucide-react';
import { DispatchShortages } from './DispatchShortages';
import { RecommendedTeamRow } from './RecommendedTeamRow';
import { useDispatchStore, type TeamAssignTarget } from '../../../context/DispatchContext';
import { useTranslation } from '../../../i18n';
import { ASSIGNING_MANY, type PlanProgressItem } from '../../../utils/dispatchPlan';
import type { DispatchAlgorithm, DispatchCandidate, DispatchSuggestion, DispatchTeamCandidate } from '../../../types/vehicle';

interface Row {
  team: DispatchTeamCandidate;
  option: DispatchCandidate;
}

interface PlanTeamGroupsProps {
  incidentId: string;
  suggestion: DispatchSuggestion;
  /** Kế hoạch của ca, kèm số tổ đã giao từng chức năng. */
  items: PlanProgressItem[];
  /** Số tổ còn giao được mà không cần lý do (BR-14). */
  slotsLeft: number;
  /** Xe đã giao cho ca này — bỏ khỏi danh sách trong lúc gợi ý đang tải lại. */
  assignedVehicleIds: string[];
  algorithm: DispatchAlgorithm;
  assigningTeamId: string | null;
  /** Khóa nút giao (đang giao thêm mà chưa ghi lý do). */
  assignBlocked: boolean;
  onAssign: (targets: TeamAssignTarget[]) => Promise<boolean>;
  onOpenIncident?: (incidentId: string) => void;
}

const toTarget = ({ team, option }: Row): TeamAssignTarget => ({
  teamId: team.teamId,
  teamName: team.teamName,
  unitType: option.unitType,
});

/**
 * FR-OP-04 / §34: gợi ý tổ chia theo chức năng của kế hoạch điều xe. Còn thiếu tổ → chọn sẵn tổ đầu bảng của trạm mình
 * cho từng chức năng để giao một lệnh; tổ trạm khác chỉ được chọn khi Operator bấm, và thu gọn khi trạm mình còn đủ tổ.
 * Chức năng đã đủ thì thu gọn. `onAssign` hỏi xác nhận khi lệnh có tổ trạm khác.
 */
export const PlanTeamGroups: React.FC<PlanTeamGroupsProps> = ({
  incidentId,
  suggestion,
  items,
  slotsLeft,
  assignedVehicleIds,
  algorithm,
  assigningTeamId,
  assignBlocked,
  onAssign,
  onOpenIncident,
}) => {
  const { unitTypeLabel } = useDispatchStore();
  const { t } = useTranslation();
  // Operator đổi lựa chọn: unitType → các tổ đã chọn; chưa đổi thì dùng lựa chọn sẵn.
  const [overrides, setOverrides] = useState<Record<string, string[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [supportOpen, setSupportOpen] = useState<Record<string, boolean>>({});

  const assigned = new Set(assignedVehicleIds);
  const rowsOf = (unitType: string): Row[] =>
    suggestion.teams.flatMap((team) => {
      const option = team.options.find((o) => o.unitType === unitType);
      return option && !assigned.has(option.vehicleId) ? [{ team, option }] : [];
    });

  const planTypes = new Set(items.map((item) => item.unitType));
  const shortageTypes = new Set(suggestion.shortages.map((s) => s.unitType));
  // Backend gợi ý chức năng không có trong kế hoạch FE đang giữ (danh mục vừa đổi) → vẫn hiện, không chọn sẵn.
  const extraTypes = [
    ...new Set(suggestion.teams.flatMap((team) => team.options.map((o) => o.unitType))),
  ].filter((type) => !planTypes.has(type));

  const picking = slotsLeft > 0 && items.some((item) => item.missing > 0);
  // Mỗi tổ chỉ nhận một chức năng trong ca → tổ đã chọn ở nhóm trên thì nhóm dưới bỏ qua.
  const usedTeams = new Set<string>();
  let room = slotsLeft;
  const groups = items.map((item) => {
    const rows = rowsOf(item.unitType);
    const limit = picking ? Math.min(item.missing, room) : 0;
    const free = rows.filter((row) => !usedTeams.has(row.team.teamId));
    const override = overrides[item.unitType];
    const picks = (
      override
        ? free.filter((row) => override.includes(row.team.teamId))
        : free.filter((row) => !row.team.isSupportUnit)
    ).slice(0, limit);
    picks.forEach((row) => usedTeams.add(row.team.teamId));
    room -= picks.length;
    return { item, rows, limit, picks };
  });
  const pickedRows = groups.flatMap((group) => group.picks);
  const busy = !!assigningTeamId;

  const togglePick = (unitType: string, teamId: string, current: string[], limit: number) => {
    const next = current.includes(teamId)
      ? current.filter((id) => id !== teamId)
      : // Đã đủ số tổ của nhóm → tổ vừa bấm thay tổ chọn trước nhất.
        [...current.slice(Math.max(0, current.length - limit + 1)), teamId];
    setOverrides((prev) => ({ ...prev, [unitType]: next }));
  };

  const assign = async (rows: Row[]) => {
    if (!(await onAssign(rows.map(toTarget)))) return;
    // Chức năng vừa giao → về lựa chọn sẵn; lựa chọn ở các nhóm khác giữ nguyên.
    const types = new Set(rows.map((row) => row.option.unitType));
    setOverrides((prev) => Object.fromEntries(Object.entries(prev).filter(([type]) => !types.has(type))));
  };

  const assignButton = (row: Row) => (
    <button
      onClick={() => assign([row])}
      disabled={busy || assignBlocked}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold shrink-0 transition-colors disabled:opacity-60 ${
        row.team.isSupportUnit
          ? 'border border-blue-200 text-blue-700 hover:bg-blue-50'
          : picking ? 'border border-red-200 text-red-700 hover:bg-red-50' : 'bg-red-600 hover:bg-red-500 text-white'
      }`}
    >
      {assigningTeamId === row.team.teamId && <Loader2 className="w-3 h-3 animate-spin" />}
      {t(row.team.isSupportUnit ? 'liveMap.support.assign' : 'liveMap.recommend.assign')}
    </button>
  );

  return (
    <div className="space-y-3">
      {groups.filter(({ item, rows }) => rows.length > 0 || !shortageTypes.has(item.unitType)).map(({ item, rows, limit, picks }) => {
        const done = item.missing === 0;
        // Đang chọn tổ cho chức năng còn thiếu thì nhóm đã đủ thu gọn; giao thêm ngoài kế hoạch thì mở hết.
        const open = !picking || !done || !!expanded[item.unitType];
        const pickedIds = picks.map((row) => row.team.teamId);
        // Trạm mình đủ tổ thì tổ trạm khác thu gọn; đang chọn tổ trạm khác thì luôn mở.
        const supportRows = rows.filter((row) => row.team.isSupportUnit);
        const ownCount = rows.length - supportRows.length;
        const collapseSupport = supportRows.length > 0 && ownCount >= Math.max(1, picking ? item.missing : 1);
        const supportShown =
          !collapseSupport ||
          !!supportOpen[item.unitType] ||
          supportRows.some((row) => pickedIds.includes(row.team.teamId));
        return (
          <section key={item.unitType} aria-label={unitTypeLabel(item.unitType)} className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs">
              <h4 className="font-semibold text-slate-800">{t('liveMap.plan.group', { type: unitTypeLabel(item.unitType) })}</h4>
              {done ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('liveMap.plan.done', { count: item.assigned, total: item.quantity })}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-700">
                  {t('liveMap.plan.need', { count: item.missing })}
                  {rows.length < item.missing && `, ${t('liveMap.plan.have', { count: rows.length })}`}
                </span>
              )}
              {picking && done && rows.length > 0 && (
                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [item.unitType]: !prev[item.unitType] }))}
                  aria-expanded={open}
                  className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                >
                  {open ? t('liveMap.plan.hideTeams') : t('liveMap.plan.showTeams', { count: rows.length })}
                  {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {open &&
              rows.filter((row) => supportShown || !row.team.isSupportUnit).map((row) => {
                const picked = pickedIds.includes(row.team.teamId);
                const usedElsewhere = !picked && usedTeams.has(row.team.teamId);
                const toggle = () => togglePick(item.unitType, row.team.teamId, pickedIds, limit);
                return (
                  <RecommendedTeamRow
                    key={row.team.teamId}
                    team={row.team}
                    option={row.option}
                    hideFunction
                    algorithm={algorithm}
                    picked={picked}
                    leading={
                      limit > 0 && (
                        <input
                          type="checkbox"
                          checked={picked}
                          onChange={toggle}
                          disabled={busy || usedElsewhere}
                          aria-label={`${t('liveMap.plan.select')} ${row.team.teamName}`}
                          className="accent-red-600 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                      )
                    }
                    action={assignButton(row)}
                    onToggle={limit > 0 && !busy && !usedElsewhere ? toggle : undefined}
                  />
                );
              })}
            {open && collapseSupport && (
              <button
                onClick={() => setSupportOpen((prev) => ({ ...prev, [item.unitType]: !prev[item.unitType] }))}
                aria-expanded={supportShown}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900"
              >
                <HandHelping className="w-3.5 h-3.5" />
                {t('liveMap.support.group', { count: supportRows.length })}
                {supportShown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </section>
        );
      })}

      {extraTypes.map((type) => (
        <section key={type} aria-label={unitTypeLabel(type)} className="space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-800">{t('liveMap.plan.group', { type: unitTypeLabel(type) })}</h4>
          {rowsOf(type).map((row) => (
            <RecommendedTeamRow
              key={row.team.teamId}
              team={row.team}
              option={row.option}
              hideFunction
              algorithm={algorithm}
              action={assignButton(row)}
            />
          ))}
        </section>
      ))}
      {/* Chức năng không có tổ nào: gom một khung gọn ở cuối, không chen giữa các tổ giao được. */}
      <DispatchShortages
        shortages={suggestion.shortages}
        missingByType={new Map(items.map((item) => [item.unitType, item.missing]))}
        incidentId={incidentId}
        onOpenIncident={onOpenIncident}
      />

      {picking && pickedRows.length > 0 && (
        // Dính đáy panel: danh sách dài vẫn bấm được.
        <div className="sticky bottom-0 z-10 -mx-3 border-t border-slate-200 bg-white/95 px-3 py-2">
          <button
            onClick={() => assign(pickedRows)}
            disabled={busy || assignBlocked}
            className="w-full flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
          >
            {assigningTeamId === ASSIGNING_MANY && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t('liveMap.plan.assignSelected', { count: pickedRows.length })}
          </button>
        </div>
      )}
    </div>
  );
};
