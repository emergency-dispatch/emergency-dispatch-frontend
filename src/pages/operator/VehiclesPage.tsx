import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, Crown, Pencil, Plus, Search, ShieldCheck, Truck, Users, Wrench } from 'lucide-react';
import { ConfirmModal, LockableButton, Notice, VehicleStatusBadge, type NoticeState } from '../../components/admin/common/ui';
import { inputClass, thClass } from '../../components/admin/common/styles';
import { TEAM_FUNCTION_META } from '../../components/operator/teams/teamFunction';
import { VehicleFormDrawer } from '../../components/operator/vehicles/VehicleFormDrawer';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../data/liveMapMeta';
import { useDispatchStore } from '../../context/DispatchContext';
import { useAuth } from '../../hooks/useAuth';
import { useTeamByVehicle } from '../../hooks/useStationTeams';
import { normalizeText } from '../../services/admin/listUtils';
import type { Vehicle } from '../../types/vehicle';

type StatusFilter = 'all' | 'available' | 'on_mission' | 'recovering' | 'unavailable' | 'no_team';

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'available', label: 'Sẵn sàng' },
  { key: 'on_mission', label: 'Đang nhiệm vụ' },
  { key: 'recovering', label: 'Hồi sức' },
  { key: 'unavailable', label: 'Bảo trì' },
  { key: 'no_team', label: 'Chưa có tổ' },
];

const isOnMission = (v: Vehicle) => !!v.assignmentId || ['awaiting_ack', 'accepted', 'en_route', 'on_scene'].includes(v.status);

const statusLabel = (v: Vehicle) =>
  v.unitStatus === 'OutOfService' ? { label: 'Ngừng hoạt động', color: '#64748B' } : VEHICLE_STATUS_META[v.status];

/** Hành động Operator được làm với một xe (chỉ Sẵn sàng ⇄ Bảo trì) hoặc lý do bị khóa. */
function vehicleAction(v: Vehicle): { next: 'Available' | 'Maintenance' | null; lockedReason: string | null } {
  if (isOnMission(v)) return { next: null, lockedReason: 'Xe đang làm nhiệm vụ — trạng thái tự cập nhật theo tiến độ.' };
  if (v.status === 'recovering') return { next: null, lockedReason: 'Xe đang hồi sức sau nhiệm vụ, sẽ tự về Sẵn sàng.' };
  if (v.unitStatus === 'OutOfService') return { next: null, lockedReason: 'Xe ngừng hoạt động — liên hệ Admin.' };
  if (v.unitStatus === 'Maintenance') return { next: 'Available', lockedReason: null };
  if (v.status === 'available') return { next: 'Maintenance', lockedReason: null };
  return { next: null, lockedReason: 'Không đổi được trạng thái lúc này.' };
}

/**
 * Đội xe của trạm Operator phụ trách: xem trạng thái, tổ phụ trách, nhiệm vụ đang chạy;
 * thêm xe, sửa biển số / chủng loại, đặt xe Bảo trì / đưa trở lại Sẵn sàng. Xóa xe và chuyển trạm do Admin làm.
 */
