import React, { useState } from 'react';
import { ConfirmModal, Notice } from '../common/ui';
import { useServiceQuery } from '../common/hooks';
import { ADMIN_VEHICLE_STATUS_META } from '../fleetMeta';
import { stationAdminService } from '../../../services/admin/stationAdminService';
import { vehicleAdminService } from '../../../services/admin/vehicleAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { isVehicleBusy, type AdminStationListItem } from '../../../types/adminFleet';

interface DeleteStationDialogProps {
  station: AdminStationListItem;
  onCancel: () => void;
  onDeleted: (affectedCount: number) => void;
}

export const DeleteStationDialog: React.FC<DeleteStationDialogProps> = ({ station, onCancel, onDeleted }) => {
  const vehicles = useServiceQuery(
    () => vehicleAdminService.list({ stationId: station.id, pageIndex: 1, pageSize: 500 }),
    station.id
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = vehicles.data?.items ?? [];
  const busy = items.filter((v) => isVehicleBusy(v.status));

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await stationAdminService.softDelete(station.id);
      onDeleted(result.affectedVehicleIds.length);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <ConfirmModal
      title="Xóa trạm cứu hộ?"
      confirmLabel="Xóa trạm"
      confirmDisabled={vehicles.loading || !!vehicles.error || busy.length > 0}
      submitting={submitting}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      <p>
        Xóa mềm trạm <span className="font-semibold text-slate-900">{station.name}</span>. Trạm sẽ bị ẩn khỏi danh sách.
      </p>

      {vehicles.loading ? (
        <p className="text-slate-400">Đang kiểm tra xe thuộc trạm...</p>
      ) : vehicles.error ? (
        <Notice notice={{ kind: 'error', message: vehicles.error }} />
      ) : busy.length > 0 ? (
        <Notice
          notice={{
            kind: 'error',
            message: `Không thể xóa: còn ${busy.length} xe đang làm nhiệm vụ (${busy.map((v) => v.plate).join(', ')}). Chờ các xe hoàn tất nhiệm vụ rồi thử lại.`,
          }}
        />
      ) : items.length === 0 ? (
        <p>Trạm không có xe trực thuộc.</p>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-amber-800 font-semibold">
            {items.length} xe thuộc trạm sẽ chuyển sang trạng thái Ngừng hoạt động (OutOfService):
          </p>
          <ul className="space-y-1 text-xs">
            {items.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3">
                <span className="font-mono-data font-semibold text-slate-800">{v.plate}</span>
                <span className="text-slate-500">{ADMIN_VEHICLE_STATUS_META[v.status].label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Notice notice={error ? { kind: 'error', message: error } : null} />
    </ConfirmModal>
  );
};
