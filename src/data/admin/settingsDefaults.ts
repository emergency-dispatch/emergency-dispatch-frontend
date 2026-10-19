import {
  CREW_ACK_TIMEOUT_MS,
  ESCALATION_NIGHT_THRESHOLD_MS,
  ESCALATION_THRESHOLD_MS,
  LOAD_AWARE_WEIGHTS,
  MAX_SEARCH_RADIUS_KM,
  SEARCH_RADII_KM,
  VEHICLE_RECOVERY_MS,
} from '../dispatchConfig';
import type { DispatchSettings, EscalationSettings } from '../../services/admin/adminSettingsService';

// Giá trị mặc định = hằng số Command Center đang dùng (dispatchConfig.ts), đổi sang đơn vị hiển thị.
// Khung giờ đêm và hệ số ×2 hiện viết cứng trong utils/escalation.ts và utils/dispatch.ts.

export const DEFAULT_ESCALATION_SETTINGS: EscalationSettings = {
  dayThresholdMinutes: ESCALATION_THRESHOLD_MS / 60_000,
  nightThresholdMinutes: ESCALATION_NIGHT_THRESHOLD_MS / 60_000,
  nightStart: '22:00',
  nightEnd: '06:00',
  radiusMultiplier: 2,
  maxRadiusKm: MAX_SEARCH_RADIUS_KM,
};

export const DEFAULT_DISPATCH_SETTINGS: DispatchSettings = {
  weights: { ...LOAD_AWARE_WEIGHTS },
  radiusStepsKm: [...SEARCH_RADII_KM],
  crewAckTimeoutSeconds: CREW_ACK_TIMEOUT_MS / 1000,
  recoveryMinutes: VEHICLE_RECOVERY_MS / 60_000,
};
