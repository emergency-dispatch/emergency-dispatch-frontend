import i18n, { dateLocale } from '../i18n';

/** 0981234456 → 098***456 (FR-OP-03: che số điện thoại người báo). */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

/** Số giây còn lại → "1:45". */
export function formatCountdown(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Thời gian chờ dễ đọc thay cho "5024 phút trước":
 * 45 giây → "Vừa xong", 12 phút → "12 phút", 3 giờ 5 phút → "3 giờ 5 phút", 3 ngày 11 giờ → "3 ngày 11 giờ".
 */
export function formatWaitDuration(elapsedMs: number): string {
  const minutes = Math.max(0, Math.floor(elapsedMs / 60000));
  if (minutes < 1) return i18n.t('common.duration.justNow');
  if (minutes < 60) return i18n.t('common.duration.minutes', { m: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const restMinutes = minutes % 60;
    return restMinutes
      ? i18n.t('common.duration.hoursMinutes', { h: hours, m: restMinutes })
      : i18n.t('common.duration.hours', { h: hours });
  }

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours
    ? i18n.t('common.duration.daysHours', { d: days, h: restHours })
    : i18n.t('common.duration.days', { d: days });
}

/** Thời điểm tuyệt đối cho tooltip: "22/10/2026 23:41". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(dateLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
