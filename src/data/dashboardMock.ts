import { ClipboardCheck, ListChecks, Map, Truck, Users } from 'lucide-react';
import type { DashboardNavGroup } from '../types/dashboard';

/** §26.2: màn Nghiệm thu theo tổ (link từ thông báo / Live Map kèm `?incident=`). */
export const COMPLETION_PATH = '/dashboard/command-center/completion';

// Sidebar của Operator (/dashboard). Back-office đã chuyển sang layout riêng /admin (components/admin/adminNav.ts).
export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    id: 'command-center',
    label: 'Command Center',
    items: [
      { label: 'Live Map', path: '/dashboard/command-center/live-map', icon: Map },
      { label: 'Incident Queue', path: '/dashboard/command-center/incidents', icon: ListChecks },
      { label: 'Nghiệm thu', path: COMPLETION_PATH, icon: ClipboardCheck },
      { label: 'Station Teams', path: '/dashboard/command-center/station-teams', icon: Users },
      { label: 'Đội xe', path: '/dashboard/command-center/vehicles', icon: Truck },
    ],
  },
];
