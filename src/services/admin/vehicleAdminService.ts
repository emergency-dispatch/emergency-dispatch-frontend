import { UserRole } from '../../types/auth';
import type { PaginatedResultDto } from '../../types/incident';
import type { DispatchVehicleType } from '../../types/vehicle';
import {
  isVehicleBusy,
  type AdminVehicle,
  type AdminVehicleListItem,
  type AdminVehicleStatus,
  type VehicleInput,
} from '../../types/adminFleet';
import { adminStore } from './adminStore';
import { auditTrailService } from './auditTrailService';
import { clone, mockApiError, mockDelay, normalizeText, paginate, type PageParams } from './adminMock';

export interface VehicleListParams extends PageParams {
  search?: string;
  stationId?: string;
  type?: DispatchVehicleType;
  status?: AdminVehicleStatus;
  /** Mặc định ẩn xe đã xóa mềm. */
  includeDeleted?: boolean;
}

/** Trạng thái Admin được chủ động đặt (các trạng thái khác do hệ thống tự đổi). */
export type AdminSettableVehicleStatus = Extract<AdminVehicleStatus, 'available' | 'maintenance'>;

const STATUS_LABEL: Record<AdminSettableVehicleStatus, string> = {
  available: 'Sẵn sàng',
  maintenance: 'Bảo trì',
};

const normalizePlate = (plate: string) => plate.trim().toUpperCase().replace(/\s+/g, '');

function toListItem(vehicle: AdminVehicle): AdminVehicleListItem {
  return {
    ...vehicle,
    stationName: adminStore.stations.find((s) => s.id === vehicle.stationId)?.name ?? '—',
    crewMemberName: adminStore.accounts.find((a) => a.id === vehicle.crewMemberId)?.fullName ?? null,
  };
}

function findActive(id: string): AdminVehicle {
  const vehicle = adminStore.vehicles.find((v) => v.id === id && !v.isDeleted);
  if (!vehicle) throw mockApiError(404, 'Không tìm thấy xe hoặc xe đã bị xóa.');
  return vehicle;
}

function validate(input: VehicleInput, current: AdminVehicle | null) {
  if (!input.plate) throw mockApiError(400, 'Biển số không được để trống.');

  const duplicatePlate = adminStore.vehicles.some(
    (v) => !v.isDeleted && v.id !== current?.id && normalizePlate(v.plate) === input.plate
  );
  if (duplicatePlate) throw mockApiError(409, `Biển số ${input.plate} đã tồn tại.`);

  const station = adminStore.stations.find((s) => s.id === input.stationId && !s.isDeleted);
  if (!station) throw mockApiError(400, 'Trạm trực thuộc không tồn tại hoặc đã bị xóa.');

  if (current && current.stationId !== input.stationId && isVehicleBusy(current.status)) {
    throw mockApiError(409, 'Xe đang làm nhiệm vụ, không thể đổi trạm trực thuộc.');
  }

  if (input.crewMemberId) {
    const crew = adminStore.accounts.find((a) => a.id === input.crewMemberId);
    if (!crew || crew.role !== UserRole.RescueStaff) throw mockApiError(400, 'Nhân sự phải là tài khoản RescueStaff.');
    // Khóa tài khoản gỡ khỏi xe → không gán lại tài khoản đang bị Admin khóa.
    if (crew.lock.kind === 'admin') throw mockApiError(409, `${crew.fullName} đang bị khóa, không thể gán cho xe.`);
    const otherVehicle = adminStore.vehicles.find(
      (v) => !v.isDeleted && v.id !== current?.id && v.crewMemberId === input.crewMemberId
    );
    if (otherVehicle) {
      throw mockApiError(409, `${crew.fullName} đã được gán cho xe ${otherVehicle.plate}. Mỗi nhân sự chỉ gán cho 1 xe.`);
    }
  }
}

