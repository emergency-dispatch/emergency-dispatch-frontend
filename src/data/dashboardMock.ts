import { BarChart3, Building2, ListChecks, Map, Settings2, Truck, Users } from 'lucide-react';
import type { DashboardNavGroup, DashboardNotification, DashboardUser } from '../types/dashboard';

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    id: 'command-center',
    label: 'Command Center',
    items: [
      { label: 'Live Map', path: '/dashboard/command-center/live-map', icon: Map },
      { label: 'Incident Queue', path: '/dashboard/command-center/incidents', icon: ListChecks },
      { label: 'Analytics', path: '/dashboard/command-center/analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'backoffice',
    label: 'Back-office',
    items: [
      { label: 'Stations', path: '/dashboard/backoffice/stations', icon: Building2 },
      { label: 'Vehicles & Equipment', path: '/dashboard/backoffice/vehicles', icon: Truck },
      { label: 'Accounts & Roles', path: '/dashboard/backoffice/accounts', icon: Users },
      { label: 'Escalation Config', path: '/dashboard/backoffice/escalation', icon: Settings2 },
    ],
  },
];

export const mockDashboardUser: DashboardUser = {
  name: 'Phạm Trung Tín',
  role: 'Dispatch Operator',
  avatarInitials: 'PT',
  status: 'online',
  station: 'Trạm PCCC Quận 1',
  area: 'Khu vực Trung tâm',
};

// Escalation Logic Engine: Level 4-5 incidents unclaimed past 5 minutes should alert the operator.
export const mockNotifications: DashboardNotification[] = [
  {
    id: 'inc-1042',
    title: 'Sự cố #1042 — Cấp 5 (Nguy kịch)',
    description: 'Cháy nhà kho, chưa có đội tiếp nhận',
    severity: 5,
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    unclaimedMinutes: 8,
    acknowledged: false,
  },
  {
    id: 'inc-1039',
    title: 'Sự cố #1039 — Cấp 4 (Nghiêm trọng)',
    description: 'Tai nạn giao thông nhiều xe, chưa có đội tiếp nhận',
    severity: 4,
    createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    unclaimedMinutes: 6,
    acknowledged: false,
  },
  {
    id: 'inc-1035',
    title: 'Sự cố #1035 — Cấp 2 (Trung bình)',
    description: 'Xe cứu thương đã tiếp nhận, đang di chuyển đến hiện trường',
    severity: 2,
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    unclaimedMinutes: 0,
    acknowledged: true,
  },
];
