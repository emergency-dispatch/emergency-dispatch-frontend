// Mirror EmergencyDispatch.Application.DTOs.Security (enum trả về dạng chuỗi).
// Tên thời hạn khác BlockDuration ('7d'…) của Operator ở types/incident.ts — hai bên không dùng chung.

export type BlockDurationDto = 'SevenDays' | 'ThirtyDays' | 'OneYear' | 'Permanent';

export type BlockedNumberStatus = 'Active' | 'Expired' | 'Removed';

/** Một bản ghi của GET /api/blocked-numbers — số điện thoại luôn được backend che. */
export interface BlockedNumberDto {
  id: string;
  maskedPhone: string;
  duration: BlockDurationDto;
  status: BlockedNumberStatus;
  blockedAt: string;
  /** null = vĩnh viễn. */
  expiresAt: string | null;
  reason: string;
  incidentId: string | null;
  blockedByName: string | null;
  lastExtendedAt: string | null;
  removedAt: string | null;
  removedByName: string | null;
  removeReason: string | null;
}