export const vehicleAdminService = {
  // TODO(backend): GET /api/Vehicles?search=&stationId=&type=&status=&includeDeleted=&pageIndex=&pageSize=
  async list(params: VehicleListParams = {}): Promise<PaginatedResultDto<AdminVehicleListItem>> {
    await mockDelay();
    const q = normalizeText(params.search ?? '');
    const items = adminStore.vehicles
      .filter((v) => params.includeDeleted || !v.isDeleted)
      .filter((v) => !params.stationId || v.stationId === params.stationId)
      .filter((v) => !params.type || v.type === params.type)
      .filter((v) => !params.status || v.status === params.status)
      .map(toListItem)
      .filter((v) => !q || normalizeText(`${v.plate} ${v.crewMemberName ?? ''}`).includes(q));
    return clone(paginate(items, params));
  },

  // TODO(backend): POST /api/Vehicles
  async create(input: VehicleInput): Promise<AdminVehicle> {
    await mockDelay();
    const data = { ...input, plate: normalizePlate(input.plate) };
    validate(data, null);
    const vehicle: AdminVehicle = { ...data, id: `veh-${Date.now()}`, status: 'available', isDeleted: false };
    adminStore.vehicles.push(vehicle);
    return clone(vehicle);
  },

  // TODO(backend): PUT /api/Vehicles/{id}
  async update(id: string, input: VehicleInput): Promise<AdminVehicle> {
    await mockDelay();
    const vehicle = findActive(id);
    if (vehicle.status === 'out_of_service') {
      throw mockApiError(409, 'Xe đang ngừng hoạt động — hãy chuyển sang trạm mới trước khi sửa thông tin khác.');
    }
    const data = { ...input, plate: normalizePlate(input.plate) };
    validate(data, vehicle);
    Object.assign(vehicle, data);
    return clone(vehicle);
  },

  /**
   * Đưa xe Ngừng hoạt động (trạm cũ bị xóa) hoạt động trở lại: chuyển sang trạm đang hoạt động
   * và tự đặt Sẵn sàng. Chỉ đổi trạm, các trường khác giữ nguyên.
   */
  // TODO(backend): PATCH /api/Vehicles/{id}/station
  async reassignStation(id: string, stationId: string): Promise<AdminVehicle> {
    await mockDelay();
    const vehicle = findActive(id);
    if (vehicle.status !== 'out_of_service') {
      throw mockApiError(409, 'Chỉ xe đang ngừng hoạt động mới dùng chức năng chuyển trạm này.');
    }
    const station = adminStore.stations.find((s) => s.id === stationId && !s.isDeleted);
    if (!station) throw mockApiError(400, 'Trạm mới không tồn tại hoặc đã bị xóa.');

    const oldStationName = adminStore.stations.find((s) => s.id === vehicle.stationId)?.name ?? vehicle.stationId;
    vehicle.stationId = station.id;
    vehicle.status = 'available';
    auditTrailService.record({
      action: 'vehicle_status_changed',
      targetType: 'vehicle',
      targetId: vehicle.id,
      targetLabel: vehicle.plate,
      detail: `Chuyển trạm "${oldStationName}" (đã xóa) → "${station.name}". Ngừng hoạt động → Sẵn sàng.`,
    });
    return clone(vehicle);
  },

  /** Admin chỉ đổi được Sẵn sàng ↔ Bảo trì. Xe đang làm nhiệm vụ / hồi sức / ngừng hoạt động → 409. */
  // TODO(backend): PATCH /api/Vehicles/{id}/status
  async setStatus(id: string, status: AdminSettableVehicleStatus): Promise<AdminVehicle> {
    await mockDelay();
    const vehicle = findActive(id);
    if (isVehicleBusy(vehicle.status)) {
      throw mockApiError(409, 'Xe đang làm nhiệm vụ, không thể đổi trạng thái.');
    }
    if (vehicle.status !== 'available' && vehicle.status !== 'maintenance') {
      throw mockApiError(409, 'Xe đang ngừng hoạt động, Admin không đổi được trạng thái.');
    }
    if (vehicle.status === status) return clone(vehicle);

    const from = vehicle.status;
    vehicle.status = status;
    auditTrailService.record({
      action: 'vehicle_status_changed',
      targetType: 'vehicle',
      targetId: vehicle.id,
      targetLabel: vehicle.plate,
      detail: `${STATUS_LABEL[from]} → ${STATUS_LABEL[status]}.`,
    });
    return clone(vehicle);
  },

  /** Xóa mềm xe (IsDeleted). Xe đang làm nhiệm vụ / hồi sức → 409. */
  // TODO(backend): DELETE /api/Vehicles/{id}
  async softDelete(id: string): Promise<void> {
    await mockDelay();
    const vehicle = findActive(id);
    if (isVehicleBusy(vehicle.status)) {
      throw mockApiError(409, 'Xe đang làm nhiệm vụ, không thể xóa.');
    }
    vehicle.isDeleted = true;
    auditTrailService.record({
      action: 'vehicle_deleted',
      targetType: 'vehicle',
      targetId: vehicle.id,
      targetLabel: vehicle.plate,
      detail: 'Xóa mềm xe.',
    });
  },
};
