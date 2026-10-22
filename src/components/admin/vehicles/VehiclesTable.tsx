import React from 'react';
import { Pencil, Trash2, Wrench, CircleCheck } from 'lucide-react';
import { LockableButton, VehicleStatusBadge } from '../common/ui';
import { iconButtonClass, thClass } from '../common/styles';
import { RESCUE_UNIT_STATUS_META, RESCUE_UNIT_TYPE_META } from '../fleetMeta';
import { isOffMission } from '../../../services/admin/vehicleAdminService';
import { ON_MISSION_UNIT_STATUSES, type RescueUnitResponseDto } from '../../../types/rescueUnit';

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
  iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—';

export const VehiclesTable: React.FC<VehiclesTableProps> = ({
  vehicles,
  loading,
  pendingId,
  onEdit,
  onToggleMaintenance,
  onDelete,
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
        loading ? 'opacity-60' : ''
      }`}
    >
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className={thClass}>Biển số</th>
            <th className={thClass}>Chủng loại</th>
            <th className={thClass}>Trạm trực thuộc</th>
            <th className={thClass}>Trạng thái</th>
            <th className={thClass}>GPS cập nhật</th>
            <th className={`${thClass} text-right`}>Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {vehicles.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                {loading ? 'Đang tải...' : 'Không có xe nào phù hợp.'}
              </td>
            </tr>
          )}
          {vehicles.map((vehicle) => {
            const typeMeta = RESCUE_UNIT_TYPE_META[vehicle.unitType];
            const TypeIcon = typeMeta?.icon;
            const statusMeta = RESCUE_UNIT_STATUS_META[vehicle.status];
            const inMaintenance = vehicle.status === 'Maintenance';
            const pending = pendingId === vehicle.id;
            const missionLock = !isOffMission(vehicle.status)
              ? `Xe đang ${statusMeta?.label.toLowerCase() ?? vehicle.statusName} — chỉ đổi được khi xe xong nhiệm vụ.`
              : vehicle.status === 'OutOfService'
                ? 'Xe ngừng hoạt động — bấm Sửa xe để chọn trạm mới và đặt trạng thái.'
                : null;
            const deleteLock = ON_MISSION_UNIT_STATUSES.includes(vehicle.status)
              ? 'Xe đang làm nhiệm vụ — không thể xóa.'
              : null;

            return (
              <tr key={vehicle.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap font-semibold font-mono-data text-slate-900">
                  {vehicle.plateNumber}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-700 whitespace-nowrap">
                    {TypeIcon && <TypeIcon className="w-4 h-4 text-red-600 shrink-0" />}
                    {typeMeta?.label ?? vehicle.unitTypeName}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{vehicle.stationName || '—'}</td>
                <td className="px-4 py-3">
                  <VehicleStatusBadge
                    label={statusMeta?.label ?? vehicle.statusName}
                    color={statusMeta?.color ?? '#94A3B8'}
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
                      title="Sửa xe"
                      aria-label="Sửa xe"
                      className={iconButtonClass}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </LockableButton>
                    <LockableButton
                      onClick={() => onToggleMaintenance(vehicle)}
                      lockedReason={missionLock}
                      disabled={pending}
                      title={inMaintenance ? 'Đưa xe về Sẵn sàng' : 'Đặt xe vào Bảo trì'}
                      aria-label={inMaintenance ? 'Đưa xe về Sẵn sàng' : 'Đặt xe vào Bảo trì'}
                      className={iconButtonClass}
                    >
                      {inMaintenance ? <CircleCheck className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
                    </LockableButton>
                    <LockableButton
                      onClick={() => onDelete(vehicle)}
                      lockedReason={deleteLock}
                      disabled={pending}
                      title="Xóa xe"
                      aria-label="Xóa xe"
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
