import React, { useState } from 'react';
import { isAxiosError } from 'axios';
import { AlertTriangle, Crown, Lock } from 'lucide-react';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../../admin/common/ui';
import { inputClass } from '../../admin/common/styles';
import { MAX_TEAM_SIZE, MIN_TEAM_SIZE } from '../../../data/dispatchConfig';
import { getApiErrorMessage } from '../../../services/apiClient';
import { stationTeamService } from '../../../services/stationTeamService';
import {
  CREW_ROLES,
  type CrewRole,
  type StationStaff,
  type StationTeam,
  type TeamMember,
} from '../../../types/stationTeam';
import type { DispatchVehicleType, Vehicle } from '../../../types/vehicle';
import { useTranslation } from '../../../i18n';

// Vai trò gợi ý khi tick chọn thành viên, theo loại xe tổ phụ trách.
const DEFAULT_ROLE_BY_VEHICLE: Record<DispatchVehicleType, CrewRole> = {
  fire_truck: 'firefighter',
  ambulance: 'medic',
  rescue: 'rescuer',
};

interface TeamFormDrawerProps {
  stationId: string;
  /** null = tạo tổ mới. */
  team: StationTeam | null;
  stationStaff: StationStaff[];
  stationVehicles: Vehicle[];
  stationTeams: StationTeam[];
  onClose: () => void;
  onSaved: (team: StationTeam) => void;
}

