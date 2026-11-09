import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Crown, Package, Pencil, Search, Truck, Users, Wrench } from 'lucide-react';
import { ConfirmModal, LockableButton, Notice, VehicleStatusBadge, type NoticeState } from '../../components/admin/common/ui';
import { inputClass, thClass } from '../../components/admin/common/styles';
import { VehicleFormDrawer } from '../../components/operator/vehicles/VehicleFormDrawer';
import { FleetHeader } from '../../components/operator/vehicles/FleetHeader';
import { EquipmentTab } from '../../components/operator/equipment/EquipmentTab';
import { useStationEquipment } from '../../components/operator/equipment/useStationEquipment';
import { VehicleEquipmentModal } from '../../components/operator/equipment/VehicleEquipmentModal';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../data/liveMapMeta';
import { useDispatchStore } from '../../context/DispatchContext';
import { useAuth } from '../../hooks/useAuth';
import { useTeamByVehicle } from '../../hooks/useStationTeams';
import { normalizeText } from '../../services/admin/listUtils';
import type { Vehicle } from '../../types/vehicle';
import i18n, { dateLocale, useTranslation } from '../../i18n';

type StatusFilter = 'all' | 'available' | 'on_mission' | 'recovering' | 'unavailable' | 'no_team';

const STATUS_FILTERS: StatusFilter[] = ['all', 'available', 'on_mission', 'recovering', 'unavailable', 'no_team'];

const isOnMission = (v: Vehicle) => !!v.assignmentId || ['awaiting_ack', 'accepted', 'en_route', 'on_scene'].includes(v.status);

const statusLabel = (v: Vehicle) =>
  v.unitStatus === 'OutOfService'
    ? { label: i18n.t('enums.vehicleStatus.outOfService'), color: '#64748B' }
    : { label: i18n.t(`enums.vehicleStatus.${v.status}`), color: VEHICLE_STATUS_META[v.status].color };

/** Hành động Operator được làm với một xe (chỉ Sẵn sàng ⇄ Bảo trì) hoặc lý do bị khóa. */
function vehicleAction(v: Vehicle): { next: 'Available' | 'Maintenance' | null; lockedReason: string | null } {
  if (isOnMission(v)) return { next: null, lockedReason: i18n.t('vehicles.locked.onMission') };
  if (v.status === 'recovering') return { next: null, lockedReason: i18n.t('vehicles.locked.recovering') };
  if (v.unitStatus === 'OutOfService') return { next: null, lockedReason: i18n.t('vehicles.locked.outOfService') };
  if (v.unitStatus === 'Maintenance') return { next: 'Available', lockedReason: null };
  if (v.status === 'available') return { next: 'Maintenance', lockedReason: null };
  return { next: null, lockedReason: i18n.t('vehicles.locked.other') };
}

type FleetTab = 'vehicles' | 'equipment';

/**
 * Đội xe của trạm Operator phụ trách: xem trạng thái, tổ phụ trách, nhiệm vụ đang chạy;
 * thêm xe, sửa biển số / chủng loại, đặt xe Bảo trì / đưa trở lại Sẵn sàng. Xóa xe và chuyển trạm do Admin làm.
 * Tab "Thiết bị" (§25, `?tab=equipment`): thiết bị cứu hộ của trạm, gắn theo xe hoặc để ở kho trạm.
 */
