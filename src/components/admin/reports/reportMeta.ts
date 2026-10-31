import { SEVERITY_LEVEL_META } from '../../../data/incidentMock';
import type { BackendSeverityLevel, CancellationReasonCode } from '../../../types/incident';
import i18n from '../../../i18n';

/** Mức độ có thể lọc (backend vẫn có Unclassified cho ca AI không phân loại được rồi bị hủy). */
export const REPORT_SEVERITIES: BackendSeverityLevel[] = ['Level3', 'Level2', 'Level1', 'Unclassified'];

const UNCLASSIFIED_BADGE = 'bg-slate-100 text-slate-600 border-slate-300';

export function severityMeta(severity: BackendSeverityLevel): { label: string; badgeClass: string } {
  const level = Number(severity.replace('Level', ''));
  return level === 1 || level === 2 || level === 3
    ? { label: i18n.t(`enums.severity.level${level}`), badgeClass: SEVERITY_LEVEL_META[level].badgeClass }
    : { label: i18n.t('admin.monitoring.incident.unclassified'), badgeClass: UNCLASSIFIED_BADGE };
}

export const cancellationLabel = (reason: CancellationReasonCode | null) =>
  reason ? i18n.t(`enums.cancellationReason.${reason}`, { defaultValue: reason }) : null;

/** 75.4 → "1 giờ 15 phút"; null → "—". */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '—';
  const total = Math.round(minutes);
  if (total < 60) return i18n.t('common.duration.minutes', { m: total });
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? i18n.t('common.duration.hoursMinutes', { h, m }) : i18n.t('common.duration.hours', { h });
}

const pad = (n: number) => String(n).padStart(2, '0');

/** dd/MM/yyyy HH:mm theo giờ địa phương. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
