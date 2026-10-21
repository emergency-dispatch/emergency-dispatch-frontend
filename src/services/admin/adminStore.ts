import { blockedNumberSeed, type BlockedNumberRecord } from '../../data/admin/blockedNumberSeed';
import { auditTrailSeed } from '../../data/admin/auditTrailSeed';
import { DEFAULT_DISPATCH_SETTINGS } from '../../data/admin/settingsDefaults';
import type { AuditTrailEntry } from '../../types/auditTrail';
import type { DispatchSettings, SettingsRecord } from './adminSettingsService';

// Kho dữ liệu mock trong bộ nhớ cho các màn Admin chưa có API (Số bị chặn, Audit Trail, Tham số điều phối).
// Mất khi tải lại trang — giống "một phiên làm việc".
// Chỉ các file trong services/admin/ được import file này.
export const adminStore: {
  blockedNumbers: BlockedNumberRecord[];
  auditTrail: AuditTrailEntry[];
  settings: { dispatch: SettingsRecord<DispatchSettings> };
} = {
  blockedNumbers: structuredClone(blockedNumberSeed),
  auditTrail: structuredClone(auditTrailSeed),
  settings: {
    dispatch: { values: structuredClone(DEFAULT_DISPATCH_SETTINGS), updatedAt: null, updatedByName: null },
  },
};
