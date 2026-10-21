import type { BlockDuration } from './incident';

// Admin quản lý Citizen ở mức giới hạn: chỉ xem + khóa/mở khóa. Không có hồ sơ y tế, danh bạ ICE.
// SĐT gốc chỉ nằm phía server; dữ liệu trả cho Admin chỉ có SĐT đã che (Admin không có nút "Hiện số").

export type CitizenLock =
  | { kind: 'none' }
  | { kind: 'admin'; reason: string; lockedAt: string; lockedByName: string };

export type CitizenStatus = CitizenLock['kind'];

/** Mirror dự kiến của CitizenSummaryDto (backend chưa có). */
export interface CitizenListItem {
  id: string;
  fullName: string;
  maskedPhone: string;
  registeredAt: string;
  reportedIncidentCount: number;
  /** Số ca bị Operator hủy vì báo khống. */
  falseReportCount: number;
  lock: CitizenLock;
  /** SĐT của người này đang nằm trong danh sách chặn còn hiệu lực. */
  phoneBlocked: boolean;
}

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
