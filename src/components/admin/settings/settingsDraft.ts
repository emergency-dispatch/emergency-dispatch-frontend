import type { DispatchSettings, EscalationSettings } from '../../../services/admin/adminSettingsService';

// Form giữ giá trị dạng chuỗi (để gõ dở không bị nhảy), đổi sang số khi validate / lưu.
// Ô trống → NaN → validator báo "Phải lớn hơn 0".
export const toNumber = (s: string) => (s.trim() === '' ? NaN : Number(s));

export interface DispatchDraft {
  distance: string;
  stationLoad: string;
  activeMissions: string;
  radiusStepsKm: string[];
  recoveryMinutes: string;
}

export const dispatchToDraft = (s: DispatchSettings): DispatchDraft => ({
  distance: String(s.weights.distance),
  stationLoad: String(s.weights.stationLoad),
  activeMissions: String(s.weights.activeMissions),
  radiusStepsKm: s.radiusStepsKm.map(String),
  recoveryMinutes: String(s.recoveryMinutes),
});

export const draftToDispatch = (d: DispatchDraft): DispatchSettings => ({
  weights: {
    distance: toNumber(d.distance),
    stationLoad: toNumber(d.stationLoad),
    activeMissions: toNumber(d.activeMissions),
  },
  radiusStepsKm: d.radiusStepsKm.map(toNumber),
  recoveryMinutes: toNumber(d.recoveryMinutes),
});

export interface EscalationDraft {
  dayThresholdMinutes: string;
  nightThresholdMinutes: string;
  nightStart: string;
  nightEnd: string;
  radiusMultiplier: string;
  maxRadiusKm: string;
}

export const escalationToDraft = (s: EscalationSettings): EscalationDraft => ({
  dayThresholdMinutes: String(s.dayThresholdMinutes),
  nightThresholdMinutes: String(s.nightThresholdMinutes),
  nightStart: s.nightStart,
  nightEnd: s.nightEnd,
  radiusMultiplier: String(s.radiusMultiplier),
  maxRadiusKm: String(s.maxRadiusKm),
});

export const draftToEscalation = (d: EscalationDraft): EscalationSettings => ({
  dayThresholdMinutes: toNumber(d.dayThresholdMinutes),
  nightThresholdMinutes: toNumber(d.nightThresholdMinutes),
  nightStart: d.nightStart,
  nightEnd: d.nightEnd,
  radiusMultiplier: toNumber(d.radiusMultiplier),
  maxRadiusKm: toNumber(d.maxRadiusKm),
});

/** So sánh giá trị đã đổi sang số (VD "5" và "5.0" coi là như nhau). */
export const sameSettings = <T,>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);