export const VehiclesPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { vehicles, stations, incidents, setVehicleStatus } = useDispatchStore();
  const teamByVehicle = useTeamByVehicle();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<Vehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  /** undefined = đóng form · null = thêm xe mới · Vehicle = sửa xe đó. */
  const [editing, setEditing] = useState<Vehicle | null | undefined>(undefined);
  /** Xe đang mở popup "Thiết bị trên xe" (giữ id để trạng thái xe luôn lấy bản mới từ store). */
  const [equipmentVehicleId, setEquipmentVehicleId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const tab: FleetTab = params.get('tab') === 'equipment' ? 'equipment' : 'vehicles';

  // Lấy lại hồ sơ để nhận trạm Admin vừa gán.
  useEffect(() => {
    refreshProfile();
  }, []);

  const stationId = user?.stationId ?? null;
  // Tải ở cả tab Xe để cột "Thiết bị" có số liệu.
  const equipment = useStationEquipment(stationId);
  const equipmentByUnit = useMemo(() => {
    const map = new Map<string, { count: number; maintenance: number }>();
    for (const e of equipment.items) {
      if (!e.rescueUnitId) continue;
      const entry = map.get(e.rescueUnitId) ?? { count: 0, maintenance: 0 };
      entry.count += 1;
      if (e.status === 'Maintenance') entry.maintenance += 1;
      map.set(e.rescueUnitId, entry);
    }
    return map;
  }, [equipment.items]);

  /** Chuyển tab; sang Thiết bị có thể kèm bộ lọc (VD xe vừa bấm ở cột Thiết bị). */
  const switchTab = (next: FleetTab, extra: Record<string, string> = {}) =>
    setParams(next === 'equipment' ? { tab: 'equipment', ...extra } : {}, { replace: true });
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
            message:
              next === 'Maintenance'
                ? t('vehicles.page.setMaintenanceDone', { plate: target.plate })
                : t('vehicles.page.setAvailableDone', { plate: target.plate }),
          }
        : { kind: 'error', message: result.message ?? t('vehicles.page.statusFailed') }
    );
    setTarget(null);
  };

  if (!stationId) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-sm text-slate-500">
        {t('vehicles.page.noStation')}
      </div>
    );
  }

  const stationTitle = station?.name ?? user?.stationName ?? t('vehicles.page.myStation');
  const equipmentVehicle = equipmentVehicleId ? stationVehicles.find((v) => v.id === equipmentVehicleId) ?? null : null;
  const equipmentMaintenance = equipment.items.filter((e) => e.status === 'Maintenance').length;

  const tabs = (
    <div role="tablist" aria-label={t('vehicles.tabs.label')} className="inline-flex p-1 rounded-lg bg-slate-100">
      {(['vehicles', 'equipment'] as const).map((key) => {
        const Icon = key === 'vehicles' ? Truck : Package;
        const count = key === 'vehicles' ? stationVehicles.length : equipment.items.length;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => switchTab(key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {t(`vehicles.tabs.${key}`)}
            <span className="opacity-60 tabular-nums">{count}</span>
            {key === 'equipment' && equipmentMaintenance > 0 && (
              <span
                title={t('vehicles.equipment.group.maintenance', { count: equipmentMaintenance })}
                className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums"
              >
                {equipmentMaintenance}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  if (tab === 'equipment') {
    return (
      <EquipmentTab
        title={stationTitle}
        tabs={tabs}
        stationId={stationId}
        vehicles={stationVehicles}
        equipment={equipment}
      />
    );
  }

  const stats = [
    { key: 'total', label: t('vehicles.page.statTotal'), value: stationVehicles.length },
    { key: 'available', label: t('vehicles.page.statAvailable'), value: stationVehicles.filter((v) => v.status === 'available').length },
    { key: 'onMission', label: t('vehicles.page.statOnMission'), value: stationVehicles.filter(isOnMission).length },
    {
      key: 'noTeam',
      label: t('vehicles.page.statNoTeam'),
      value: stationVehicles.filter((v) => !teamByVehicle.has(v.id)).length,
      warn: true,
    },
  ];

  return (
    <div className="h-full flex flex-col gap-4 p-4 lg:p-6 min-h-0">
      <FleetHeader
        kicker={t('vehicles.page.kicker')}
        title={stationTitle}
        description={t('vehicles.page.description')}
        tabs={tabs}
        addLabel={t('vehicles.page.add')}
        onAdd={() => setEditing(null)}
        stats={stats}
      />

      <Notice notice={notice} onClose={() => setNotice(null)} />

      <section className="flex-1 min-h-0 flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="shrink-0 p-4 border-b border-slate-200 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('vehicles.page.search')}
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((key) => {
              const count = stationVehicles.filter((v) => matches(v, key)).length;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    filter === key
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {t(`vehicles.filters.${key}`)} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {stationVehicles.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500 space-y-1">
              <Truck className="w-8 h-8 text-slate-300 mx-auto" />
              <p>{t('vehicles.page.empty')}</p>
            </div>
          ) : visible.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">{t('vehicles.page.noMatch')}</p>
          ) : (
            <table className="w-full text-sm min-w-[880px]">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-left">
                  <th className={thClass}>{t('vehicles.page.columnVehicle')}</th>
                  <th className={thClass}>{t('vehicles.page.columnStatus')}</th>
                  <th className={thClass}>{t('vehicles.page.columnTeam')}</th>
                  <th className={thClass}>{t('vehicles.page.columnEquipment')}</th>
                  <th className={thClass}>{t('vehicles.page.columnMission')}</th>
                  <th className={thClass}>{t('vehicles.page.columnLocation')}</th>
                  <th className={`${thClass} text-right`}>{t('vehicles.page.columnActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((v) => {
                  const team = teamByVehicle.get(v.id);
                  const leader = team?.members.find((m) => m.crewRole === 'commander');
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
                              {t(`enums.unitType.${v.unitType}`)} · {t(`enums.teamFunction.${v.type}`)}
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
                              {t('vehicles.page.members', { count: team.members.length })}
                            </p>
                          </div>
                        ) : (
                          <Link
                            to="/dashboard/command-center/station-teams"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {t('vehicles.page.noTeam')}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {/* Bấm → popup thiết bị của xe này (không rời tab Xe) */}
                        <button
                          type="button"
                          onClick={() => setEquipmentVehicleId(v.id)}
                          aria-label={t('vehicles.page.equipmentOpen', { plate: v.plate })}
                          title={t('vehicles.page.equipmentOpen', { plate: v.plate })}
                          className="inline-flex items-center gap-1.5 px-2 py-1 -mx-2 rounded-lg text-xs hover:bg-slate-100 transition-colors"
                        >
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          {equipment.loading && !equipment.loadedAt ? (
                            <span className="text-slate-400">…</span>
                          ) : equipmentByUnit.get(v.id) ? (
                            <span className="text-left">
                              <span className="font-semibold text-slate-800">
                                {t('vehicles.page.equipmentCount', { count: equipmentByUnit.get(v.id)!.count })}
                              </span>
                              {equipmentByUnit.get(v.id)!.maintenance > 0 && (
                                <span className="ml-1.5 inline-flex items-center gap-0.5 font-semibold text-amber-700">
                                  <Wrench className="w-3 h-3" />
                                  {t('vehicles.page.equipmentMaintenance', { count: equipmentByUnit.get(v.id)!.maintenance })}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">{t('vehicles.page.equipmentNone')}</span>
                          )}
                        </button>
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
                        {new Date(v.lastUpdated).toLocaleString(dateLocale(), {
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
                            title={t('vehicles.page.edit')}
                            aria-label={t('vehicles.page.editLabel', { plate: v.plate })}
                            className="inline-flex items-center px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <LockableButton
                            onClick={() => setTarget(v)}
                            lockedReason={action.lockedReason}
                            title={action.next === 'Maintenance' ? t('vehicles.page.setMaintenance') : t('vehicles.page.setAvailable')}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              action.next === 'Available'
                                ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            {action.next === 'Available' ? t('vehicles.page.setAvailable') : t('vehicles.page.setMaintenance')}
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
          stationName={station?.name ?? user?.stationName ?? t('vehicles.page.myStation')}
          onClose={() => setEditing(undefined)}
          onSaved={(plate, created) => {
            setEditing(undefined);
            setNotice({
              kind: 'success',
              message: created ? t('vehicles.page.created', { plate }) : t('vehicles.page.updated', { plate }),
            });
          }}
        />
      )}

      {equipmentVehicle && (
        <VehicleEquipmentModal
          vehicle={equipmentVehicle}
          status={statusLabel(equipmentVehicle)}
          teamName={teamByVehicle.get(equipmentVehicle.id)?.name ?? null}
          stationId={stationId}
          vehicles={stationVehicles}
          equipment={equipment}
          onClose={() => setEquipmentVehicleId(null)}
          onOpenTab={() => {
            setEquipmentVehicleId(null);
            switchTab('equipment', { unit: equipmentVehicle.id, view: 'vehicle' });
          }}
        />
      )}

      {target && (
        <ConfirmModal
          title={
            vehicleAction(target).next === 'Maintenance'
              ? t('vehicles.page.confirmMaintenance', { plate: target.plate })
              : t('vehicles.page.confirmAvailable', { plate: target.plate })
          }
          confirmLabel={
            vehicleAction(target).next === 'Maintenance' ? t('vehicles.page.setMaintenance') : t('vehicles.page.setAvailable')
          }
          submitting={submitting}
          onCancel={() => setTarget(null)}
          onConfirm={handleConfirm}
        >
          {vehicleAction(target).next === 'Maintenance' ? (
            <p>
              {t('vehicles.page.maintenanceBody')}
              {teamByVehicle.get(target.id) &&
                t('vehicles.page.maintenanceTeam', { team: teamByVehicle.get(target.id)!.name })}
              .
            </p>
          ) : (
            <p>{t('vehicles.page.availableBody')}</p>
          )}
        </ConfirmModal>
      )}
    </div>
  );
};
