import { buildStationSeed, buildVehicleSeed } from '../../data/admin/fleetAdminSeed';
import { internalAccountSeed } from '../../data/admin/internalAccountSeed';
import { DEFAULT_DISPATCH_SETTINGS, DEFAULT_ESCALATION_SETTINGS } from '../../data/admin/settingsDefaults';
import type { AdminStation, AdminVehicle } from '../../types/adminFleet';
import type { AuditTrailEntry } from '../../types/auditTrail';
import type { InternalAccount } from '../../types/internalAccount';
import type { DispatchSettings, EscalationSettings, SettingsRecord } from './adminSettingsService';

// Kho dữ liệu mock trong bộ nhớ, dùng chung giữa các service Admin (xóa trạm phải đổi trạng thái xe,
// gán trưởng trạm phải đọc tài khoản…). Mất khi tải lại trang — giống "một phiên làm việc".
// Chỉ các file trong services/admin/ được import file này.
export const adminStore: {
  stations: AdminStation[];
  vehicles: AdminVehicle[];
  accounts: InternalAccount[];
  auditTrail: AuditTrailEntry[];
  settings: { escalation: SettingsRecord<EscalationSettings>; dispatch: SettingsRecord<DispatchSettings> };
} = {
  stations: buildStationSeed(),
  vehicles: buildVehicleSeed(),
  accounts: structuredClone(internalAccountSeed),
  auditTrail: [],
  settings: {
    escalation: { values: structuredClone(DEFAULT_ESCALATION_SETTINGS), updatedAt: null, updatedByName: null },
    dispatch: { values: structuredClone(DEFAULT_DISPATCH_SETTINGS), updatedAt: null, updatedByName: null },
  },
};
