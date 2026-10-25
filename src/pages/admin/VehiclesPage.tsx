import React, { useEffect, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { VehicleFormDrawer } from '../../components/admin/vehicles/VehicleFormDrawer';
import { VehiclesTable } from '../../components/admin/vehicles/VehiclesTable';
import { ConfirmModal, Notice, Pagination, type NoticeState } from '../../components/admin/common/ui';
import { inputClass } from '../../components/admin/common/styles';
import { useDebouncedValue, useInitialQueryParams, useServiceQuery } from '../../components/admin/common/hooks';
import { RESCUE_UNIT_STATUS_META, RESCUE_UNIT_TYPE_META } from '../../components/admin/fleetMeta';
import { stationAdminService } from '../../services/admin/stationAdminService';
import { vehicleAdminService, type VehicleStatusFilter } from '../../services/admin/vehicleAdminService';
import { getApiErrorMessage } from '../../services/apiClient';
import { HubEvents, incidentHubService } from '../../services/realtime/incidentHubService';
import {
  RESCUE_UNIT_STATUSES,
  RESCUE_UNIT_TYPES,
  type RescueUnitResponseDto,
  type RescueUnitType,
} from '../../types/rescueUnit';

const PAGE_SIZE = 10;
// Gom các sự kiện đổi trạng thái xe đến dồn dập (VD giao nhiều xe cùng lúc) thành một lần tải lại.
const REALTIME_RELOAD_DELAY_MS = 500;
const STATUS_FILTERS: VehicleStatusFilter[] = ['on_mission', ...RESCUE_UNIT_STATUSES];

const VehiclesPage: React.FC = () => {
  const initial = useInitialQueryParams();
  const [search, setSearch] = useState(() => initial.text('search'));
  const [stationId, setStationId] = useState(() => initial.text('stationId'));
  const [type, setType] = useState<RescueUnitType | ''>(() => initial.oneOf('type', RESCUE_UNIT_TYPES));
  const [status, setStatus] = useState<VehicleStatusFilter | ''>(() => initial.oneOf('status', STATUS_FILTERS));
  const [pageIndex, setPageIndex] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const params = {
    search: debouncedSearch,
    stationId: stationId || undefined,
    type: type || undefined,
    status: status || undefined,
    pageIndex,
    pageSize: PAGE_SIZE,
  };
  const query = useServiceQuery(() => vehicleAdminService.list(params), JSON.stringify(params));
  const stations = useServiceQuery(() => stationAdminService.list({ pageIndex: 1, pageSize: 500 }), 'vehicle-stations');

  // Realtime: xe đổi trạng thái (giao xe, tới nơi, hồi sức, hết hồi sức, Operator đổi tay, thêm / xóa xe) → tải lại
  // trang hiện tại để giữ đúng bộ lọc và phân trang. Kết nối lại sau khi rớt mạng cũng tải lại vì có thể đã lỡ sự kiện.
  const reloadRef = useRef(query.reload);
  useEffect(() => {
    reloadRef.current = query.reload;
  });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => reloadRef.current(), REALTIME_RELOAD_DELAY_MS);
    };
    const unsubscribers = [
      incidentHubService.on(HubEvents.ReceiveRescueUnitStatus, scheduleReload),
      incidentHubService.onReconnected(scheduleReload),
    ];
    incidentHubService.start();
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      incidentHubService.stop();
    };
  }, []);

  const [formVehicle, setFormVehicle] = useState<RescueUnitResponseDto | 'new' | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<RescueUnitResponseDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);

  const withPageReset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPageIndex(1);
    };

  const handleToggleMaintenance = async (vehicle: RescueUnitResponseDto) => {
    const next = vehicle.status === 'Maintenance' ? 'Available' : 'Maintenance';
    setPendingId(vehicle.id);
    try {
      await vehicleAdminService.setStatus(vehicle.id, next);
      setNotice({
        kind: 'success',
        message: `Xe ${vehicle.plateNumber} chuyển sang ${RESCUE_UNIT_STATUS_META[next].label}.`,
      });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    } finally {
      setPendingId(null);
      query.reload();
    }
  };

  const handleDelete = async () => {
    if (!deletingVehicle) return;
    setDeleting(true);
    try {
      await vehicleAdminService.remove(deletingVehicle.id);
      setNotice({ kind: 'success', message: `Đã xóa xe ${deletingVehicle.plateNumber}.` });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    } finally {
      setDeleting(false);
      setDeletingVehicle(null);
      query.reload();
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
            placeholder="Tìm biển số, tên trạm..."
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
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => withPageReset(setType)(e.target.value as RescueUnitType | '')}
            aria-label="Lọc theo chủng loại"
            className={`${inputClass} lg:w-40`}
          >
            <option value="">Tất cả loại xe</option>
            {RESCUE_UNIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {RESCUE_UNIT_TYPE_META[t].label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => withPageReset(setStatus)(e.target.value as VehicleStatusFilter | '')}
            aria-label="Lọc theo trạng thái"
            className={`${inputClass} lg:w-44`}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="on_mission">Đang làm nhiệm vụ (điều động · hiện trường · quay về)</option>
            {RESCUE_UNIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {RESCUE_UNIT_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
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
              message:
                formVehicle === 'new' ? `Đã thêm xe ${saved.plateNumber}.` : `Đã cập nhật xe ${saved.plateNumber}.`,
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
            Xóa mềm xe <span className="font-semibold font-mono-data text-slate-900">{deletingVehicle.plateNumber}</span>
            {deletingVehicle.stationName && ` (${deletingVehicle.stationName})`}. Xe sẽ bị ẩn khỏi danh sách và không còn
            được điều phối.
          </p>
        </ConfirmModal>
      )}
    </div>
  );
};

export default VehiclesPage;