export const VehiclesPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { vehicles, stations, incidents, setVehicleStatus } = useDispatchStore();
  const teamByVehicle = useTeamByVehicle();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<Vehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  /** undefined = đóng form · null = thêm xe mới · Vehicle = sửa xe đó. */
  const [editing, setEditing] = useState<Vehicle | null | undefined>(undefined);

  // Lấy lại hồ sơ để nhận trạm Admin vừa gán.
  useEffect(() => {
    refreshProfile();
  }, []);

  const stationId = user?.stationId ?? null;
  const station = stations.find((s) => s.id === stationId) ?? null;
  const incidentsById = useMemo(() => new Map(incidents.map((i) => [i.id, i])), [incidents]);
  const stationVehicles = useMemo(
    () =>
      vehicles
        .filter((v) => v.stationId === stationId)
        .sort((a, b) => a.plate.localeCompare(b.plate)),
    [vehicles, stationId]
  );

  const matches = (v: Vehicle, key: StatusFilter) => {
    switch (key) {
      case 'available':
        return v.status === 'available';
      case 'on_mission':
        return isOnMission(v);
      case 'recovering':
        return v.status === 'recovering';
      case 'unavailable':
        return v.status === 'unavailable';
      case 'no_team':
        return !teamByVehicle.has(v.id);
      default:
        return true;
    }
  };

  const q = normalizeText(search);
  const visible = stationVehicles.filter(
    (v) =>
      matches(v, filter) &&
      (!q || normalizeText(`${v.plate} ${teamByVehicle.get(v.id)?.name ?? ''}`).includes(q))
  );

  const handleConfirm = async () => {
    if (!target) return;
    const { next } = vehicleAction(target);
    if (!next) return;
    setSubmitting(true);
    const result = await setVehicleStatus(target.id, next);
    setSubmitting(false);
    setNotice(
      result.ok
        ? {
            kind: 'success',
            message: next === 'Maintenance' ? `Đã đặt xe ${target.plate} sang Bảo trì.` : `Xe ${target.plate} đã Sẵn sàng.`,
          }
        : { kind: 'error', message: result.message ?? 'Không đổi được trạng thái xe.' }
    );
    setTarget(null);
  };

  if (!stationId) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-sm text-slate-500">
        Bạn chưa được phân công trạm — liên hệ Admin để được gán trạm.
      </div>
    );
  }

  const stats = [
    { label: 'Tổng xe', value: stationVehicles.length },
    { label: 'Sẵn sàng', value: stationVehicles.filter((v) => v.status === 'available').length },
    { label: 'Đang nhiệm vụ', value: stationVehicles.filter(isOnMission).length },
    { label: 'Chưa có tổ', value: stationVehicles.filter((v) => !teamByVehicle.has(v.id)).length, warn: true },
  ];

  return (
    <div className="h-full flex flex-col gap-4 p-4 lg:p-6 min-h-0">
      <header className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 lg:p-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-mono-data uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
            Đội xe của trạm
          </p>
          <h1 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-600 shrink-0" />
            {station?.name ?? user?.stationName ?? 'Trạm của bạn'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đặt xe Bảo trì khi hỏng hóc để không được gợi ý điều phối. Xóa xe và chuyển xe sang trạm khác do Admin thực
            hiện.
          </p>
          <button
            onClick={() => setEditing(null)}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm xe
          </button>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 min-w-[88px]">
              <dt className="text-[10px] font-mono-data uppercase tracking-wider text-slate-500">{stat.label}</dt>
              <dd className={`text-xl font-black ${stat.warn && stat.value > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      <section className="flex-1 min-h-0 flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="shrink-0 p-4 border-b border-slate-200 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm biển số hoặc tên tổ"
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => {
              const count = stationVehicles.filter((v) => matches(v, f.key)).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    filter === f.key
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {f.label} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {stationVehicles.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500 space-y-1">
              <Truck className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Trạm chưa có xe nào — bấm "Thêm xe" để thêm xe cho trạm.</p>
            </div>
          ) : visible.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">Không có xe khớp bộ lọc.</p>
          ) : (
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-left">
                  <th className={thClass}>Xe</th>
                  <th className={thClass}>Trạng thái</th>
                  <th className={thClass}>Tổ phụ trách</th>
                  <th className={thClass}>Nhiệm vụ</th>
                  <th className={thClass}>Cập nhật vị trí</th>
                  <th className={`${thClass} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((v) => {
                  const team = teamByVehicle.get(v.id);
                  const leader = team?.members.find((m) => m.crewRole === 'commander');
                  const fn = TEAM_FUNCTION_META[v.type];
                  const TypeIcon = VEHICLE_TYPE_META[v.type].icon;
                  const status = statusLabel(v);
                  const incident = v.incidentId ? incidentsById.get(v.incidentId) : undefined;
                  const action = vehicleAction(v);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <TypeIcon className="w-4 h-4 text-slate-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-mono-data font-bold text-slate-900">{v.plate}</p>
                            <p className="text-[11px] text-slate-500">
                              {VEHICLE_TYPE_META[v.type].label} · {fn.label}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <VehicleStatusBadge label={status.label} color={status.color} />
                      </td>
                      <td className="px-4 py-3">
                        {team ? (
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{team.name}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              {leader ? <Crown className="w-3 h-3 text-amber-500" /> : <Users className="w-3 h-3" />}
                              {leader?.fullName ? `${leader.fullName} · ` : ''}
                              {team.members.length} người
                            </p>
                          </div>
                        ) : (
                          <Link
                            to="/dashboard/command-center/station-teams"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Chưa có tổ — không điều động được
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {incident ? (
                          <button
                            onClick={() =>
                              navigate('/dashboard/command-center/live-map', { state: { focusIncidentId: incident.id } })
                            }
                            className="text-left text-xs font-semibold text-red-600 hover:underline max-w-[220px] truncate block"
                            title={incident.title}
                          >
                            {incident.title}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono-data whitespace-nowrap">
                        {new Date(v.lastUpdated).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setEditing(v)}
                            title="Sửa biển số / chủng loại"
                            aria-label={`Sửa xe ${v.plate}`}
                            className="inline-flex items-center px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <LockableButton
                            onClick={() => setTarget(v)}
                            lockedReason={action.lockedReason}
                            title={action.next === 'Maintenance' ? 'Đặt bảo trì' : 'Đưa vào hoạt động'}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              action.next === 'Available'
                                ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            {action.next === 'Available' ? 'Đưa vào hoạt động' : 'Đặt bảo trì'}
                          </LockableButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {editing !== undefined && (
        <VehicleFormDrawer
          vehicle={editing}
          stationId={stationId}
          stationName={station?.name ?? user?.stationName ?? 'Trạm của bạn'}
          onClose={() => setEditing(undefined)}
          onSaved={(plate, created) => {
            setEditing(undefined);
            setNotice({
              kind: 'success',
              message: created ? `Đã thêm xe ${plate} vào trạm.` : `Đã cập nhật xe ${plate}.`,
            });
          }}
        />
      )}

      {target && (
        <ConfirmModal
          title={vehicleAction(target).next === 'Maintenance' ? `Đặt xe ${target.plate} sang Bảo trì?` : `Đưa xe ${target.plate} vào hoạt động?`}
          confirmLabel={vehicleAction(target).next === 'Maintenance' ? 'Đặt bảo trì' : 'Đưa vào hoạt động'}
          submitting={submitting}
          onCancel={() => setTarget(null)}
          onConfirm={handleConfirm}
        >
          {vehicleAction(target).next === 'Maintenance' ? (
            <p>
              Xe sẽ không được gợi ý điều phối cho tới khi đưa trở lại hoạt động
              {teamByVehicle.get(target.id) && <> — tổ {teamByVehicle.get(target.id)!.name} cũng tạm không điều động được</>}.
            </p>
          ) : (
            <p>Xe sẽ chuyển sang Sẵn sàng và được gợi ý điều phối trở lại.</p>
          )}
        </ConfirmModal>
      )}
    </div>
  );
};
