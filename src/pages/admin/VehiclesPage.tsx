import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { VehicleFormDrawer } from '../../components/admin/vehicles/VehicleFormDrawer';
import { VehiclesTable } from '../../components/admin/vehicles/VehiclesTable';
import { ConfirmModal, Notice, Pagination, type NoticeState } from '../../components/admin/common/ui';
import { inputClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useServiceQuery } from '../../components/admin/common/hooks';
import {
  ADMIN_VEHICLE_STATUS_META,
  ADMIN_VEHICLE_STATUS_ORDER,
  ADMIN_VEHICLE_TYPES,
  VEHICLE_TYPE_META,
} from '../../components/admin/fleetMeta';
import { stationAdminService } from '../../services/admin/stationAdminService';
import { vehicleAdminService } from '../../services/admin/vehicleAdminService';
import { getApiErrorMessage } from '../../services/apiClient';
import type { AdminVehicleListItem, AdminVehicleStatus } from '../../types/adminFleet';
import type { DispatchVehicleType } from '../../types/vehicle';

const PAGE_SIZE = 10;

const VehiclesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [stationId, setStationId] = useState('');
  const [type, setType] = useState<DispatchVehicleType | ''>('');
  const [status, setStatus] = useState<AdminVehicleStatus | ''>('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const params = {
    search: debouncedSearch,
    stationId: stationId || undefined,
    type: type || undefined,
    status: status || undefined,
    includeDeleted,
    pageIndex,
    pageSize: PAGE_SIZE,
  };
  const query = useServiceQuery(() => vehicleAdminService.list(params), JSON.stringify(params));
  // Bộ lọc trạm gồm cả trạm đã xóa (để lọc xe Ngừng hoạt động theo trạm cũ).
  const stations = useServiceQuery(
    () => stationAdminService.list({ includeDeleted: true, pageIndex: 1, pageSize: 500 }),
    'stations'
  );

  const [formVehicle, setFormVehicle] = useState<AdminVehicleListItem | 'new' | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<AdminVehicleListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const withPageReset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPageIndex(1);
    };

  const handleToggleMaintenance = async (vehicle: AdminVehicleListItem) => {
    const next = vehicle.status === 'maintenance' ? 'available' : 'maintenance';
    setPendingId(vehicle.id);
    try {
      await vehicleAdminService.setStatus(vehicle.id, next);
      setNotice({
        kind: 'success',
        message: `Xe ${vehicle.plate} chuyển sang ${ADMIN_VEHICLE_STATUS_META[next].label}.`,
      });
      query.reload();
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingVehicle) return;
    setDeleting(true);
    try {
      await vehicleAdminService.softDelete(deletingVehicle.id);
      setNotice({ kind: 'success', message: `Đã xóa xe ${deletingVehicle.plate}.` });
      query.reload();
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    } finally {
      setDeleting(false);
      setDeletingVehicle(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 lg:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => withPageReset(setSearch)(e.target.value)}
            placeholder="Tìm biển số, nhân sự..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:flex">
          <select
            value={stationId}
            onChange={(e) => withPageReset(setStationId)(e.target.value)}
            aria-label="Lọc theo trạm"
            className={`${inputClass} lg:w-48`}
          >
            <option value="">Tất cả trạm</option>
            {(stations.data?.items ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.isDeleted ? ' (đã xóa)' : ''}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => withPageReset(setType)(e.target.value as DispatchVehicleType | '')}
            aria-label="Lọc theo chủng loại"
            className={`${inputClass} lg:w-40`}
          >
            <option value="">Tất cả loại xe</option>
            {ADMIN_VEHICLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {VEHICLE_TYPE_META[t].label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => withPageReset(setStatus)(e.target.value as AdminVehicleStatus | '')}
            aria-label="Lọc theo trạng thái"
            className={`${inputClass} lg:w-44`}
          >
            <option value="">Tất cả trạng thái</option>
            {ADMIN_VEHICLE_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {ADMIN_VEHICLE_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => withPageReset(setIncludeDeleted)(e.target.checked)}
            className="accent-red-600"
          />
          Hiện xe đã xóa
        </label>
        <button
          onClick={() => setFormVehicle('new')}
          className="lg:ml-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/25 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Thêm xe
        </button>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}

      <VehiclesTable
        vehicles={query.data?.items ?? []}
        loading={query.loading}
        pendingId={pendingId}
        onEdit={setFormVehicle}
        onToggleMaintenance={handleToggleMaintenance}
        onDelete={setDeletingVehicle}
      />

      {query.data && (
        <Pagination
          pageIndex={query.data.pageIndex}
          totalPages={query.data.totalPages}
          totalCount={query.data.totalCount}
          onChange={setPageIndex}
        />
      )}

      {formVehicle && (
        <VehicleFormDrawer
          initialVehicle={formVehicle === 'new' ? null : formVehicle}
          onClose={() => setFormVehicle(null)}
          onSaved={(saved) => {
            setNotice({
              kind: 'success',
              message: formVehicle === 'new' ? `Đã thêm xe ${saved.plate}.` : `Đã cập nhật xe ${saved.plate}.`,
            });
            setFormVehicle(null);
            query.reload();
          }}
        />
      )}

      {deletingVehicle && (
        <ConfirmModal
          title="Xóa xe?"
          confirmLabel="Xóa xe"
          submitting={deleting}
          onCancel={() => setDeletingVehicle(null)}
          onConfirm={handleDelete}
        >
          <p>
            Xóa mềm xe <span className="font-semibold font-mono-data text-slate-900">{deletingVehicle.plate}</span> (
            {deletingVehicle.stationName}). Xe sẽ bị ẩn khỏi danh sách và không còn được điều phối.
          </p>
        </ConfirmModal>
      )}
    </div>
  );
};

export default VehiclesPage;
