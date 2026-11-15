import {
  AUTO_DISPATCH_DEFAULTS,
  type DispatchSettings,
  type EscalationSettings,
} from '../../../services/admin/adminSettingsService';

// Form giữ giá trị dạng chuỗi (để gõ dở không bị nhảy), đổi sang số khi validate / lưu.
// Ô trống → NaN → validator báo "Phải lớn hơn 0".
export const toNumber = (s: string) => (s.trim() === '' ? NaN : Number(s));

export interface DispatchDraft {
  distance: string;
  stationLoad: string;
  activeMissions: string;
  radiusStepsKm: string[];
  recoveryMinutes: string;
  autoExpireHours: string;
  autoDispatchEnabled: boolean;
  /** Ngưỡng tin cậy theo % (backend lưu 0.5–1) cho Admin dễ đọc. */
  autoDispatchMinConfidencePercent: string;
  autoDispatchDuplicateRadiusMeters: string;
  autoDispatchDuplicateWindowMinutes: string;
}

// Làm tròn để 0.9 ↔ 90% không sinh số lẻ dấu phẩy động (0.9 * 100 = 90.00000000000001).
const round = (n: number, digits: number) => (Number.isFinite(n) ? Number(n.toFixed(digits)) : n);

export const dispatchToDraft = (s: DispatchSettings): DispatchDraft => ({
  distance: String(s.weights.distance),
  stationLoad: String(s.weights.stationLoad),
  activeMissions: String(s.weights.activeMissions),
  radiusStepsKm: s.radiusStepsKm.map(String),
  recoveryMinutes: String(s.recoveryMinutes),
  autoExpireHours: String(s.autoExpireHours),
  // Backend cũ chưa có các trường này → dùng mặc định của DispatchSettingsDto.
  autoDispatchEnabled: s.autoDispatchEnabled ?? AUTO_DISPATCH_DEFAULTS.autoDispatchEnabled,
  autoDispatchMinConfidencePercent: String(
    round((s.autoDispatchMinConfidence ?? AUTO_DISPATCH_DEFAULTS.autoDispatchMinConfidence) * 100, 2)
  ),
  autoDispatchDuplicateRadiusMeters: String(
    s.autoDispatchDuplicateRadiusMeters ?? AUTO_DISPATCH_DEFAULTS.autoDispatchDuplicateRadiusMeters
  ),
  autoDispatchDuplicateWindowMinutes: String(
    s.autoDispatchDuplicateWindowMinutes ?? AUTO_DISPATCH_DEFAULTS.autoDispatchDuplicateWindowMinutes
  ),
});

export const draftToDispatch = (d: DispatchDraft): DispatchSettings => ({
  weights: {
    distance: toNumber(d.distance),
    stationLoad: toNumber(d.stationLoad),
    activeMissions: toNumber(d.activeMissions),
  },
  radiusStepsKm: d.radiusStepsKm.map(toNumber),
  recoveryMinutes: toNumber(d.recoveryMinutes),
  autoExpireHours: toNumber(d.autoExpireHours),
  // PUT ghi đè cả object: thiếu các trường này thì backend tắt tự điều phối và đặt lại ngưỡng.
  autoDispatchEnabled: d.autoDispatchEnabled,
  autoDispatchMinConfidence: round(toNumber(d.autoDispatchMinConfidencePercent) / 100, 4),
  autoDispatchDuplicateRadiusMeters: toNumber(d.autoDispatchDuplicateRadiusMeters),
  autoDispatchDuplicateWindowMinutes: toNumber(d.autoDispatchDuplicateWindowMinutes),
});

export interface EscalationDraft {
  dayThresholdMinutes: string;
  nightThresholdMinutes: string;
  nightStart: string;
  nightEnd: string;
  radiusMultiplier: string;
  maxRadiusKm: string;
  fieldRequestThresholdMinutes: string;
}

export const escalationToDraft = (s: EscalationSettings): EscalationDraft => ({
  dayThresholdMinutes: String(s.dayThresholdMinutes),
  nightThresholdMinutes: String(s.nightThresholdMinutes),
  nightStart: s.nightStart,
  nightEnd: s.nightEnd,
  radiusMultiplier: String(s.radiusMultiplier),
  maxRadiusKm: String(s.maxRadiusKm),
  fieldRequestThresholdMinutes: String(s.fieldRequestThresholdMinutes),
});

export const draftToEscalation = (d: EscalationDraft): EscalationSettings => ({
  dayThresholdMinutes: toNumber(d.dayThresholdMinutes),
  nightThresholdMinutes: toNumber(d.nightThresholdMinutes),
  nightStart: d.nightStart,
  nightEnd: d.nightEnd,
  radiusMultiplier: toNumber(d.radiusMultiplier),
  maxRadiusKm: toNumber(d.maxRadiusKm),
  fieldRequestThresholdMinutes: toNumber(d.fieldRequestThresholdMinutes),
});

/** So sánh giá trị đã đổi sang số (VD "5" và "5.0" coi là như nhau). */
export const sameSettings = <T,>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);
