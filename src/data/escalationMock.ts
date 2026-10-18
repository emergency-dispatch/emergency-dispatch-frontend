import type { EscalationRule } from '../types/escalation';

export const escalationRulesSeed: EscalationRule[] = [
  {
    id: 'esc-1',
    name: 'Leo thang khẩn cấp Cấp 3 (Cháy lớn / Tai nạn nghiêm trọng KCN)',
    minSeverity: 3,
    waitMinutes: 5,
    notifyRoles: ['station_manager', 'admin'],
    enabled: true,
  },
  {
    id: 'esc-2',
    name: 'Cảnh báo sự cố Cấp 0 nghi vấn tồn đọng hàng đợi',
    minSeverity: 0,
    waitMinutes: 5,
    notifyRoles: ['dispatcher', 'station_manager'],
    enabled: true,
  },
  {
    id: 'esc-3',
    name: 'Cảnh báo tê liệt giao thông cổng an ninh (#Traffic_Jam)',
    minSeverity: 2,
    waitMinutes: 10,
    notifyRoles: ['dispatcher', 'station_manager', 'admin'],
    enabled: true,
  },
];
