import { UserRole } from '../../types/auth';
import { isVehicleBusy } from '../../types/adminFleet';
import type { PaginatedResultDto } from '../../types/incident';
import type {
  AccountLock,
  AccountStatus,
  InternalAccount,
  InternalAccountInput,
  InternalAccountListItem,
  InternalRole,
} from '../../types/internalAccount';
import { adminStore } from './adminStore';
import { auditTrailService } from './auditTrailService';
import { currentShiftBusyVehicle } from './shiftService';
import { clone, getMockActor, mockApiError, mockDelay, normalizeText, paginate, type PageParams } from './adminMock';

export interface AccountListParams extends PageParams {
  role?: InternalRole;
  status?: AccountStatus;
  search?: string;
}

/** Lý do khóa / mở khóa thủ công tối thiểu 5 ký tự (giống lý do ghi đè AI bên Operator). */
export const LOCK_REASON_MIN_LENGTH = 5;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^0\d{9}$/;

const ROLE_LABEL: Record<InternalRole, string> = {
  [UserRole.Operator]: 'Operator',
  [UserRole.RescueStaff]: 'RescueStaff',
};

/** Khóa tạm do sai mật khẩu tự hết sau 15 phút — backend thật trả trạng thái đã tính sẵn. */
function effectiveLock(account: InternalAccount): AccountLock {
  if (account.lock.kind === 'failed_login' && new Date(account.lock.until).getTime() <= Date.now()) {
    account.lock = { kind: 'none' };
  }
  return account.lock;
}

function headStationOf(accountId: string) {
  return adminStore.stations.find((s) => !s.isDeleted && s.headOperatorId === accountId) ?? null;
}

function vehicleOf(accountId: string) {
  return adminStore.vehicles.find((v) => !v.isDeleted && v.crewMemberId === accountId) ?? null;
}

function toListItem(account: InternalAccount): InternalAccountListItem {
  effectiveLock(account);
  const station = headStationOf(account.id);
  const vehicle = vehicleOf(account.id);
  return {
    ...account,
    headOfStation: station ? { id: station.id, name: station.name } : null,
    assignedVehicle: vehicle ? { id: vehicle.id, plate: vehicle.plate, busy: isVehicleBusy(vehicle.status) } : null,
    currentShiftBusyVehiclePlate: currentShiftBusyVehicle(account.id)?.plate ?? null,
  };
}

function findAccount(id: string): InternalAccount {
  const account = adminStore.accounts.find((a) => a.id === id);
  if (!account) throw mockApiError(404, 'Không tìm thấy tài khoản.');
  return account;
}

function normalizeInput(input: InternalAccountInput): InternalAccountInput {
  return {
    fullName: input.fullName.trim().replace(/\s+/g, ' '),
    email: input.email.trim().toLowerCase(),
    phoneNumber: input.phoneNumber.replace(/[\s.-]/g, ''),
    role: input.role,
  };
}

