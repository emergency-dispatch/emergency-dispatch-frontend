import type { BlockDuration } from '../../types/incident';

// Bản ghi số bị chặn trong store mock (có SĐT gốc). Service chỉ trả SĐT đã che ra UI.
// TODO(backend): bỏ khi có API BlockedPhoneNumbers.
export interface BlockedNumberRecord {
  id: string;
  phoneNumber: string;
  duration: BlockDuration;
  blockedAt: string;
  expiresAt: string | null;
  blockedByName: string;
  incidentId: string;
  reason: string;
  lastExtendedAt: string | null;
  removedAt: string | null;
  removedByName: string | null;
  removeReason: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (d: number) => new Date(Date.now() - d * DAY_MS).toISOString();

// Số bị Operator chặn khi hủy ca báo khống. ctz-02, ctz-08, ctz-17 có số trùng (ctz-08 đã hết hạn).
export const blockedNumberSeed: BlockedNumberRecord[] = [
  blocked('blk-1', '0903111202', '30d', daysAgo(6), 'Phạm Trung Tín', 'inc-2012', 'Báo cháy giả tại xưởng B3, đã xác minh không có sự cố'),
  blocked('blk-2', '0903111217', '7d', daysAgo(2), 'Vũ Thị Lan', 'inc-2030', 'Ảnh gửi lên lấy từ Internet, không trùng hiện trường'),
  blocked('blk-3', '0977654321', '1y', daysAgo(40), 'Trần Thị Hạnh', 'inc-1987', 'Gọi báo tai nạn giả 3 lần trong một ca trực'),
  blocked('blk-4', '0388123456', 'permanent', daysAgo(120), 'Đỗ Minh Quân', 'inc-1802', 'Cố ý báo khống gây điều xe cứu hỏa, đã chuyển công an KCN'),
  blocked('blk-5', '0912000777', '30d', daysAgo(12), 'Phạm Trung Tín', 'inc-2008', 'Báo ùn tắc kèm tai nạn không có thật'),
  blocked('blk-6', '0866555444', 'permanent', daysAgo(75), 'Nguyễn Hoàng Phúc', 'inc-1899', 'Quấy rối tổng đài, báo khống liên tục'),
  // Đã hết hạn
  blocked('blk-7', '0903111208', '7d', daysAgo(20), 'Vũ Thị Lan', 'inc-1950', 'Báo sự cố trùng lặp nhiều lần cho cùng một vụ'),
  blocked('blk-8', '0799888111', '30d', daysAgo(45), 'Trần Thị Hạnh', 'inc-1921', 'Báo cháy giả tại khu ký túc xá'),
];

function blocked(
  id: string,
  phoneNumber: string,
  duration: BlockDuration,
  blockedAt: string,
  blockedByName: string,
  incidentId: string,
  reason: string
): BlockedNumberRecord {
  return {
    id,
    phoneNumber,
    duration,
    blockedAt,
    expiresAt: blockExpiry(duration, blockedAt),
    blockedByName,
    incidentId,
    reason,
    lastExtendedAt: null,
    removedAt: null,
    removedByName: null,
    removeReason: null,
  };
}

/** Ngày hết hạn tính từ `fromIso`; null = vĩnh viễn. 1 năm tính theo lịch (cùng ngày năm sau). */
export function blockExpiry(duration: BlockDuration, fromIso: string): string | null {
  const from = new Date(fromIso);
  switch (duration) {
    case '7d':
      return new Date(from.getTime() + 7 * DAY_MS).toISOString();
    case '30d':
      return new Date(from.getTime() + 30 * DAY_MS).toISOString();
    case '1y': {
      const d = new Date(from);
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString();
    }
    case 'permanent':
      return null;
  }
}
