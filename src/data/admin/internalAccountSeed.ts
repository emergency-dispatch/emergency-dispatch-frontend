import { UserRole } from '../../types/auth';
import type { InternalAccount } from '../../types/internalAccount';

// rs-1 … rs-10 là tài xế của veh-1 … veh-10 trên Live Map (cùng tên với `driver` trong liveMapMock).
export const internalAccountSeed: InternalAccount[] = [
  { id: 'op-1', fullName: 'Phạm Trung Tín', email: 'tin.pham@resq-ai.vn', phoneNumber: '0981234561', role: UserRole.Operator, isLocked: false },
  { id: 'op-2', fullName: 'Vũ Thị Lan', email: 'lan.vu@resq-ai.vn', phoneNumber: '0981234562', role: UserRole.Operator, isLocked: false },
  { id: 'op-3', fullName: 'Trần Thị Hạnh', email: 'hanh.tran@resq-ai.vn', phoneNumber: '0981234563', role: UserRole.Operator, isLocked: false },
  { id: 'op-4', fullName: 'Đỗ Minh Quân', email: 'quan.do@resq-ai.vn', phoneNumber: '0981234564', role: UserRole.Operator, isLocked: false },
  { id: 'op-5', fullName: 'Nguyễn Hoàng Phúc', email: 'phuc.nguyen@resq-ai.vn', phoneNumber: '0981234565', role: UserRole.Operator, isLocked: false },

  { id: 'rs-1', fullName: 'Nguyễn Văn An', email: 'an.nguyen@resq-ai.vn', phoneNumber: '0912345601', role: UserRole.RescueStaff, isLocked: false },
  { id: 'rs-2', fullName: 'Trần Văn Bình', email: 'binh.tran@resq-ai.vn', phoneNumber: '0912345602', role: UserRole.RescueStaff, isLocked: false },
  { id: 'rs-3', fullName: 'Lê Hoàng Cường', email: 'cuong.le@resq-ai.vn', phoneNumber: '0912345603', role: UserRole.RescueStaff, isLocked: false },
  { id: 'rs-4', fullName: 'Lê Thị Cẩm', email: 'cam.le@resq-ai.vn', phoneNumber: '0912345604', role: UserRole.RescueStaff, isLocked: false },
  { id: 'rs-5', fullName: 'Phạm Thị Dung', email: 'dung.pham@resq-ai.vn', phoneNumber: '0912345605', role: UserRole.RescueStaff, isLocked: false },
  { id: 'rs-6', fullName: 'Hoàng Văn Em', email: 'em.hoang@resq-ai.vn', phoneNumber: '0912345606', role: UserRole.RescueStaff, isLocked: false },
  { id: 'rs-7', fullName: 'Vũ Thị Giang', email: 'giang.vu@resq-ai.vn', phoneNumber: '0912345607', role: UserRole.RescueStaff, isLocked: false },
  { id: 'rs-8', fullName: 'Đặng Văn Hải', email: 'hai.dang@resq-ai.vn', phoneNumber: '0912345608', role: UserRole.RescueStaff, isLocked: false },
  { id: 'rs-9', fullName: 'Bùi Thị Kim', email: 'kim.bui@resq-ai.vn', phoneNumber: '0912345609', role: UserRole.RescueStaff, isLocked: false },
  { id: 'rs-10', fullName: 'Đinh Văn Long', email: 'long.dinh@resq-ai.vn', phoneNumber: '0912345610', role: UserRole.RescueStaff, isLocked: false },
  { id: 'rs-11', fullName: 'Mai Văn Minh', email: 'minh.mai@resq-ai.vn', phoneNumber: '0912345611', role: UserRole.RescueStaff, isLocked: false },
  { id: 'rs-12', fullName: 'Tạ Thị Ngọc', email: 'ngoc.ta@resq-ai.vn', phoneNumber: '0912345612', role: UserRole.RescueStaff, isLocked: false },
];
