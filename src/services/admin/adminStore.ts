import { blockedNumberSeed, citizenSeed, type BlockedNumberRecord, type CitizenRecord } from '../../data/admin/citizenSeed';
import { auditTrailSeed } from '../../data/admin/auditTrailSeed';
import { DEFAULT_DISPATCH_SETTINGS, DEFAULT_ESCALATION_SETTINGS } from '../../data/admin/settingsDefaults';
import type { AuditTrailEntry } from '../../types/auditTrail';
import type { DispatchSettings, EscalationSettings, SettingsRecord } from './adminSettingsService';

// Kho dữ liệu mock trong bộ nhớ cho các màn Admin chưa có API (Citizen, Số bị chặn, Audit Trail, Cấu hình).
// Mất khi tải lại trang — giống "một phiên làm việc".
// Chỉ các file trong services/admin/ được import file này.
export const adminStore: {
  citizens: CitizenRecord[];
  blockedNumbers: BlockedNumberRecord[];
  auditTrail: AuditTrailEntry[];
  settings: { escalation: SettingsRecord<EscalationSettings>; dispatch: SettingsRecord<DispatchSettings> };
} = {
  citizens: structuredClone(citizenSeed),
  blockedNumbers: structuredClone(blockedNumberSeed),
  auditTrail: structuredClone(auditTrailSeed),
  settings: {
    escalation: { values: structuredClone(DEFAULT_ESCALATION_SETTINGS), updatedAt: null, updatedByName: null },
    dispatch: { values: structuredClone(DEFAULT_DISPATCH_SETTINGS), updatedAt: null, updatedByName: null },
  },
};
