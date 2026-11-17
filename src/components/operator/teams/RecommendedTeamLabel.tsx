import React from 'react';
import { AlertTriangle, Crown, Users } from 'lucide-react';
import { TEAM_FUNCTION_META } from './teamFunction';
import { MIN_TEAM_SIZE } from '../../../data/dispatchConfig';
import { useDispatchStore } from '../../../context/DispatchContext';
import type { DispatchCandidate, DispatchTeamCandidate } from '../../../types/vehicle';
import { useTranslation } from '../../../i18n';

interface RecommendedTeamLabelProps {
  team: DispatchTeamCandidate;
  /** Chức năng đang chọn (một trong `team.options`). */
  selected: DispatchCandidate;
  /** Tổ có nhiều chức năng phù hợp → Operator chọn một (§34: mỗi tổ một chức năng / một xe trong một sự cố). */
  onSelectOption: (unitType: string) => void;
  /** Tên tổ trưởng (chỉ biết với tổ của trạm mình). */
  leaderName?: string;
  disabled?: boolean;
  /** Dòng phụ đứng sau biển số xe (khoảng cách, ETA…). */
  detail?: React.ReactNode;
}

/**
 * Tổ trong danh sách gợi ý điều phối (§34): tên tổ, chức năng sẽ đảm nhận, số nhân viên đang hoạt động, xe tổ mang
 * theo. Dùng chung cho Live Map và bước "Điều xe" của Hàng đợi.
 */
export const RecommendedTeamLabel: React.FC<RecommendedTeamLabelProps> = ({
  team,
  selected,
  onSelectOption,
  leaderName,
  disabled = false,
  detail,
}) => {
  const { t } = useTranslation();
  const { vehicles, unitTypeLabel } = useDispatchStore();
  const understaffed = team.staffCount < MIN_TEAM_SIZE;
  // Màu / icon chức năng theo nhóm xe; xe không có trong store (trạm khác) hoặc loại mới → nhóm cứu hộ chung.
  const functionMeta = (option: DispatchCandidate) =>
    TEAM_FUNCTION_META[vehicles.find((v) => v.id === option.vehicleId)?.type ?? 'rescue'];

  return (
    <div className="min-w-0 space-y-0.5">
      <div className="flex flex-wrap items-center gap-1 min-w-0">
        <span className="text-xs font-bold text-slate-900 truncate mr-0.5">{team.teamName}</span>
        {team.options.length === 1 ? (
          <FunctionBadge meta={functionMeta(selected)} label={unitTypeLabel(selected.unitType)} active />
        ) : (
          <span role="radiogroup" aria-label={t('liveMap.teamLabel.chooseFunction')} className="contents">
            {team.options.map((option) => (
              <FunctionBadge
                key={option.unitType}
                meta={functionMeta(option)}
                label={unitTypeLabel(option.unitType)}
                active={option.unitType === selected.unitType}
                disabled={disabled}
                onClick={() => onSelectOption(option.unitType)}
              />
            ))}
          </span>
        )}
      </div>
      <p
        className={`flex items-center gap-1 text-[10px] truncate ${understaffed ? 'font-semibold text-amber-600' : 'text-slate-500'}`}
      >
        {understaffed ? (
          <AlertTriangle className="w-3 h-3 shrink-0" />
        ) : leaderName ? (
          <Crown className="w-3 h-3 text-amber-500 shrink-0" />
        ) : (
          <Users className="w-3 h-3 shrink-0" />
        )}
        <span className="truncate">
          {leaderName ? `${leaderName} · ` : ''}
          {understaffed
            ? t('liveMap.teamLabel.understaffed', { size: team.staffCount, min: MIN_TEAM_SIZE })
            : t('liveMap.teamLabel.members', { count: team.staffCount })}
        </span>
      </p>
      <p className="text-[10px] text-slate-400 truncate">
        <span className="font-mono-data">{selected.plate}</span>
        {detail}
      </p>
    </div>
  );
};

interface FunctionBadgeProps {
  meta: (typeof TEAM_FUNCTION_META)[keyof typeof TEAM_FUNCTION_META];
  label: string;
  active: boolean;
  disabled?: boolean;
  /** Có → badge là nút chọn chức năng. */
  onClick?: () => void;
}

const FunctionBadge: React.FC<FunctionBadgeProps> = ({ meta, label, active, disabled, onClick }) => {
  const Icon = meta.icon;
  const content = (
    <>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </>
  );
  const base = 'inline-flex items-center gap-0.5 px-1.5 py-px rounded border text-[9px] font-bold whitespace-nowrap shrink-0';
  if (!onClick) return <span className={`${base} ${meta.badgeClass}`}>{content}</span>;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={`${base} transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
        active ? meta.badgeClass : 'border-dashed border-slate-300 text-slate-400 hover:text-slate-600 hover:border-slate-400'
      }`}
    >
      {content}
    </button>
  );
};
