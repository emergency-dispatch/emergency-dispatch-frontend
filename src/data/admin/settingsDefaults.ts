import {
  CREW_ACK_TIMEOUT_MS,
  LOAD_AWARE_WEIGHTS,
  SEARCH_RADII_KM,
  VEHICLE_RECOVERY_MS,
} from '../dispatchConfig';
import type { DispatchSettings } from '../../services/admin/adminSettingsService';

// Giá trị mặc định = hằng số Command Center đang dùng (dispatchConfig.ts), đổi sang đơn vị hiển thị.

export const DEFAULT_DISPATCH_SETTINGS: DispatchSettings = {
  weights: { ...LOAD_AWARE_WEIGHTS },
  radiusStepsKm: [...SEARCH_RADII_KM],
  crewAckTimeoutSeconds: CREW_ACK_TIMEOUT_MS / 1000,
  recoveryMinutes: VEHICLE_RECOVERY_MS / 60_000,
};
