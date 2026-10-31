import React from 'react';
import { Pencil, Trash2, Wrench, CircleCheck } from 'lucide-react';
import { LockableButton, VehicleStatusBadge } from '../common/ui';
import { iconButtonClass, thClass } from '../common/styles';
import { RESCUE_UNIT_STATUS_META, RESCUE_UNIT_TYPE_META } from '../fleetMeta';
import { isOffMission } from '../../../services/admin/vehicleAdminService';
import { ON_MISSION_UNIT_STATUSES, type RescueUnitResponseDto } from '../../../types/rescueUnit';
import { dateLocale, useTranslation } from '../../../i18n';

interface VehiclesTableProps {
  vehicles: RescueUnitResponseDto[];
  loading: boolean;
  /** Xe đang chờ phản hồi đổi trạng thái (khóa nút để tránh bấm 2 lần). */
  pendingId: string | null;
  onEdit: (vehicle: RescueUnitResponseDto) => void;
  onToggleMaintenance: (vehicle: RescueUnitResponseDto) => void;
  onDelete: (vehicle: RescueUnitResponseDto) => void;
}

const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(dateLocale(), { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—';

export const VehiclesTable: React.FC<VehiclesTableProps> = ({
  vehicles,
  loading,
  pendingId,
  onEdit,
  onToggleMaintenance,
  onDelete,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
        loading ? 'opacity-60' : ''
      }`}
    >
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className={thClass}>{t('admin.vehicles.table.plate')}</th>
            <th className={thClass}>{t('admin.vehicles.table.type')}</th>
            <th className={thClass}>{t('admin.vehicles.table.station')}</th>
            <th className={thClass}>{t('admin.common.status')}</th>
            <th className={thClass}>{t('admin.vehicles.table.gpsUpdated')}</th>
            <th className={`${thClass} text-right`}>{t('admin.common.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {vehicles.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                {loading ? t('admin.common.loading') : t('admin.vehicles.table.empty')}
              </td>
            </tr>
          )}
          {vehicles.map((vehicle) => {
            const TypeIcon = RESCUE_UNIT_TYPE_META[vehicle.unitType]?.icon;
            const statusLabel = t(`enums.unitStatus.${vehicle.status}`, { defaultValue: vehicle.statusName });
            const inMaintenance = vehicle.status === 'Maintenance';
            const pending = pendingId === vehicle.id;
            const missionLock = !isOffMission(vehicle.status)
              ? t('admin.vehicles.table.missionLock', { status: statusLabel.toLowerCase() })
              : vehicle.status === 'OutOfService'
                ? t('admin.vehicles.table.outOfServiceLock')
                : null;
            const deleteLock = ON_MISSION_UNIT_STATUSES.includes(vehicle.status)
              ? t('admin.vehicles.table.deleteLock')
              : null;

            return (
              <tr key={vehicle.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap font-semibold font-mono-data text-slate-900">
                  {vehicle.plateNumber}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-700 whitespace-nowrap">
                    {TypeIcon && <TypeIcon className="w-4 h-4 text-red-600 shrink-0" />}
                    {t(`enums.unitType.${vehicle.unitType}`, { defaultValue: vehicle.unitTypeName })}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{vehicle.stationName || '—'}</td>
                <td className="px-4 py-3">
                  <VehicleStatusBadge
                    label={statusLabel}
                    color={RESCUE_UNIT_STATUS_META[vehicle.status]?.color ?? '#94A3B8'}
                  />
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 font-mono-data whitespace-nowrap">
                  {formatTime(vehicle.lastLocationUpdateAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <LockableButton
                      onClick={() => onEdit(vehicle)}
                      lockedReason={null}
                      title={t('admin.vehicles.table.edit')}
                      aria-label={t('admin.vehicles.table.edit')}
                      className={iconButtonClass}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </LockableButton>
                    <LockableButton
                      onClick={() => onToggleMaintenance(vehicle)}
                      lockedReason={missionLock}
                      disabled={pending}
                      title={inMaintenance ? t('admin.vehicles.table.toAvailable') : t('admin.vehicles.table.toMaintenance')}
                      aria-label={inMaintenance ? t('admin.vehicles.table.toAvailable') : t('admin.vehicles.table.toMaintenance')}
                      className={iconButtonClass}
                    >
                      {inMaintenance ? <CircleCheck className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
                    </LockableButton>
                    <LockableButton
                      onClick={() => onDelete(vehicle)}
                      lockedReason={deleteLock}
                      disabled={pending}
                      title={t('admin.vehicles.table.delete')}
                      aria-label={t('admin.vehicles.table.delete')}
                      className={iconButtonClass}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </LockableButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
