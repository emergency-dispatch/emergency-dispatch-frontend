import { SEVERITY_LEVEL_META } from '../../../data/incidentMock';
import type { BackendSeverityLevel } from '../../../types/incident';
import type { EscalationSeverity } from '../../../types/escalation';
import i18n from '../../../i18n';

const LEVEL_NUMBER: Record<EscalationSeverity, 1 | 2 | 3> = { Level1: 1, Level2: 2, Level3: 3 };

/** Nhãn + màu cấp độ, dùng lại thang Cấp 1–3 của Operator (nhãn dịch theo enums.severity.*). */
export const escalationSeverityMeta = (level: EscalationSeverity) => {
  const n = LEVEL_NUMBER[level];
  return { label: i18n.t(`enums.severity.level${n}`), badgeClass: SEVERITY_LEVEL_META[n].badgeClass };
};

/** Nhãn ngắn của cấp sự cố trong nhật ký (backend có thể còn dữ liệu Unclassified/Level4–5 cũ). */
export function severityLabel(level: BackendSeverityLevel): string {
  if (level === 'Unclassified') return i18n.t('admin.monitoring.incident.unclassified');
  const n = Number(level.replace('Level', ''));
  return i18n.t('admin.monitoring.incident.levelShort', { level: Math.min(n, 3) });
}

// Vai trò nhận cảnh báo / trạng thái sự cố: admin.settings.escalation.notifyRole.* / admin.monitoring.incident.status.*
