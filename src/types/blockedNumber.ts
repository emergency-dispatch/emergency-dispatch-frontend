import type { BlockDuration } from './incident';

export type BlockedNumberStatus = 'active' | 'expired' | 'removed';

/** Mirror dự kiến của BlockedPhoneNumberDto (backend chưa có). */
export interface BlockedNumberListItem {
  id: string;
  maskedPhone: string;
  duration: BlockDuration;
  blockedAt: string;
  /** null = vĩnh viễn. */
  expiresAt: string | null;
  blockedByName: string;
  incidentId: string;
  reason: string;
  status: BlockedNumberStatus;
  lastExtendedAt: string | null;
  removedAt: string | null;
  removedByName: string | null;
  removeReason: string | null;
}
