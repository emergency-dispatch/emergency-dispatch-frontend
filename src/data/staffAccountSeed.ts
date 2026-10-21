import { UserRole } from '../../types/auth';
import type { InternalAccount } from '../../types/internalAccount';

const minutesFromNow = (m: number) => new Date(Date.now() + m * 60 * 1000).toISOString();

// Demo: op-2 đang bị khóa tạm do sai mật khẩu 5 lần, rs-12 bị Admin khóa.
// rs-1 … rs-10 là tài xế của veh-1 … veh-10 trên Live Map (cùng tên với `driver` trong liveMapMock).
export const internalAccountSeed: InternalAccount[] = [
  { id: 'op-1', fullName: 'Phạm Trung Tín', email: 'tin.pham@resq-ai.vn', phoneNumber: '0981234561', role: UserRole.Operator, lock: { kind: 'none' } },
  { id: 'op-2', fullName: 'Vũ Thị Lan', email: 'lan.vu@resq-ai.vn', phoneNumber: '0981234562', role: UserRole.Operator, lock: { kind: 'failed_login', until: minutesFromNow(9) } },
  { id: 'op-3', fullName: 'Trần Thị Hạnh', email: 'hanh.tran@resq-ai.vn', phoneNumber: '0981234563', role: UserRole.Operator, lock: { kind: 'none' } },
  { id: 'op-4', fullName: 'Đỗ Minh Quân', email: 'quan.do@resq-ai.vn', phoneNumber: '0981234564', role: UserRole.Operator, lock: { kind: 'none' } },
  { id: 'op-5', fullName: 'Nguyễn Hoàng Phúc', email: 'phuc.nguyen@resq-ai.vn', phoneNumber: '0981234565', role: UserRole.Operator, lock: { kind: 'none' } },

  { id: 'rs-1', fullName: 'Nguyễn Văn An', email: 'an.nguyen@resq-ai.vn', phoneNumber: '0912345601', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-2', fullName: 'Trần Văn Bình', email: 'binh.tran@resq-ai.vn', phoneNumber: '0912345602', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-3', fullName: 'Lê Hoàng Cường', email: 'cuong.le@resq-ai.vn', phoneNumber: '0912345603', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-4', fullName: 'Lê Thị Cẩm', email: 'cam.le@resq-ai.vn', phoneNumber: '0912345604', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-5', fullName: 'Phạm Thị Dung', email: 'dung.pham@resq-ai.vn', phoneNumber: '0912345605', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-6', fullName: 'Hoàng Văn Em', email: 'em.hoang@resq-ai.vn', phoneNumber: '0912345606', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-7', fullName: 'Vũ Thị Giang', email: 'giang.vu@resq-ai.vn', phoneNumber: '0912345607', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-8', fullName: 'Đặng Văn Hải', email: 'hai.dang@resq-ai.vn', phoneNumber: '0912345608', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-9', fullName: 'Bùi Thị Kim', email: 'kim.bui@resq-ai.vn', phoneNumber: '0912345609', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-10', fullName: 'Đinh Văn Long', email: 'long.dinh@resq-ai.vn', phoneNumber: '0912345610', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-11', fullName: 'Mai Văn Minh', email: 'minh.mai@resq-ai.vn', phoneNumber: '0912345611', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-12', fullName: 'Tạ Thị Ngọc', email: 'ngoc.ta@resq-ai.vn', phoneNumber: '0912345612', role: UserRole.RescueStaff, lock: { kind: 'admin', reason: 'Tạm đình chỉ chờ xác minh vi phạm quy trình an toàn', lockedAt: minutesFromNow(-60 * 26), lockedByName: 'Quản trị viên' } },
  // rs-13 … rs-24: thành viên kíp trực (không phụ trách xe). Một số trùng tên đồng đội trong mock Staff.
  { id: 'rs-13', fullName: 'Lê Hoàng Long', email: 'long.le@resq-ai.vn', phoneNumber: '0912345613', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-14', fullName: 'Vũ Đức Nam', email: 'nam.vu@resq-ai.vn', phoneNumber: '0912345614', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-15', fullName: 'Nguyễn Văn Minh', email: 'minh.nguyen@resq-ai.vn', phoneNumber: '0912345615', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-16', fullName: 'Phạm Tuấn Kiệt', email: 'kiet.pham@resq-ai.vn', phoneNumber: '0912345616', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-17', fullName: 'Đặng Quốc Huy', email: 'huy.dang@resq-ai.vn', phoneNumber: '0912345617', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-18', fullName: 'Trương Thị Oanh', email: 'oanh.truong@resq-ai.vn', phoneNumber: '0912345618', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-19', fullName: 'Hồ Văn Phát', email: 'phat.ho@resq-ai.vn', phoneNumber: '0912345619', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-20', fullName: 'Lâm Thị Quyên', email: 'quyen.lam@resq-ai.vn', phoneNumber: '0912345620', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-21', fullName: 'Đoàn Văn Sơn', email: 'son.doan@resq-ai.vn', phoneNumber: '0912345621', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-22', fullName: 'Quách Thị Trinh', email: 'trinh.quach@resq-ai.vn', phoneNumber: '0912345622', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-23', fullName: 'Mai Xuân Vinh', email: 'vinh.mai@resq-ai.vn', phoneNumber: '0912345623', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-24', fullName: 'Âu Thị Yến', email: 'yen.au@resq-ai.vn', phoneNumber: '0912345624', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  // rs-25 … rs-28: nhân sự mới, chưa thuộc trạm nào — Trưởng trạm thêm vào trạm ở màn "Trạm & Tổ" của Operator.
  { id: 'rs-25', fullName: 'Cao Văn Thắng', email: 'thang.cao@resq-ai.vn', phoneNumber: '0912345625', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-26', fullName: 'Lý Thị Hồng', email: 'hong.ly@resq-ai.vn', phoneNumber: '0912345626', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-27', fullName: 'Phan Đức Toàn', email: 'toan.phan@resq-ai.vn', phoneNumber: '0912345627', role: UserRole.RescueStaff, lock: { kind: 'none' } },
  { id: 'rs-28', fullName: 'Nguyễn Thị Uyên', email: 'uyen.nguyen@resq-ai.vn', phoneNumber: '0912345628', role: UserRole.RescueStaff, lock: { kind: 'none' } },
];
