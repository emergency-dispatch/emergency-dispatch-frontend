import type { EscalationRule } from '../types/escalation';

export const escalationRulesSeed: EscalationRule[] = [
  {
    id: 'esc-1',
    name: 'Leo thang khẩn cấp Cấp 4-5',
    minSeverity: 4,
    waitMinutes: 5,
    notifyRoles: ['station_manager', 'admin'],
    enabled: true,
  },
  {
    id: 'esc-2',
    name: 'Cảnh báo sự cố Cấp 3 kéo dài',
    minSeverity: 3,
    waitMinutes: 15,
    notifyRoles: ['dispatcher', 'station_manager'],
    enabled: true,
  },
  {
    id: 'esc-3',
    name: 'Báo động toàn hệ thống Cấp 5',
    minSeverity: 5,
    waitMinutes: 3,
    notifyRoles: ['admin'],
    enabled: false,
  },
];
