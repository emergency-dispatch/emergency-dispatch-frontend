import { UserRole } from '../../types/auth';
import type { AuditAction, AuditActorRole, AuditChange, AuditTargetType, AuditTrailEntry } from '../../types/auditTrail';

// Nhật ký mẫu của Command Center trong 7 ngày gần nhất (Admin chưa có API đọc).
// Số bị chặn khớp blockedNumberSeed.
// SĐT chỉ ghi dạng đã che.

const MIN = 60 * 1000;
const ago = (days: number, hours = 0, minutes = 0) =>
  new Date(Date.now() - ((days * 24 + hours) * 60 + minutes) * MIN).toISOString();

type Actor = { id: string; name: string; role: AuditActorRole };
const OP = {
  tin: { id: 'op-1', name: 'Phạm Trung Tín', role: UserRole.Operator },
  lan: { id: 'op-2', name: 'Vũ Thị Lan', role: UserRole.Operator },
  hanh: { id: 'op-3', name: 'Trần Thị Hạnh', role: UserRole.Operator },
  quan: { id: 'op-4', name: 'Đỗ Minh Quân', role: UserRole.Operator },
  phuc: { id: 'op-5', name: 'Nguyễn Hoàng Phúc', role: UserRole.Operator },
} satisfies Record<string, Actor>;
const RS = {
  an: { id: 'rs-1', name: 'Nguyễn Văn An', role: UserRole.RescueStaff },
  cam: { id: 'rs-4', name: 'Lê Thị Cẩm', role: UserRole.RescueStaff },
  hai: { id: 'rs-8', name: 'Đặng Văn Hải', role: UserRole.RescueStaff },
  binh: { id: 'rs-2', name: 'Trần Văn Bình', role: UserRole.RescueStaff },
  dung: { id: 'rs-5', name: 'Phạm Thị Dung', role: UserRole.RescueStaff },
} satisfies Record<string, Actor>;
const SYSTEM: Actor = { id: 'system', name: 'Escalation Daemon', role: 'System' };

const VEH: Record<string, { id: string; plate: string }> = {
  'veh-1': { id: 'veh-1', plate: '51D-123.45' },
  'veh-2': { id: 'veh-2', plate: '51D-123.46' },
  'veh-3': { id: 'veh-3', plate: '51D-123.47' },
  'veh-4': { id: 'veh-4', plate: '51B-234.56' },
  'veh-5': { id: 'veh-5', plate: '51B-234.57' },
  'veh-6': { id: 'veh-6', plate: '51D-345.67' },
  'veh-7': { id: 'veh-7', plate: '51B-345.68' },
  'veh-8': { id: 'veh-8', plate: '51D-456.78' },
  'veh-9': { id: 'veh-9', plate: '51B-456.79' },
};

let seq = 0;
function entry(
  at: string,
  actor: Actor,
  action: AuditAction,
  target: { type: AuditTargetType; id: string; label: string },
  incidentId: string | null,
  detail: string,
  extra: { changes?: AuditChange[]; reason?: string } = {}
): AuditTrailEntry {
  seq += 1;
  return {
    id: `seed-audit-${String(seq).padStart(3, '0')}`,
    at,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    targetType: target.type,
    targetId: target.id,
    targetLabel: target.label,
    incidentId,
    detail,
    changes: extra.changes ?? [],
    reason: extra.reason ?? null,
  };
}

const inc = (id: string) => ({ type: 'incident' as const, id, label: id });
const veh = (key: keyof typeof VEH) => ({ type: 'vehicle' as const, id: VEH[key].id, label: VEH[key].plate });
const status = (from: string, to: string): AuditChange[] => [{ field: 'Trạng thái', from, to }];

const confirmAi = (at: string, a: Actor, id: string, level: number, branch: string) =>
  entry(at, a, 'ai_confirmed', inc(id), id, `Xác nhận kết quả AI: ${branch} · Cấp ${level}.`, {
    changes: status('Chờ xác minh', 'Đã duyệt'),
  });

const overrideAi = (at: string, a: Actor, id: string, from: number, to: number, reason: string) =>
  entry(at, a, 'ai_overridden', inc(id), id, `Ghi đè cấp độ AI: Cấp ${from} → Cấp ${to}.`, {
    changes: [
      { field: 'Cấp độ', from: `Cấp ${from}`, to: `Cấp ${to}` },
      { field: 'Trạng thái', from: 'Chờ xác minh', to: 'Đã duyệt' },
    ],
    reason,
  });

