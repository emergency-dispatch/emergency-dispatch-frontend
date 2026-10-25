import React, { useMemo, useState } from 'react';
import { Lock, Phone, Search, UserMinus, UserPlus, Users } from 'lucide-react';
import { LockableButton } from '../../admin/common/ui';
import { iconButtonClass, inputClass } from '../../admin/common/styles';
import { normalizeText } from '../../../services/admin/adminMock';
import type { StationStaff, StationTeam } from '../../../types/stationTeam';
import { useTranslation } from '../../../i18n';

interface StationStaffListProps {
  staff: StationStaff[];
  teamsById: Map<string, StationTeam>;
  /** Lý do không gỡ được (tổ đang làm nhiệm vụ), null = gỡ được. */
  removeLockedReason: (staff: StationStaff) => string | null;
  /** Tạo tài khoản RescueStaff mới cho trạm. */
  onCreate: () => void;
  /** Thêm người chưa thuộc trạm nào; không truyền → ẩn nút (backend không trả danh sách này cho Operator). */
  onAdd?: () => void;
  onRemove: (staff: StationStaff) => void;
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

export const StationStaffList: React.FC<StationStaffListProps> = ({
  staff,
  teamsById,
  removeLockedReason,
  onCreate,
  onAdd,
  onRemove,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [onlyWithoutTeam, setOnlyWithoutTeam] = useState(false);

  const withoutTeamCount = staff.filter((s) => !s.teamId).length;
  const visible = useMemo(() => {
    const term = normalizeText(search);
    return staff
      .filter((s) => !onlyWithoutTeam || !s.teamId)
      .filter((s) => !term || normalizeText(s.fullName).includes(term) || s.phoneNumber.includes(term))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  }, [staff, search, onlyWithoutTeam]);

  return (
    <section className="flex flex-col min-h-0 rounded-2xl border border-slate-200 bg-white">
      <div className="shrink-0 px-4 py-3.5 border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-red-600 shrink-0" />
            {t('teams.staff.title', { count: staff.length })}
          </h2>
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {t('teams.staff.create')}
          </button>
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
          >
            {t('teams.staff.add')}
          </button>
        )}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('teams.staff.search')}
            className={`${inputClass} pl-9`}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyWithoutTeam}
            onChange={(e) => setOnlyWithoutTeam(e.target.checked)}
            className="accent-red-600"
          />
          {t('teams.staff.onlyWithoutTeam', { count: withoutTeamCount })}
        </label>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
        {visible.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-8">
            {staff.length === 0 ? t('teams.staff.emptyStation') : t('teams.staff.noMatch')}
          </p>
        ) : (
          visible.map((s) => {
            const team = s.teamId ? teamsById.get(s.teamId) : undefined;
            return (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {initialsOf(s.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1.5">
                    {s.fullName}
                    {s.isLocked && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-500 uppercase">
                        <Lock className="w-2.5 h-2.5" />
                        {t('teams.staff.locked')}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono-data">
                    <Phone className="w-3 h-3" />
                    {s.phoneNumber}
                  </p>
                </div>
                {team ? (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700 whitespace-nowrap max-w-[120px] truncate">
                    {team.name}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700 whitespace-nowrap">
                    {t('teams.staff.noTeam')}
                  </span>
                )}
                <LockableButton
                  onClick={() => onRemove(s)}
                  lockedReason={removeLockedReason(s)}
                  title={t('teams.staff.remove')}
                  aria-label={t('teams.staff.removeLabel', { name: s.fullName })}
                  className={iconButtonClass}
                >
                  <UserMinus className="w-4 h-4" />
                </LockableButton>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