export const TeamFormDrawer: React.FC<TeamFormDrawerProps> = ({
  stationId,
  team,
  stationStaff,
  stationVehicles,
  stationTeams,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(team?.name ?? t('teams.form.defaultName', { index: stationTeams.length + 1 }));
  const [vehicleIds, setVehicleIds] = useState<string[]>(team?.vehicleIds ?? []);
  const [members, setMembers] = useState<TeamMember[]>(team?.members ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehicleOfOtherTeam = new Map(
    stationTeams
      .filter((other) => other.id !== team?.id)
      .flatMap((other) => other.vehicleIds.map((id) => [id, other.name] as const))
  );
  // Người đã thuộc tổ khác không chọn được; người bị khóa chỉ hiện nếu đang là thành viên (để gỡ ra).
  const memberIds = new Set(members.map((m) => m.staffId));
  const selectableStaff = stationStaff
    .filter((s) => (!s.teamId || s.teamId === team?.id) && (!s.isLocked || memberIds.has(s.id)))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  const otherTeamCount = stationStaff.filter((s) => s.teamId && s.teamId !== team?.id).length;

  // Giữ thứ tự xe của trạm để vai trò gợi ý / chức năng hiện ổn định.
  const selectedVehicles = stationVehicles.filter((v) => vehicleIds.includes(v.id));
  const selectedTypes = [...new Set(selectedVehicles.map((v) => v.type))];
  const defaultRole: CrewRole = selectedVehicles[0] ? DEFAULT_ROLE_BY_VEHICLE[selectedVehicles[0].type] : 'rescuer';
  const commanderCount = members.filter((m) => m.crewRole === 'commander').length;

  const toggleVehicle = (id: string) =>
    setVehicleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleMember = (staffId: string) =>
    setMembers((prev) =>
      prev.some((m) => m.staffId === staffId)
        ? prev.filter((m) => m.staffId !== staffId)
        : [...prev, { staffId, crewRole: defaultRole }]
    );
  const setRole = (staffId: string, crewRole: CrewRole) =>
    setMembers((prev) => prev.map((m) => (m.staffId === staffId ? { ...m, crewRole } : m)));

  const validationError =
    name.trim().length === 0
      ? t('teams.form.nameRequired')
      : members.length > MAX_TEAM_SIZE
        ? t('teams.form.maxSize', { max: MAX_TEAM_SIZE })
        : commanderCount > 1
          ? t('teams.form.oneLeader')
          : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) return;
    setSubmitting(true);
    setError(null);
    try {
      const saved = await stationTeamService.saveTeam(stationId, { name, vehicleIds, members }, team?.id ?? null);
      onSaved(saved);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
      // 409: xe / nhân sự vừa được tổ khác nhận → tải lại tổ để danh sách hiện đúng "đã có tổ khác".
      if (isAxiosError(err) && err.response?.status === 409) {
        stationTeamService.reloadStationTeams(stationId).catch(() => undefined);
      }
    }
  };

  return (
    <DrawerShell
      title={team ? t('teams.form.editTitle', { name: team.name }) : t('teams.form.createTitle')}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <DrawerFooter onCancel={onClose} submitLabel={t('teams.form.save')} submitting={submitting} canSubmit={!validationError} />
      }
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} onClose={() => setError(null)} />

      <FormField label={t('teams.form.name')} required>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
      </FormField>

      <FormField
        label={t('teams.form.vehicles', { count: vehicleIds.length })}
        hint={t('teams.form.vehicleHint')}
      >
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
          {stationVehicles.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-6">{t('teams.form.noVehicles')}</p>
          ) : (
            stationVehicles.map((v) => {
              const otherTeam = vehicleOfOtherTeam.get(v.id);
              const checked = vehicleIds.includes(v.id);
              // Xe đang bận chỉ bỏ chọn được nếu vốn đã thuộc tổ này; không thêm xe bận vào tổ.
              const busy = v.status !== 'available' && !team?.vehicleIds.includes(v.id);
              const disabled = !!otherTeam || (busy && !checked);
              return (
                <label
                  key={v.id}
                  className={`flex items-center gap-3 px-3 py-2.5 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleVehicle(v.id)}
                    className="accent-red-600"
                  />
                  <span className="flex-1 min-w-0 text-sm text-slate-900 truncate">
                    <span className="font-mono-data font-bold">{v.plate}</span> · {t(`enums.unitType.${v.unitType}`)}
                  </span>
                  {(otherTeam || busy) && (
                    <span className="text-[11px] text-slate-500 whitespace-nowrap">
                      {otherTeam
                        ? t('teams.form.hasTeam', { team: otherTeam })
                        : t(`enums.vehicleStatus.${v.status}`)}
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
        {selectedTypes.length > 0 ? (
          <p className="text-xs text-slate-600">
            {t('teams.form.function')}{' '}
            <span className="font-bold text-slate-900">
              {selectedTypes.map((type) => t(`enums.teamFunction.${type}`)).join(', ')}
            </span>
          </p>
        ) : (
          <p className="flex items-start gap-1.5 text-xs text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {t('teams.form.atStationWarning')}
          </p>
        )}
      </FormField>

      <FormField
        label={t('teams.form.members', { count: members.length, max: MAX_TEAM_SIZE })}
        hint={
          members.length < MIN_TEAM_SIZE
            ? t('teams.form.understaffedHint', { min: MIN_TEAM_SIZE })
            : t('teams.form.leaderHint')
        }
      >
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
          {selectableStaff.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-6">
              {t('teams.form.noStaff')}
            </p>
          ) : (
            selectableStaff.map((s) => {
              const member = members.find((m) => m.staffId === s.id);
              return (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                  <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!member}
                      onChange={() => toggleMember(s.id)}
                      className="accent-red-600"
                    />
                    <span className="text-sm text-slate-900 truncate flex items-center gap-1.5">
                      {member?.crewRole === 'commander' && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      {s.fullName}
                      {s.isLocked && <Lock className="w-3 h-3 text-slate-400 shrink-0" aria-label={t('teams.form.locked')} />}
                    </span>
                  </label>
                  {member && (
                    <select
                      value={member.crewRole}
                      onChange={(e) => setRole(s.id, e.target.value as CrewRole)}
                      aria-label={t('teams.form.roleOf', { name: s.fullName })}
                      className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1.5 text-slate-700 focus:outline-none focus:border-red-500"
                    >
                      {CREW_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r === 'commander' ? t('teams.form.leaderOption') : t(`teams.crewRole.${r}`)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })
          )}
        </div>
      </FormField>

      {otherTeamCount > 0 && (
        <p className="text-[11px] text-slate-500">{t('teams.form.otherTeams', { count: otherTeamCount })}</p>
      )}
      {validationError && members.length > 0 && <p className="text-xs text-red-600">{validationError}</p>}
    </DrawerShell>
  );
};
