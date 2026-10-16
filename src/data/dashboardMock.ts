import { Building2, ListChecks, Map, Settings2, Truck, Users } from 'lucide-react';
import type { DashboardNavGroup } from '../types/dashboard';

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    id: 'command-center',
    label: 'Command Center',
    items: [
      { label: 'Live Map', path: '/dashboard/command-center/live-map', icon: Map },
      { label: 'Incident Queue', path: '/dashboard/command-center/incidents', icon: ListChecks },
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
