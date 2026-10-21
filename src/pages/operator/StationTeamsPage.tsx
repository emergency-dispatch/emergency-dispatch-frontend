import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, Loader2, MapPin, Phone, Plus, ShieldCheck } from 'lucide-react';
import { ConfirmModal, Notice, type NoticeState } from '../../components/admin/common/ui';
import { AddStaffModal } from '../../components/operator/teams/AddStaffModal';
import { StationStaffList } from '../../components/operator/teams/StationStaffList';
import { TeamCard } from '../../components/operator/teams/TeamCard';
import { TeamFormDrawer } from '../../components/operator/teams/TeamFormDrawer';
import { useDispatchStore } from '../../context/DispatchContext';
import { VEHICLE_STATUS_META } from '../../data/liveMapMeta';
import { useAuth } from '../../hooks/useAuth';
import { useStationTeams } from '../../hooks/useStationTeams';
import { getApiErrorMessage } from '../../services/apiClient';
import { liveMapService } from '../../services/liveMapService';
import { stationTeamService } from '../../services/stationTeamService';
import type { StationResponseDto } from '../../types/station';
import type { StationStaff, StationTeam } from '../../types/stationTeam';

type TeamDrawerState = { mode: 'create' } | { mode: 'edit'; team: StationTeam } | null;

/**
 * Trạm & Tổ: Trưởng trạm thêm/gỡ nhân sự của trạm mình và chia họ vào các tổ làm việc cố định.
 * Tổ gắn với xe nào sẽ hiện kèm xe đó trong Dispatch Panel khi giao xe.
 * Trạm phụ trách = trạm Admin gán cho tài khoản Operator (User.StationId).
 */
