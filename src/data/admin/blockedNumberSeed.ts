import type { BlockDuration } from '../../types/incident';
import type { CitizenLock } from '../../types/adminCitizen';

// Bản ghi trong store mock (có SĐT gốc). Service chỉ trả SĐT đã che ra UI.
export interface CitizenRecord {
  id: string;
  fullName: string;
  phoneNumber: string;
  registeredAt: string;
  reportedIncidentCount: number;
  falseReportCount: number;
  lock: CitizenLock;
}

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
const ACTIVE: CitizenLock = { kind: 'none' };

// Công nhân / người lao động trong Khu Công nghệ cao.
export const citizenSeed: CitizenRecord[] = [
  { id: 'ctz-01', fullName: 'Nguyễn Thị Mai', phoneNumber: '0903111201', registeredAt: daysAgo(210), reportedIncidentCount: 3, falseReportCount: 0, lock: ACTIVE },
  { id: 'ctz-02', fullName: 'Trần Quốc Bảo', phoneNumber: '0903111202', registeredAt: daysAgo(190), reportedIncidentCount: 7, falseReportCount: 4, lock: ACTIVE },
  { id: 'ctz-03', fullName: 'Lê Minh Châu', phoneNumber: '0903111203', registeredAt: daysAgo(180), reportedIncidentCount: 1, falseReportCount: 0, lock: ACTIVE },
  { id: 'ctz-04', fullName: 'Phạm Đức Duy', phoneNumber: '0903111204', registeredAt: daysAgo(170), reportedIncidentCount: 5, falseReportCount: 3, lock: { kind: 'admin', reason: 'Báo khống nhiều lần liên tiếp, đã đổi số để tránh bị chặn', lockedAt: daysAgo(4), lockedByName: 'Quản trị viên' } },
  { id: 'ctz-05', fullName: 'Hoàng Thị Ánh', phoneNumber: '0903111205', registeredAt: daysAgo(160), reportedIncidentCount: 2, falseReportCount: 0, lock: ACTIVE },
  { id: 'ctz-06', fullName: 'Võ Thành Đạt', phoneNumber: '0903111206', registeredAt: daysAgo(150), reportedIncidentCount: 4, falseReportCount: 1, lock: ACTIVE },
  { id: 'ctz-07', fullName: 'Đặng Thu Hà', phoneNumber: '0903111207', registeredAt: daysAgo(140), reportedIncidentCount: 0, falseReportCount: 0, lock: ACTIVE },
  { id: 'ctz-08', fullName: 'Bùi Văn Khoa', phoneNumber: '0903111208', registeredAt: daysAgo(132), reportedIncidentCount: 6, falseReportCount: 2, lock: ACTIVE },
  { id: 'ctz-09', fullName: 'Ngô Thị Lệ', phoneNumber: '0903111209', registeredAt: daysAgo(120), reportedIncidentCount: 1, falseReportCount: 0, lock: ACTIVE },
  { id: 'ctz-10', fullName: 'Dương Hữu Nghĩa', phoneNumber: '0903111210', registeredAt: daysAgo(110), reportedIncidentCount: 2, falseReportCount: 0, lock: ACTIVE },
  { id: 'ctz-11', fullName: 'Lý Thanh Phong', phoneNumber: '0903111211', registeredAt: daysAgo(98), reportedIncidentCount: 3, falseReportCount: 1, lock: ACTIVE },
  { id: 'ctz-12', fullName: 'Trịnh Ngọc Quỳnh', phoneNumber: '0903111212', registeredAt: daysAgo(90), reportedIncidentCount: 1, falseReportCount: 0, lock: ACTIVE },
  { id: 'ctz-13', fullName: 'Huỳnh Tấn Sang', phoneNumber: '0903111213', registeredAt: daysAgo(77), reportedIncidentCount: 0, falseReportCount: 0, lock: ACTIVE },
  { id: 'ctz-14', fullName: 'Phan Thị Thảo', phoneNumber: '0903111214', registeredAt: daysAgo(65), reportedIncidentCount: 2, falseReportCount: 0, lock: ACTIVE },
  { id: 'ctz-15', fullName: 'Cao Văn Toàn', phoneNumber: '0903111215', registeredAt: daysAgo(54), reportedIncidentCount: 1, falseReportCount: 0, lock: ACTIVE },
  { id: 'ctz-16', fullName: 'Mạc Thị Uyên', phoneNumber: '0903111216', registeredAt: daysAgo(40), reportedIncidentCount: 0, falseReportCount: 0, lock: ACTIVE },
  { id: 'ctz-17', fullName: 'Kiều Minh Vũ', phoneNumber: '0903111217', registeredAt: daysAgo(31), reportedIncidentCount: 3, falseReportCount: 2, lock: ACTIVE },
  { id: 'ctz-18', fullName: 'Tôn Nữ Xuân', phoneNumber: '0903111218', registeredAt: daysAgo(22), reportedIncidentCount: 1, falseReportCount: 0, lock: ACTIVE },
  { id: 'ctz-19', fullName: 'La Hoàng Yến', phoneNumber: '0903111219', registeredAt: daysAgo(12), reportedIncidentCount: 0, falseReportCount: 0, lock: ACTIVE },
  { id: 'ctz-20', fullName: 'Châu Gia Huy', phoneNumber: '0903111220', registeredAt: daysAgo(3), reportedIncidentCount: 1, falseReportCount: 0, lock: ACTIVE },
];

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
