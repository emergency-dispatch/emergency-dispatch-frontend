import { blockExpiry, type BlockedNumberRecord } from '../../data/admin/blockedNumberSeed';
import type { BlockDuration, PaginatedResultDto } from '../../types/incident';
import type { BlockedNumberListItem, BlockedNumberStatus } from '../../types/blockedNumber';
import { maskPhone } from '../../utils/incidentFormat';
import { REASON_MIN_LENGTH } from './validation';
import { adminStore } from './adminStore';
import { auditTrailService } from './auditTrailService';
import { clone, getMockActor, mockApiError, mockDelay, normalizeText, paginate, type PageParams } from './adminMock';

export interface BlockedNumberListParams extends PageParams {
  status?: BlockedNumberStatus;
  duration?: BlockDuration;
  /** Tìm theo 3+ số cuối của SĐT hoặc mã sự cố. */
  search?: string;
}

const DURATION_LABEL: Record<BlockDuration, string> = {
  '7d': '7 ngày',
  '30d': '30 ngày',
  '1y': '1 năm',
  permanent: 'Vĩnh viễn',
};

export function blockStatus(record: BlockedNumberRecord, now = Date.now()): BlockedNumberStatus {
  if (record.removedAt) return 'removed';
  if (record.expiresAt && new Date(record.expiresAt).getTime() <= now) return 'expired';
  return 'active';
}

/** Hạn mới khi gia hạn từ thời điểm `now`; null = vĩnh viễn. Hàm thuần để UI xem trước trước khi lưu. */
export const extendedExpiry = (duration: BlockDuration, now = new Date()) => blockExpiry(duration, now.toISOString());

/** Hạn mới có sau hạn hiện tại không (vĩnh viễn luôn sau mọi ngày; đã vĩnh viễn thì không gia hạn được). */
export function isLaterExpiry(next: string | null, current: string | null): boolean {
  if (current === null) return false;
  if (next === null) return true;
  return new Date(next).getTime() > new Date(current).getTime();
}

function toListItem(record: BlockedNumberRecord, now: number): BlockedNumberListItem {
  const { phoneNumber, ...rest } = record;
  return { ...rest, maskedPhone: maskPhone(phoneNumber), status: blockStatus(record, now) };
}

function findRecord(id: string): BlockedNumberRecord {
  const record = adminStore.blockedNumbers.find((b) => b.id === id);
  if (!record) throw mockApiError(404, 'Không tìm thấy số bị chặn.');
  return record;
}

function requireReason(reason: string, action: string): string {
  const trimmed = reason.trim();
  if (trimmed.length < REASON_MIN_LENGTH) {
    throw mockApiError(400, `Lý do ${action} phải có ít nhất ${REASON_MIN_LENGTH} ký tự.`);
  }
  return trimmed;
}

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : 'Vĩnh viễn');

export const blockedNumberService = {
  // TODO(backend): GET /api/BlockedPhoneNumbers?status=&duration=&search=&pageIndex=&pageSize=
  async list(params: BlockedNumberListParams = {}): Promise<PaginatedResultDto<BlockedNumberListItem>> {
    await mockDelay();
    const now = Date.now();
    const q = normalizeText(params.search ?? '');
    const digits = q.replace(/\D/g, '');
    const items = adminStore.blockedNumbers
      .filter((b) => !params.status || blockStatus(b, now) === params.status)
      .filter((b) => !params.duration || b.duration === params.duration)
      .filter(
        (b) =>
          !q ||
          (digits.length >= 3 && b.phoneNumber.endsWith(digits)) ||
          normalizeText(b.incidentId).includes(q)
      )
      .sort((a, b) => new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime())
      .map((b) => toListItem(b, now));
    return clone(paginate(items, params));
  },

  /** Gỡ chặn (bắt buộc lý do). Chỉ số còn hiệu lực. */
  // TODO(backend): POST /api/BlockedPhoneNumbers/{id}/unblock { reason }
  async unblock(id: string, reason: string): Promise<BlockedNumberListItem> {
    await mockDelay();
    const record = findRecord(id);
    const trimmed = requireReason(reason, 'gỡ chặn');
    if (blockStatus(record) !== 'active') throw mockApiError(409, 'Số này không còn bị chặn.');

    const actor = getMockActor();
    record.removedAt = new Date().toISOString();
    record.removedByName = actor.name;
    record.removeReason = trimmed;
    auditTrailService.record({
      action: 'number_unblocked',
      targetType: 'blocked_number',
      targetId: record.id,
      targetLabel: maskPhone(record.phoneNumber),
      incidentId: record.incidentId,
      detail: `Gỡ chặn (thời hạn ${DURATION_LABEL[record.duration]}, hết hạn ${formatDate(record.expiresAt)}).`,
      changes: [{ field: 'Trạng thái', from: 'Còn hiệu lực', to: 'Đã gỡ' }],
      reason: trimmed,
    });
    return clone(toListItem(record, Date.now()));
  },

  /**
   * Gia hạn: thời hạn mới tính từ bây giờ, hạn mới phải sau hạn đang có (bắt buộc lý do).
   * Chỉ số còn hiệu lực; số đã chặn vĩnh viễn không gia hạn được.
   */
  // TODO(backend): POST /api/BlockedPhoneNumbers/{id}/extend { duration, reason }
  async extend(id: string, duration: BlockDuration, reason: string): Promise<BlockedNumberListItem> {
    await mockDelay();
    const record = findRecord(id);
    const trimmed = requireReason(reason, 'gia hạn');
    if (blockStatus(record) !== 'active') throw mockApiError(409, 'Chỉ gia hạn được số đang còn hiệu lực.');
    if (record.expiresAt === null) throw mockApiError(409, 'Số này đã bị chặn vĩnh viễn.');

    const nextExpiry = extendedExpiry(duration);
    if (!isLaterExpiry(nextExpiry, record.expiresAt)) {
      throw mockApiError(400, `Hạn mới (${formatDate(nextExpiry)}) phải sau hạn hiện tại (${formatDate(record.expiresAt)}).`);
    }

    const before = { duration: DURATION_LABEL[record.duration], expiry: formatDate(record.expiresAt) };
    record.duration = duration;
    record.expiresAt = nextExpiry;
    record.lastExtendedAt = new Date().toISOString();
    auditTrailService.record({
      action: 'number_block_extended',
      targetType: 'blocked_number',
      targetId: record.id,
      targetLabel: maskPhone(record.phoneNumber),
      incidentId: record.incidentId,
      detail: `Gia hạn chặn tới ${formatDate(nextExpiry)}.`,
      changes: [
        { field: 'Thời hạn', from: before.duration, to: DURATION_LABEL[duration] },
        { field: 'Hết hạn', from: before.expiry, to: formatDate(nextExpiry) },
      ],
      reason: trimmed,
    });
    return clone(toListItem(record, Date.now()));
  },
};
