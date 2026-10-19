import React from 'react';
import { Pencil, Trash2, Wrench, CircleCheck } from 'lucide-react';
import { LockableButton, VehicleStatusBadge } from '../common/ui';
import { iconButtonClass, thClass } from '../common/styles';
import { ADMIN_VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../fleetMeta';
import { isVehicleBusy, type AdminVehicleListItem } from '../../../types/adminFleet';

interface VehiclesTableProps {
  vehicles: AdminVehicleListItem[];
  loading: boolean;
  /** Xe đang chờ phản hồi đổi trạng thái (khóa nút để tránh bấm 2 lần). */
  pendingId: string | null;
  onEdit: (vehicle: AdminVehicleListItem) => void;
  onToggleMaintenance: (vehicle: AdminVehicleListItem) => void;
  onDelete: (vehicle: AdminVehicleListItem) => void;
}

/** Lý do khóa thao tác của Admin trên xe, null = không khóa. */
function lockReason(vehicle: AdminVehicleListItem, action: 'xóa' | 'đặt bảo trì' | 'sửa'): string | null {
  if (isVehicleBusy(vehicle.status)) {
    if (action === 'sửa') return null;
    return `Xe đang làm nhiệm vụ (${ADMIN_VEHICLE_STATUS_META[vehicle.status].label}) — không thể ${action}.`;
  }
  // Xe ngừng hoạt động vẫn mở form được để chuyển sang trạm mới.
  if (vehicle.status === 'out_of_service' && action === 'đặt bảo trì') {
    return `Xe ngừng hoạt động do trạm trực thuộc đã bị xóa — không thể ${action}.`;
  }
  return null;
}

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
            <th className={thClass}>Người phụ trách</th>
            <th className={thClass}>Trạng thái</th>
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
            const typeMeta = VEHICLE_TYPE_META[vehicle.type];
            const TypeIcon = typeMeta.icon;
            const statusMeta = ADMIN_VEHICLE_STATUS_META[vehicle.status];
            const inMaintenance = vehicle.status === 'maintenance';
            const pending = pendingId === vehicle.id;

            return (
              <tr key={vehicle.id} className={vehicle.isDeleted ? 'bg-slate-50/80 text-slate-400' : 'hover:bg-slate-50'}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold font-mono-data ${vehicle.isDeleted ? 'line-through' : 'text-slate-900'}`}
                    >
                      {vehicle.plate}
                    </span>
                    {vehicle.isDeleted && (
                      <span className="px-1.5 py-0.5 rounded border border-slate-300 bg-slate-100 text-[10px] font-bold font-mono-data text-slate-500">
                        Đã xóa
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-700 whitespace-nowrap">
                    <TypeIcon className="w-4 h-4 text-red-600 shrink-0" />
                    {typeMeta.label}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{vehicle.stationName}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {vehicle.crewMemberName ?? (
                    <span className="px-2 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-bold font-mono-data">
                      Chưa có người phụ trách
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <VehicleStatusBadge label={statusMeta.label} color={statusMeta.color} />
                </td>
                <td className="px-4 py-3">
                  {!vehicle.isDeleted && (
                    <div className="flex items-center justify-end gap-1.5">
                      <LockableButton
                        onClick={() => onEdit(vehicle)}
                        lockedReason={lockReason(vehicle, 'sửa')}
                        title="Sửa xe"
                        aria-label="Sửa xe"
                        className={iconButtonClass}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </LockableButton>
                      <LockableButton
                        onClick={() => onToggleMaintenance(vehicle)}
                        lockedReason={lockReason(vehicle, 'đặt bảo trì')}
                        disabled={pending}
                        title={inMaintenance ? 'Đưa xe về Sẵn sàng' : 'Đặt xe vào Bảo trì'}
                        aria-label={inMaintenance ? 'Đưa xe về Sẵn sàng' : 'Đặt xe vào Bảo trì'}
                        className={iconButtonClass}
                      >
                        {inMaintenance ? <CircleCheck className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
                      </LockableButton>
                      <LockableButton
                        onClick={() => onDelete(vehicle)}
                        lockedReason={lockReason(vehicle, 'xóa')}
                        disabled={pending}
                        title="Xóa xe"
                        aria-label="Xóa xe"
                        className={iconButtonClass}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </LockableButton>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
