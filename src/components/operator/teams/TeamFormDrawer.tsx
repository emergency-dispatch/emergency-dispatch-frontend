import React, { useState } from 'react';
import { AlertTriangle, Crown, Lock } from 'lucide-react';
import { TEAM_FUNCTION_META } from './teamFunction';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../../admin/common/ui';
import { inputClass } from '../../admin/common/styles';
import { MAX_TEAM_SIZE, MIN_TEAM_SIZE } from '../../../data/dispatchConfig';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../../data/liveMapMeta';
import { getApiErrorMessage } from '../../../services/apiClient';
import { stationTeamService } from '../../../services/stationTeamService';
import {
  CREW_ROLES,
  CREW_ROLE_LABEL,
  type CrewRole,
  type StationStaff,
  type StationTeam,
  type TeamMember,
} from '../../../types/stationTeam';
import type { DispatchVehicleType, Vehicle } from '../../../types/vehicle';

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
  const [name, setName] = useState(team?.name ?? `Tổ ${stationTeams.length + 1}`);
  const [vehicleId, setVehicleId] = useState<string | null>(team?.vehicleId ?? null);
  const [members, setMembers] = useState<TeamMember[]>(team?.members ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehicleOfOtherTeam = new Map(
    stationTeams.filter((t) => t.id !== team?.id && t.vehicleId).map((t) => [t.vehicleId!, t.name])
  );
  // Người đã thuộc tổ khác không chọn được; người bị khóa chỉ hiện nếu đang là thành viên (để gỡ ra).
  const memberIds = new Set(members.map((m) => m.staffId));
  const selectableStaff = stationStaff
    .filter((s) => (!s.teamId || s.teamId === team?.id) && (!s.isLocked || memberIds.has(s.id)))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  const otherTeamCount = stationStaff.filter((s) => s.teamId && s.teamId !== team?.id).length;

  const selectedVehicle = stationVehicles.find((v) => v.id === vehicleId);
  const defaultRole: CrewRole = selectedVehicle ? DEFAULT_ROLE_BY_VEHICLE[selectedVehicle.type] : 'rescuer';
  const commanderCount = members.filter((m) => m.crewRole === 'commander').length;

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
      ? 'Vui lòng nhập tên tổ.'
      : members.length > MAX_TEAM_SIZE
        ? `Mỗi tổ tối đa ${MAX_TEAM_SIZE} người.`
        : commanderCount > 1
          ? 'Mỗi tổ chỉ có 1 tổ trưởng (Chỉ huy kíp).'
          : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) return;
    setSubmitting(true);
    setError(null);
    try {
      const saved = await stationTeamService.saveTeam(stationId, { name, vehicleId, members }, team?.id ?? null);
      onSaved(saved);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      title={team ? `Sửa ${team.name}` : 'Tạo tổ làm việc'}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <DrawerFooter onCancel={onClose} submitLabel="Lưu tổ" submitting={submitting} canSubmit={!validationError} />
      }
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} onClose={() => setError(null)} />

      <FormField label="Tên tổ" required>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
      </FormField>

      <FormField
        label="Xe phụ trách"
        hint="Loại xe quyết định chức năng của tổ và loại sự cố tổ được điều động. Mỗi xe chỉ có 1 tổ."
      >
        <select
          value={vehicleId ?? ''}
          onChange={(e) => setVehicleId(e.target.value || null)}
          className={inputClass}
        >
          <option value="">Trực tại trạm (không theo xe — không điều động được)</option>
          {stationVehicles.map((v) => {
            const otherTeam = vehicleOfOtherTeam.get(v.id);
            const busy = v.status !== 'available' && v.id !== team?.vehicleId;
            const suffix = otherTeam ? ` — đã có ${otherTeam}` : busy ? ` — ${VEHICLE_STATUS_META[v.status].label}` : '';
            return (
              <option key={v.id} value={v.id} disabled={!!otherTeam || busy}>
                {v.plate} · {VEHICLE_TYPE_META[v.type].label}
                {suffix}
              </option>
            );
          })}
        </select>
        {selectedVehicle ? (
          <p className="text-xs text-slate-600">
            Chức năng của tổ:{' '}
            <span className="font-bold text-slate-900">{TEAM_FUNCTION_META[selectedVehicle.type].label}</span>
          </p>
        ) : (
          <p className="flex items-start gap-1.5 text-xs text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Tổ trực tại trạm không hiện ở Dispatch Panel. Gắn xe để tổ được điều động tới sự cố.
          </p>
        )}
      </FormField>

      <FormField
        label={`Thành viên (${members.length}/${MAX_TEAM_SIZE})`}
        hint={
          members.length < MIN_TEAM_SIZE
            ? `Tổ dưới ${MIN_TEAM_SIZE} người vẫn lưu được nhưng sẽ bị cảnh báo "thiếu người" khi giao xe.`
            : 'Chọn "Chỉ huy kíp" để đặt làm tổ trưởng (tối đa 1 người).'
        }
      >
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
          {selectableStaff.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-6">
              Không còn nhân sự trống — thêm nhân sự vào trạm hoặc gỡ họ khỏi tổ khác.
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
                      {s.isLocked && <Lock className="w-3 h-3 text-slate-400 shrink-0" aria-label="Tài khoản đã khóa" />}
                    </span>
                  </label>
                  {member && (
                    <select
                      value={member.crewRole}
                      onChange={(e) => setRole(s.id, e.target.value as CrewRole)}
                      aria-label={`Vai trò của ${s.fullName}`}
                      className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1.5 text-slate-700 focus:outline-none focus:border-red-500"
                    >
                      {CREW_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r === 'commander' ? 'Tổ trưởng (Chỉ huy kíp)' : CREW_ROLE_LABEL[r]}
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
        <p className="text-[11px] text-slate-500">{otherTeamCount} nhân sự khác của trạm đang thuộc tổ khác.</p>
      )}
      {validationError && members.length > 0 && <p className="text-xs text-red-600">{validationError}</p>}
    </DrawerShell>
  );
};