const assign = (at: string, a: Actor, key: keyof typeof VEH, id: string, algorithm: string) =>
  entry(at, a, 'vehicle_assigned', veh(key), id, `Giao xe ${VEH[key].plate} cho ${id} (gợi ý ${algorithm}).`, {
    changes: status('Sẵn sàng', 'Chờ xác nhận'),
  });

const release = (at: string, a: Actor, key: keyof typeof VEH, id: string, reason: string) =>
  entry(at, a, 'vehicle_released', veh(key), id, `Nhả xe ${VEH[key].plate} khỏi ${id}.`, {
    changes: status('Chờ xác nhận', 'Sẵn sàng'),
    reason,
  });

const handover = (at: string, a: Actor, key: keyof typeof VEH, id: string, to: string) =>
  entry(at, a, 'handover_completed', veh(key), id, `Bàn giao nạn nhân cho ${to} (quét QR, có chữ ký).`);

const closeIncident = (at: string, a: Actor, id: string) =>
  entry(at, a, 'incident_status_changed', inc(id), id, 'Đóng sự cố sau khi mọi xe đã nộp báo cáo.', {
    changes: status('Đang xử lý', 'Hoàn thành'),
  });

const reveal = (at: string, a: Actor, id: string, maskedPhone: string) =>
  entry(at, a, 'phone_revealed', inc(id), id, `Bấm "Hiện số" xem SĐT người báo ${maskedPhone}.`);