export const StationTeamsPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { vehicles } = useDispatchStore();
  const { staff, teams } = useStationTeams();
  const [station, setStation] = useState<StationResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const myStationId = user?.stationId ?? null;

  // Lấy lại hồ sơ để nhận trạm Admin vừa gán (thông tin lưu lúc đăng nhập có thể đã cũ).
  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    if (!myStationId) {
      setStation(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      liveMapService.getStation(myStationId),
      stationTeamService.loadStaff(),
      stationTeamService.reloadStationTeams(myStationId),
    ])
      .then(([dto]) => !cancelled && setStation(dto))
      .catch((err) => !cancelled && setLoadError(getApiErrorMessage(err, 'Không tải được thông tin trạm.')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [myStationId]);

  const [notice, setNotice] = useState<NoticeState>(null);
  const [addingStaff, setAddingStaff] = useState(false);
  const [removingStaff, setRemovingStaff] = useState<StationStaff | null>(null);
  const [teamDrawer, setTeamDrawer] = useState<TeamDrawerState>(null);
  const [deletingTeam, setDeletingTeam] = useState<StationTeam | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stationId = station?.id ?? '';
  const stationStaff = useMemo(() => staff.filter((s) => s.stationId === stationId), [staff, stationId]);
  const stationTeams = useMemo(() => teams.filter((t) => t.stationId === stationId), [teams, stationId]);
  const stationVehicles = useMemo(() => vehicles.filter((v) => v.stationId === stationId), [vehicles, stationId]);
  const candidates = useMemo(() => staff.filter((s) => !s.stationId && !s.isLocked), [staff]);
  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const teamsById = useMemo(() => new Map(stationTeams.map((t) => [t.id, t])), [stationTeams]);
  const vehiclesById = useMemo(() => new Map(stationVehicles.map((v) => [v.id, v])), [stationVehicles]);
  const vehiclesWithoutTeam = stationVehicles.filter((v) => !stationTeams.some((t) => t.vehicleId === v.id));

  // Xe của tổ đang làm nhiệm vụ / hồi sức → khóa sửa tổ và gỡ thành viên cho tới khi xe về Sẵn sàng.
  const teamLockedReason = (team: StationTeam): string | null => {
    const vehicle = team.vehicleId ? vehiclesById.get(team.vehicleId) : undefined;
    if (!vehicle || vehicle.status === 'available') return null;
    return `Xe ${vehicle.plate} đang ở trạng thái "${VEHICLE_STATUS_META[vehicle.status].label}" — chỉ sửa được khi xe sẵn sàng.`;
  };
  const staffLockedReason = (s: StationStaff) => {
    const team = s.teamId ? teamsById.get(s.teamId) : undefined;
    return team ? teamLockedReason(team) : null;
  };

  const run = async (action: () => Promise<void>, successMessage: string) => {
    setSubmitting(true);
    try {
      await action();
      setNotice({ kind: 'success', message: successMessage });
      return true;
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center gap-2 p-6 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Đang tải thông tin trạm…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center gap-2 p-6 text-sm text-red-600">
        <AlertTriangle className="w-4 h-4" />
        {loadError}
      </div>
    );
  }

  if (!station) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-sm text-slate-500">
        Bạn chưa được phân công làm Trưởng trạm — liên hệ Admin để được gán trạm.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4 lg:p-6 min-h-0">
      <header className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 lg:p-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-mono-data uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
            Trạm bạn phụ trách
          </p>
          <h1 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-600 shrink-0" />
            {station.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {station.address}
            </span>
            {station.phoneNumber && (
              <span className="flex items-center gap-1 font-mono-data">
                <Phone className="w-3.5 h-3.5" />
                {station.phoneNumber}
              </span>
            )}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Nhân sự', value: stationStaff.length },
            { label: 'Tổ', value: stationTeams.length },
            { label: 'Xe chưa có tổ', value: vehiclesWithoutTeam.length, warn: vehiclesWithoutTeam.length > 0 },
          ].map((stat) => (
            <div key={stat.label} className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 min-w-[88px]">
              <dt className="text-[10px] font-mono-data uppercase tracking-wider text-slate-500">{stat.label}</dt>
              <dd className={`text-xl font-black ${stat.warn ? 'text-amber-600' : 'text-slate-900'}`}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-[minmax(320px,2fr)_3fr]">
        <StationStaffList
          staff={stationStaff}
          teamsById={teamsById}
          removeLockedReason={staffLockedReason}
          onAdd={() => setAddingStaff(true)}
          onRemove={setRemovingStaff}
        />

        <section className="flex flex-col min-h-0 rounded-2xl border border-slate-200 bg-slate-50/60">
          <div className="shrink-0 px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tổ làm việc ({stationTeams.length})</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Tổ cố định của trạm, đi kèm xe khi Command Center giao xe</p>
            </div>
            <button
              onClick={() => setTeamDrawer({ mode: 'create' })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo tổ
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {vehiclesWithoutTeam.length > 0 && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Xe chưa có tổ phụ trách:{' '}
                  <strong className="font-mono-data">{vehiclesWithoutTeam.map((v) => v.plate).join(', ')}</strong>
                </span>
              </div>
            )}
            {stationTeams.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-10">Trạm chưa có tổ nào — bấm "Tạo tổ".</p>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {stationTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    staffById={staffById}
                    vehicle={team.vehicleId ? vehiclesById.get(team.vehicleId) : undefined}
                    lockedReason={teamLockedReason(team)}
                    onEdit={() => setTeamDrawer({ mode: 'edit', team })}
                    onDelete={() => setDeletingTeam(team)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {addingStaff && (
        <AddStaffModal
          stationName={station.name}
          candidates={candidates}
          submitting={submitting}
          onCancel={() => setAddingStaff(false)}
          onConfirm={async (ids) => {
            if (await run(() => stationTeamService.addStaff(station.id, ids), `Đã thêm ${ids.length} nhân sự vào trạm.`)) {
              setAddingStaff(false);
            }
          }}
        />
      )}

      {removingStaff && (
        <ConfirmModal
          title={`Gỡ ${removingStaff.fullName} khỏi trạm?`}
          confirmLabel="Gỡ khỏi trạm"
          submitting={submitting}
          onCancel={() => setRemovingStaff(null)}
          onConfirm={async () => {
            const target = removingStaff;
            if (await run(() => stationTeamService.removeStaff(station.id, target.id), `Đã gỡ ${target.fullName} khỏi trạm.`)) {
              setRemovingStaff(null);
            }
          }}
        >
          <p>Nhân sự sẽ trở về danh sách chưa thuộc trạm và có thể được trạm khác thêm vào.</p>
          {removingStaff.teamId && (
            <p className="text-amber-700">
              Người này cũng sẽ bị gỡ khỏi <strong>{teamsById.get(removingStaff.teamId)?.name}</strong>.
            </p>
          )}
        </ConfirmModal>
      )}

      {deletingTeam && (
        <ConfirmModal
          title={`Xóa ${deletingTeam.name}?`}
          confirmLabel="Xóa tổ"
          submitting={submitting}
          onCancel={() => setDeletingTeam(null)}
          onConfirm={async () => {
            const target = deletingTeam;
            if (await run(() => stationTeamService.deleteTeam(station.id, target.id), `Đã xóa ${target.name}.`)) {
              setDeletingTeam(null);
            }
          }}
        >
          <p>
            {deletingTeam.members.length} thành viên vẫn thuộc trạm và chuyển thành "chưa vào tổ".
            {deletingTeam.vehicleId && ' Xe của tổ sẽ bị cảnh báo "chưa có tổ" khi giao xe.'}
          </p>
        </ConfirmModal>
      )}

      {teamDrawer && (
        <TeamFormDrawer
          stationId={station.id}
          team={teamDrawer.mode === 'edit' ? teamDrawer.team : null}
          stationStaff={stationStaff}
          stationVehicles={stationVehicles}
          stationTeams={stationTeams}
          onClose={() => setTeamDrawer(null)}
          onSaved={(saved) => {
            setNotice({
              kind: 'success',
              message: teamDrawer.mode === 'edit' ? `Đã cập nhật ${saved.name}.` : `Đã tạo ${saved.name}.`,
            });
            setTeamDrawer(null);
          }}
        />
      )}
    </div>
  );
};