function validate(input: InternalAccountInput, current: InternalAccount | null) {
  if (!input.fullName) throw mockApiError(400, 'Họ tên không được để trống.');
  if (!EMAIL_PATTERN.test(input.email)) throw mockApiError(400, 'Email không hợp lệ.');
  if (!PHONE_PATTERN.test(input.phoneNumber)) throw mockApiError(400, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.');
  // Không tạo được Admin (hay Citizen) — chặn cả khi UI bị bỏ qua.
  if (input.role !== UserRole.Operator && input.role !== UserRole.RescueStaff) {
    throw mockApiError(400, 'Chỉ được tạo tài khoản Operator hoặc RescueStaff.');
  }

  const duplicateEmail = adminStore.accounts.some((a) => a.id !== current?.id && a.email.toLowerCase() === input.email);
  if (duplicateEmail) throw mockApiError(409, `Email ${input.email} đã được dùng cho tài khoản khác.`);

  if (current && current.role !== input.role) {
    const station = headStationOf(current.id);
    if (station) {
      throw mockApiError(409, `${current.fullName} đang là trưởng trạm "${station.name}". Gỡ khỏi vị trí trưởng trạm trước khi đổi vai trò.`);
    }
    const vehicle = vehicleOf(current.id);
    if (vehicle) {
      throw mockApiError(409, `${current.fullName} đang phụ trách xe ${vehicle.plate}. Gỡ khỏi vị trí người phụ trách xe trước khi đổi vai trò.`);
    }
  }
}

function requireReason(reason: string | undefined, action: string): string {
  const trimmed = (reason ?? '').trim();
  if (trimmed.length < LOCK_REASON_MIN_LENGTH) {
    throw mockApiError(400, `Lý do ${action} phải có ít nhất ${LOCK_REASON_MIN_LENGTH} ký tự.`);
  }
  return trimmed;
}

export const accountAdminService = {
  /** Chỉ trả Operator và RescueStaff — Admin và Citizen không nằm trong màn này. */
  // TODO(backend): GET /api/Users?roles=Operator,RescueStaff&role=&status=&search=&pageIndex=&pageSize=
  async listAccounts(params: AccountListParams = {}): Promise<PaginatedResultDto<InternalAccountListItem>> {
    await mockDelay();
    const q = normalizeText(params.search ?? '');
    const items = adminStore.accounts
      .map(toListItem)
      .filter(
        (a) =>
          (!params.role || a.role === params.role) &&
          (!params.status || a.lock.kind === params.status) &&
          (!q || normalizeText(`${a.fullName} ${a.email}`).includes(q))
      );
    return clone(paginate(items, params));
  },

  /** Không có mật khẩu: backend tạo tài khoản và gửi email đặt mật khẩu. */
  // TODO(backend): POST /api/Users (backend gửi email đặt mật khẩu)
  async create(input: InternalAccountInput): Promise<InternalAccount> {
    await mockDelay();
    const data = normalizeInput(input);
    validate(data, null);
    const account: InternalAccount = { ...data, id: `acc-${Date.now()}`, lock: { kind: 'none' } };
    adminStore.accounts.push(account);
    return clone(account);
  },

  // TODO(backend): PUT /api/Users/{id}
  async update(id: string, input: InternalAccountInput): Promise<InternalAccount> {
    await mockDelay();
    const account = findAccount(id);
    const data = normalizeInput(input);
    validate(data, account);
    Object.assign(account, data);
    return clone(account);
  },

  /**
   * Admin khóa tài khoản (bắt buộc lý do). Hệ quả:
   * - Operator đang là trưởng trạm → gỡ khỏi vị trí trưởng trạm.
   * - RescueStaff có xe đang làm nhiệm vụ / hồi sức → 409; xe không làm nhiệm vụ → gỡ khỏi xe.
   */
  // TODO(backend): POST /api/Users/{id}/lock { reason }
  async lock(id: string, reason: string): Promise<InternalAccount> {
    await mockDelay();
    const account = findAccount(id);
    const trimmed = requireReason(reason, 'khóa');
    if (effectiveLock(account).kind === 'admin') throw mockApiError(409, 'Tài khoản đã bị khóa.');
    const lockLabel = account.lock.kind === 'failed_login' ? 'Khóa tạm (sai mật khẩu)' : 'Hoạt động';

    const shiftVehicle = currentShiftBusyVehicle(account.id);
    if (shiftVehicle) {
      throw mockApiError(409, `${account.fullName} đang trong kíp ca hiện tại của xe ${shiftVehicle.plate} (đang làm nhiệm vụ), chưa thể khóa tài khoản.`);
    }
    const vehicle = vehicleOf(account.id);
    if (vehicle && isVehicleBusy(vehicle.status)) {
      throw mockApiError(409, `Xe ${vehicle.plate} của ${account.fullName} đang làm nhiệm vụ, chưa thể khóa tài khoản.`);
    }

    const consequences: string[] = [];
    const station = headStationOf(account.id);
    if (station) {
      station.headOperatorId = null;
      consequences.push(`Gỡ khỏi vị trí trưởng trạm "${station.name}".`);
    }
    if (vehicle) {
      vehicle.crewMemberId = null;
      consequences.push(`Gỡ khỏi vị trí người phụ trách xe ${vehicle.plate}.`);
    }

    account.lock = { kind: 'admin', reason: trimmed, lockedAt: new Date().toISOString(), lockedByName: getMockActor().name };
    auditTrailService.record({
      action: 'account_locked',
      targetType: 'account',
      targetId: account.id,
      targetLabel: `${account.fullName} (${ROLE_LABEL[account.role]})`,
      detail: ['Khóa tài khoản.', ...consequences].join(' '),
      changes: [{ field: 'Trạng thái', from: lockLabel, to: 'Bị Admin khóa' }],
      reason: trimmed,
    });
    return clone(account);
  },

  /**
   * Mở khóa. Khóa do Admin → bắt buộc lý do; khóa tạm do sai mật khẩu 5 lần → mở nhanh, không cần lý do.
   * Không tự gán lại trưởng trạm / xe đã gỡ khi khóa.
   */
  // TODO(backend): POST /api/Users/{id}/unlock { reason? }
  async unlock(id: string, reason?: string): Promise<InternalAccount> {
    await mockDelay();
    const account = findAccount(id);
    const lock = effectiveLock(account);
    if (lock.kind === 'none') throw mockApiError(409, 'Tài khoản không bị khóa.');

    const unlockReason = lock.kind === 'admin' ? requireReason(reason, 'mở khóa') : null;
    const detail =
      lock.kind === 'admin'
        ? 'Mở khóa tài khoản bị Admin khóa.'
        : 'Mở khóa nhanh tài khoản bị khóa tạm do sai mật khẩu 5 lần.';

    account.lock = { kind: 'none' };
    auditTrailService.record({
      action: 'account_unlocked',
      targetType: 'account',
      targetId: account.id,
      targetLabel: `${account.fullName} (${ROLE_LABEL[account.role]})`,
      detail,
      changes: [
        { field: 'Trạng thái', from: lock.kind === 'admin' ? 'Bị Admin khóa' : 'Khóa tạm (sai mật khẩu)', to: 'Hoạt động' },
      ],
      reason: unlockReason,
    });
    return clone(account);
  },
};
