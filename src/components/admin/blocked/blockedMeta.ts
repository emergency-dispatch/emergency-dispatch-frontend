import type { BlockDurationDto, BlockedNumberStatus } from '../../../types/blockedNumber';
import i18n, { dateLocale } from '../../../i18n';

export const BLOCK_DURATIONS: BlockDurationDto[] = ['SevenDays', 'ThirtyDays', 'OneYear', 'Permanent'];

export const BLOCK_STATUSES: BlockedNumberStatus[] = ['Active', 'Expired', 'Removed'];

// Nhãn dịch theo admin.users.blocked.duration.* / admin.users.blocked.status.*
export const BLOCK_STATUS_META: Record<BlockedNumberStatus, { badgeClass: string }> = {
  Active: { badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  Expired: { badgeClass: 'bg-slate-100 text-slate-500 border-slate-200' },
  Removed: { badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export const formatExpiry = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(dateLocale()) : i18n.t('admin.users.blocked.permanent');

const DAY_MS = 24 * 60 * 60 * 1000;

/** Hạn mới nếu gia hạn tại thời điểm `from` — cùng công thức BlockedPhoneNumber.CalculateExpiry; null = vĩnh viễn. */
export function extendedExpiry(duration: BlockDurationDto, from = new Date()): string | null {
  switch (duration) {
    case 'SevenDays':
      return new Date(from.getTime() + 7 * DAY_MS).toISOString();
    case 'ThirtyDays':
      return new Date(from.getTime() + 30 * DAY_MS).toISOString();
    case 'OneYear': {
      const d = new Date(from);
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString();
    }
    case 'Permanent':
      return null;
  }
}

/**
 * Hạn mới có sau hạn hiện tại không. Backend cho đặt bất kỳ thời hạn nào (kể cả rút ngắn),
 * màn hình chỉ cho "gia hạn" thật sự: vĩnh viễn luôn sau mọi ngày; đã vĩnh viễn thì không gia hạn được.
 */
export function isLaterExpiry(next: string | null, current: string | null): boolean {
  if (current === null) return false;
  if (next === null) return true;
  return new Date(next).getTime() > new Date(current).getTime();
}
