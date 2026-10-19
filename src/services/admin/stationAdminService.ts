import { UserRole } from '../../types/auth';
import type { PaginatedResultDto } from '../../types/incident';
import {
  isVehicleBusy,
  type AdminStation,
  type AdminStationListItem,
  type StationDeleteResult,
  type StationInput,
} from '../../types/adminFleet';
import { adminStore } from './adminStore';
import { auditTrailService } from './auditTrailService';
import { clone, mockApiError, mockDelay, normalizeText, paginate, type PageParams } from './adminMock';

export interface StationListParams extends PageParams {
  search?: string;
  /** Mặc định ẩn trạm đã xóa mềm. */
  includeDeleted?: boolean;
}

// Hotline nội khu: số ngắn (114, 115) hoặc số cố định/di động tối đa 11 chữ số.
export const HOTLINE_PATTERN = /^\d{3,11}$/;

function toListItem(station: AdminStation): AdminStationListItem {
  const vehicles = adminStore.vehicles.filter((v) => v.stationId === station.id && !v.isDeleted);
  const head = adminStore.accounts.find((a) => a.id === station.headOperatorId);
  return {
    ...station,
    headOperatorName: head?.fullName ?? null,
    vehicleCount: vehicles.length,
    availableVehicleCount: vehicles.filter((v) => v.status === 'available').length,
  };
}

function findActive(id: string): AdminStation {
  const station = adminStore.stations.find((s) => s.id === id && !s.isDeleted);
  if (!station) throw mockApiError(404, 'Không tìm thấy trạm hoặc trạm đã bị xóa.');
  return station;
}

function validate(input: StationInput, currentId: string | null) {
  if (!input.name.trim()) throw mockApiError(400, 'Tên trạm không được để trống.');
  if (!(input.coverageRadiusKm > 0)) throw mockApiError(400, 'Bán kính phủ sóng phải lớn hơn 0.');
  if (!HOTLINE_PATTERN.test(input.hotline)) throw mockApiError(400, 'Hotline phải gồm 3–11 chữ số.');

  const duplicateName = adminStore.stations.some(
    (s) => !s.isDeleted && s.id !== currentId && normalizeText(s.name) === normalizeText(input.name)
  );
  if (duplicateName) throw mockApiError(409, 'Đã có trạm khác cùng tên.');

  if (input.headOperatorId) {
    const head = adminStore.accounts.find((a) => a.id === input.headOperatorId);
    if (!head || head.role !== UserRole.Operator) throw mockApiError(400, 'Trưởng trạm phải là tài khoản Operator.');
    // Khóa tài khoản gỡ khỏi vị trí trưởng trạm → không gán lại tài khoản đang bị Admin khóa.
    if (head.lock.kind === 'admin') throw mockApiError(409, `${head.fullName} đang bị khóa, không thể làm trưởng trạm.`);
    const otherStation = adminStore.stations.find(
      (s) => !s.isDeleted && s.id !== currentId && s.headOperatorId === input.headOperatorId
    );
    if (otherStation) {
      throw mockApiError(409, `${head.fullName} đang là trưởng trạm "${otherStation.name}". Mỗi Operator chỉ làm trưởng 1 trạm.`);
    }
  }
}

const normalizeInput = (input: StationInput): StationInput => ({
  ...input,
  name: input.name.trim(),
  address: input.address.trim(),
  hotline: input.hotline.replace(/\s/g, ''),
});

export const stationAdminService = {
  // TODO(backend): GET /api/Stations?search=&includeDeleted=&pageIndex=&pageSize=
  async list(params: StationListParams = {}): Promise<PaginatedResultDto<AdminStationListItem>> {
    await mockDelay();
    const q = normalizeText(params.search ?? '');
    const items = adminStore.stations
      .filter((s) => params.includeDeleted || !s.isDeleted)
      .filter((s) => !q || normalizeText(`${s.name} ${s.address} ${s.area} ${s.hotline}`).includes(q))
      .map(toListItem);
    return clone(paginate(items, params));
  },

  // TODO(backend): POST /api/Stations
  async create(input: StationInput): Promise<AdminStation> {
    await mockDelay();
    const data = normalizeInput(input);
    validate(data, null);
    const station: AdminStation = { ...data, id: `st-${Date.now()}`, isDeleted: false };
    adminStore.stations.push(station);
    return clone(station);
  },

  // TODO(backend): PUT /api/Stations/{id}
  async update(id: string, input: StationInput): Promise<AdminStation> {
    await mockDelay();
    const station = findActive(id);
    const data = normalizeInput(input);
    validate(data, id);
    Object.assign(station, data);
    return clone(station);
  },

  /**
   * Xóa mềm trạm (IsDeleted). Toàn bộ xe thuộc trạm chuyển sang OutOfService.
   * Trạm còn xe đang làm nhiệm vụ / hồi sức → 409.
   */
  // TODO(backend): DELETE /api/Stations/{id}
  async softDelete(id: string): Promise<StationDeleteResult> {
    await mockDelay();
    const station = findActive(id);
    const vehicles = adminStore.vehicles.filter((v) => v.stationId === id && !v.isDeleted);

    const busy = vehicles.filter((v) => isVehicleBusy(v.status));
    if (busy.length > 0) {
      throw mockApiError(
        409,
        `Không thể xóa trạm: còn ${busy.length} xe đang làm nhiệm vụ (${busy.map((v) => v.plate).join(', ')}).`
      );
    }

    // Xe còn lại chỉ có thể Sẵn sàng hoặc Bảo trì (xe đang làm nhiệm vụ đã bị chặn ở trên).
    const previousStatus = new Map(vehicles.map((v) => [v.id, v.status === 'maintenance' ? 'Bảo trì' : 'Sẵn sàng']));
    station.isDeleted = true;
    vehicles.forEach((v) => {
      v.status = 'out_of_service';
      v.maintenanceSince = null;
    });

    auditTrailService.record({
      action: 'station_deleted',
      targetType: 'station',
      targetId: station.id,
      targetLabel: station.name,
      detail:
        vehicles.length > 0
          ? `Xóa mềm trạm. ${vehicles.length} xe chuyển sang Ngừng hoạt động: ${vehicles.map((v) => v.plate).join(', ')}.`
          : 'Xóa mềm trạm (không có xe trực thuộc).',
    });
    vehicles.forEach((v) =>
      auditTrailService.record({
        action: 'vehicle_status_changed',
        targetType: 'vehicle',
        targetId: v.id,
        targetLabel: v.plate,
        detail: `Chuyển sang Ngừng hoạt động do trạm "${station.name}" bị xóa.`,
        changes: [{ field: 'Trạng thái', from: previousStatus.get(v.id) ?? '—', to: 'Ngừng hoạt động' }],
      })
    );

    return { affectedVehicleIds: vehicles.map((v) => v.id) };
  },
};
