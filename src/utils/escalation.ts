import type { EscalationSettingsDto } from '../services/liveMapService';

const toMinutesOfDay = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Ca đêm theo cấu hình leo thang của Admin (mặc định 22:00–06:00, có thể vắt qua nửa đêm). */
export function isNightShift(now: number, settings: EscalationSettingsDto): boolean {
  const date = new Date(now);
  const minutes = date.getHours() * 60 + date.getMinutes();
  const start = toMinutesOfDay(settings.nightStart);
  const end = toMinutesOfDay(settings.nightEnd);
  return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

export function escalationThresholdMinutes(now: number, settings: EscalationSettingsDto): number {
  return isNightShift(now, settings) ? settings.nightThresholdMinutes : settings.dayThresholdMinutes;
}
