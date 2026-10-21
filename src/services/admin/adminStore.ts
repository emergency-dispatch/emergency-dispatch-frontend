import { buildStationSeed } from '../../data/admin/fleetAdminSeed';
import { blockedNumberSeed, citizenSeed, type BlockedNumberRecord, type CitizenRecord } from '../../data/admin/citizenSeed';
import { auditTrailSeed } from '../../data/admin/auditTrailSeed';
import { internalAccountSeed } from '../../data/admin/internalAccountSeed';
import { DEFAULT_DISPATCH_SETTINGS, DEFAULT_ESCALATION_SETTINGS } from '../../data/admin/settingsDefaults';
import type { AdminStation } from '../../types/adminFleet';
import type { AuditTrailEntry } from '../../types/auditTrail';
import type { InternalAccount } from '../../types/internalAccount';
import type { DispatchSettings, EscalationSettings, SettingsRecord } from './adminSettingsService';

// Kho dữ liệu mock trong bộ nhớ, dùng chung giữa các service Admin (gán trưởng trạm phải đọc tài khoản…). Mất khi tải lại trang — giống "một phiên làm việc".
// Chỉ các file trong services/admin/ được import file này.
export const adminStore: {
  stations: AdminStation[];
  accounts: InternalAccount[];
  citizens: CitizenRecord[];
  blockedNumbers: BlockedNumberRecord[];
  auditTrail: AuditTrailEntry[];
  settings: { escalation: SettingsRecord<EscalationSettings>; dispatch: SettingsRecord<DispatchSettings> };
} = {
  stations: buildStationSeed(),
  accounts: structuredClone(internalAccountSeed),
  citizens: structuredClone(citizenSeed),
  blockedNumbers: structuredClone(blockedNumberSeed),
  auditTrail: structuredClone(auditTrailSeed),
  settings: {
    escalation: { values: structuredClone(DEFAULT_ESCALATION_SETTINGS), updatedAt: null, updatedByName: null },
    dispatch: { values: structuredClone(DEFAULT_DISPATCH_SETTINGS), updatedAt: null, updatedByName: null },
  },
};
