import type { CitizenRecord } from '../../data/admin/citizenSeed';
import type { PaginatedResultDto } from '../../types/incident';
import type { CitizenListItem, CitizenStatus } from '../../types/adminCitizen';
import { maskPhone } from '../../utils/incidentFormat';
import { REASON_MIN_LENGTH } from './validation';
import { adminStore } from './adminStore';
import { auditTrailService } from './auditTrailService';
import { isPhoneBlocked } from './blockedNumberService';
import { clone, getMockActor, mockApiError, mockDelay, normalizeText, paginate, type PageParams } from './adminMock';

export type CitizenSort = 'registered_desc' | 'false_reports_desc';

export interface CitizenListParams extends PageParams {
  status?: CitizenStatus;
  /** Họ tên, hoặc 3+ số cuối của SĐT. */
  search?: string;
  sort?: CitizenSort;
}

function toListItem(record: CitizenRecord, now: number): CitizenListItem {
  const { phoneNumber, ...rest } = record;
  return { ...rest, maskedPhone: maskPhone(phoneNumber), phoneBlocked: isPhoneBlocked(phoneNumber, now) };
}

function findCitizen(id: string): CitizenRecord {
  const citizen = adminStore.citizens.find((c) => c.id === id);
  if (!citizen) throw mockApiError(404, 'Không tìm thấy tài khoản Citizen.');
  return citizen;
}

function requireReason(reason: string, action: string): string {
  const trimmed = reason.trim();
  if (trimmed.length < REASON_MIN_LENGTH) {
    throw mockApiError(400, `Lý do ${action} phải có ít nhất ${REASON_MIN_LENGTH} ký tự.`);
  }
  return trimmed;
}

// Chỉ xem + khóa/mở khóa. Không tạo, sửa hồ sơ, xóa, hay xem hồ sơ y tế / danh bạ ICE.
export const citizenAdminService = {
  /** SĐT trả về luôn ở dạng đã che; tìm theo số cuối được thực hiện phía server. */
  // TODO(backend): GET /api/Citizens?status=&search=&sort=&pageIndex=&pageSize=
  async list(params: CitizenListParams = {}): Promise<PaginatedResultDto<CitizenListItem>> {
    await mockDelay();
    const now = Date.now();
    const q = normalizeText(params.search ?? '');
    const digits = q.replace(/\D/g, '');
    const items = adminStore.citizens
      .filter((c) => !params.status || c.lock.kind === params.status)
      .filter(
        (c) => !q || normalizeText(c.fullName).includes(q) || (digits.length >= 3 && c.phoneNumber.endsWith(digits))
      )
      .sort((a, b) =>
        params.sort === 'false_reports_desc'
          ? b.falseReportCount - a.falseReportCount || b.reportedIncidentCount - a.reportedIncidentCount
          : new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
      )
      .map((c) => toListItem(c, now));
    return clone(paginate(items, params));
  },

  /** Chỉ chặn đăng nhập và báo sự cố mới; sự cố đang xử lý vẫn tiếp tục. */
  // TODO(backend): POST /api/Citizens/{id}/lock { reason }
  async lock(id: string, reason: string): Promise<CitizenListItem> {
    await mockDelay();
    const citizen = findCitizen(id);
    const trimmed = requireReason(reason, 'khóa');
    if (citizen.lock.kind === 'admin') throw mockApiError(409, 'Tài khoản đã bị khóa.');

    citizen.lock = { kind: 'admin', reason: trimmed, lockedAt: new Date().toISOString(), lockedByName: getMockActor().name };
    auditTrailService.record({
      action: 'account_locked',
      targetType: 'citizen',
      targetId: citizen.id,
      targetLabel: `${citizen.fullName} (${maskPhone(citizen.phoneNumber)})`,
      detail: `Khóa tài khoản Citizen (${citizen.falseReportCount} ca báo khống).`,
      changes: [{ field: 'Trạng thái', from: 'Hoạt động', to: 'Bị khóa' }],
      reason: trimmed,
    });
    return clone(toListItem(citizen, Date.now()));
  },

  // TODO(backend): POST /api/Citizens/{id}/unlock { reason }
  async unlock(id: string, reason: string): Promise<CitizenListItem> {
    await mockDelay();
    const citizen = findCitizen(id);
    const trimmed = requireReason(reason, 'mở khóa');
    if (citizen.lock.kind !== 'admin') throw mockApiError(409, 'Tài khoản không bị khóa.');

    citizen.lock = { kind: 'none' };
    auditTrailService.record({
      action: 'account_unlocked',
      targetType: 'citizen',
      targetId: citizen.id,
      targetLabel: `${citizen.fullName} (${maskPhone(citizen.phoneNumber)})`,
      detail: 'Mở khóa tài khoản Citizen.',
      changes: [{ field: 'Trạng thái', from: 'Bị khóa', to: 'Hoạt động' }],
      reason: trimmed,
    });
    return clone(toListItem(citizen, Date.now()));
  },
};
