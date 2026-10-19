import { ListChecks, Map } from 'lucide-react';
import type { DashboardNavGroup } from '../types/dashboard';

// Sidebar của Operator (/dashboard). Back-office đã chuyển sang layout riêng /admin (components/admin/adminNav.ts).
export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    id: 'command-center',
    label: 'Command Center',
    items: [
      { label: 'Live Map', path: '/dashboard/command-center/live-map', icon: Map },
      { label: 'Incident Queue', path: '/dashboard/command-center/incidents', icon: ListChecks },
    ],
  },
];
