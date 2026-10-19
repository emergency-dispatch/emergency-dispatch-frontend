import { buildStationSeed, buildVehicleSeed } from '../../data/admin/fleetAdminSeed';
import { internalAccountSeed } from '../../data/admin/internalAccountSeed';
import type { AdminStation, AdminVehicle } from '../../types/adminFleet';
import type { AuditTrailEntry } from '../../types/auditTrail';
import type { InternalAccount } from '../../types/internalAccount';

// Kho dữ liệu mock trong bộ nhớ, dùng chung giữa các service Admin (xóa trạm phải đổi trạng thái xe,
// gán trưởng trạm phải đọc tài khoản…). Mất khi tải lại trang — giống "một phiên làm việc".
// Chỉ các file trong services/admin/ được import file này.
export const adminStore: {
  stations: AdminStation[];
  vehicles: AdminVehicle[];
  accounts: InternalAccount[];
  auditTrail: AuditTrailEntry[];
} = {
  stations: buildStationSeed(),
  vehicles: buildVehicleSeed(),
  accounts: structuredClone(internalAccountSeed),
  auditTrail: [],
};
