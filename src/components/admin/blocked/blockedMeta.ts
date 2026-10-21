import type { BlockDuration } from '../../../types/incident';
import type { BlockedNumberStatus } from '../../../types/blockedNumber';

export const BLOCK_DURATIONS: BlockDuration[] = ['7d', '30d', '1y', 'permanent'];

export const BLOCK_DURATION_LABEL: Record<BlockDuration, string> = {
  '7d': '7 ngày',
  '30d': '30 ngày',
  '1y': '1 năm',
  permanent: 'Vĩnh viễn',
};

export const BLOCK_STATUSES: BlockedNumberStatus[] = ['active', 'expired', 'removed'];

export const BLOCK_STATUS_META: Record<BlockedNumberStatus, { label: string; badgeClass: string }> = {
  active: { label: 'Còn hiệu lực', badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  expired: { label: 'Đã hết hạn', badgeClass: 'bg-slate-100 text-slate-500 border-slate-200' },
  removed: { label: 'Đã gỡ', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export const formatExpiry = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : 'Vĩnh viễn');