export const auditTrailSeed: AuditTrailEntry[] = [
  // inc-2041 — cháy kho xưởng Phân khu 1, đang xử lý (veh-1 tại hiện trường, veh-7 đang tới)
  reveal(ago(0, 1, 52), OP.tin, 'inc-2041', '090***201'),
  confirmAi(ago(0, 1, 50), OP.tin, 'inc-2041', 3, '#Fire'),
  assign(ago(0, 1, 48), OP.tin, 'veh-1', 'inc-2041', 'Nearest-Available'),
  assign(ago(0, 1, 47), OP.tin, 'veh-7', 'inc-2041', 'Nearest-Available'),
  entry(ago(0, 1, 40), OP.tin, 'incident_status_changed', inc('inc-2041'), 'inc-2041', 'Đội đầu tiên đã nhận nhiệm vụ.', {
    changes: status('Đã duyệt', 'Đang xử lý'),
  }),

  // inc-2039 — tai nạn lao động Phân khu 2, AI chấm thấp, Operator nâng cấp
  overrideAi(ago(0, 0, 58), OP.lan, 'inc-2039', 1, 2, 'Ảnh cho thấy nạn nhân bất tỉnh, cần xe cứu thương ngay'),
  assign(ago(0, 0, 56), OP.lan, 'veh-5', 'inc-2039', 'Load-Aware'),
  release(ago(0, 0, 55), OP.lan, 'veh-5', 'inc-2039', 'Đội từ chối: xe đang kiểm tra hệ thống phanh'),
  assign(ago(0, 0, 54), OP.lan, 'veh-4', 'inc-2039', 'Load-Aware'),

  // inc-2035 — va chạm xe nâng Phân khu 4
  confirmAi(ago(0, 3, 15), OP.hanh, 'inc-2035', 2, '#Accident'),
  assign(ago(0, 3, 12), OP.hanh, 'veh-8', 'inc-2035', 'Nearest-Available'),

  // inc-2033 — cháy tủ điện, đã hoàn thành
  confirmAi(ago(1, 4, 20), OP.quan, 'inc-2033', 2, '#Fire'),
  assign(ago(1, 4, 18), OP.quan, 'veh-2', 'inc-2033', 'Nearest-Available'),
  closeIncident(ago(1, 3, 5), OP.quan, 'inc-2033'),

  // inc-2031 — ngã giàn giáo, Cấp 3 quá ngưỡng chờ ban đêm → leo thang
  overrideAi(ago(1, 18, 40), OP.phuc, 'inc-2031', 2, 3, 'Nạn nhân rơi từ độ cao 6m, nghi chấn thương cột sống'),
  assign(ago(1, 18, 38), OP.phuc, 'veh-9', 'inc-2031', 'Nearest-Available'),
  entry(ago(1, 18, 35), SYSTEM, 'incident_status_changed', inc('inc-2031'), 'inc-2031',
    'Cấp 3 chưa có đội nhận quá 2.5 phút (ca đêm). Gửi cảnh báo tới trưởng trạm trong bán kính, nhân đôi bán kính tìm xe.', {
      changes: status('Đã duyệt', 'Leo thang'),
    }),
  release(ago(1, 18, 34), OP.phuc, 'veh-9', 'inc-2031', 'Đội không phản hồi trong 120 giây'),
  assign(ago(1, 18, 33), OP.phuc, 'veh-5', 'inc-2031', 'Nearest-Available'),
  handover(ago(1, 17, 50), RS.dung, 'veh-5', 'inc-2031', 'Bệnh viện Lê Văn Thịnh'),
  closeIncident(ago(1, 17, 20), OP.phuc, 'inc-2031'),

  // inc-2030 — báo khống, hủy và chặn số 7 ngày
  reveal(ago(2, 2, 10), OP.lan, 'inc-2030', '090***217'),
  entry(ago(2, 2, 5), OP.lan, 'incident_cancelled_false_report', inc('inc-2030'), 'inc-2030', 'Hủy ca vì báo khống.', {
    changes: status('Chờ xác minh', 'Đã hủy'),
    reason: 'Ảnh gửi lên lấy từ Internet, không trùng hiện trường',
  }),
  entry(ago(2, 2, 5), OP.lan, 'number_blocked', { type: 'blocked_number', id: 'blk-2', label: '090***217' }, 'inc-2030',
    'Chặn số người báo 7 ngày.', { reason: 'Ảnh gửi lên lấy từ Internet, không trùng hiện trường' }),

  // inc-2027 — tràn hóa chất, nhiều xe
  confirmAi(ago(3, 6, 30), OP.tin, 'inc-2027', 3, '#Accident'),
  assign(ago(3, 6, 28), OP.tin, 'veh-6', 'inc-2027', 'Load-Aware'),
  assign(ago(3, 6, 27), OP.tin, 'veh-3', 'inc-2027', 'Load-Aware'),
  handover(ago(3, 5, 40), RS.binh, 'veh-3', 'inc-2027', 'Trạm Y tế Khu CNC'),
  closeIncident(ago(3, 4, 55), OP.tin, 'inc-2027'),

  // inc-2022 — AI chấm quá cao, Operator hạ cấp
  overrideAi(ago(4, 9, 12), OP.hanh, 'inc-2022', 3, 1, 'Khói từ máy phát điện dự phòng chạy thử, không có cháy'),
  assign(ago(4, 9, 10), OP.hanh, 'veh-2', 'inc-2022', 'Nearest-Available'),
  closeIncident(ago(4, 8, 30), OP.hanh, 'inc-2022'),

  // inc-2018 — kẹt tay máy dập
  reveal(ago(5, 3, 45), OP.quan, 'inc-2018', '090***206'),
  confirmAi(ago(5, 3, 44), OP.quan, 'inc-2018', 2, '#Accident'),
  assign(ago(5, 3, 42), OP.quan, 'veh-4', 'inc-2018', 'Nearest-Available'),
  handover(ago(5, 3, 5), RS.cam, 'veh-4', 'inc-2018', 'Bệnh viện Lê Văn Thịnh'),
  closeIncident(ago(5, 2, 40), OP.quan, 'inc-2018'),

  // inc-2012 — báo cháy giả, hủy và chặn số 30 ngày
  entry(ago(6, 1, 20), OP.tin, 'incident_cancelled_false_report', inc('inc-2012'), 'inc-2012', 'Hủy ca vì báo khống.', {
    changes: status('Chờ xác minh', 'Đã hủy'),
    reason: 'Báo cháy giả tại xưởng B3, đã xác minh không có sự cố',
  }),
  entry(ago(6, 1, 20), OP.tin, 'number_blocked', { type: 'blocked_number', id: 'blk-1', label: '090***202' }, 'inc-2012',
    'Chặn số người báo 30 ngày.', { reason: 'Báo cháy giả tại xưởng B3, đã xác minh không có sự cố' }),

  // inc-2010 — va chạm xe tải tại cổng
  confirmAi(ago(6, 22, 5), OP.phuc, 'inc-2010', 2, '#Accident'),
  assign(ago(6, 22, 3), OP.phuc, 'veh-8', 'inc-2010', 'Nearest-Available'),
  handover(ago(6, 21, 20), RS.hai, 'veh-8', 'inc-2010', 'Bệnh viện Quân Y 175'),
  closeIncident(ago(6, 20, 50), OP.phuc, 'inc-2010'),
];
