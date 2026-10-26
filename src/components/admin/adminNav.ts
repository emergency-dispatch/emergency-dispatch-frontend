import type { ComponentType } from 'react';
import {
  Ban,
  CircleDashed,
  FileBarChart,
  Building2,
  LayoutDashboard,
  ScrollText,
  SlidersHorizontal,
  Siren,
  Truck,
  UserCog,
  Users,
} from 'lucide-react';
import type { adminLayoutVi } from '../../i18n/locales/vi/admin/layout';

// Nhãn dịch theo key: admin.layout.groups.* / admin.layout.nav.*
export interface AdminNavItem {
  key: keyof typeof adminLayoutVi.nav;
  path: string;
  icon: ComponentType<{ className?: string }>;
}

export interface AdminNavGroup {
  /** Không có → nhóm hiển thị không có tiêu đề (Tổng quan). */
  key?: keyof typeof adminLayoutVi.groups;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    items: [{ key: 'overview', path: '/admin/overview', icon: LayoutDashboard }],
  },
  {
    key: 'operations',
    items: [
      { key: 'stations', path: '/admin/stations', icon: Building2 },
      { key: 'vehicles', path: '/admin/vehicles', icon: Truck },
    ],
  },
  {
    key: 'users',
    items: [
      { key: 'accounts', path: '/admin/accounts', icon: UserCog },
      { key: 'citizens', path: '/admin/citizens', icon: Users },
      { key: 'blockedNumbers', path: '/admin/blocked-numbers', icon: Ban },
    ],
  },
  {
    key: 'settings',
    items: [
      { key: 'escalation', path: '/admin/settings/escalation', icon: Siren },
      { key: 'dispatch', path: '/admin/settings/dispatch', icon: SlidersHorizontal },
      { key: 'serviceArea', path: '/admin/settings/service-area', icon: CircleDashed },
    ],
  },
  {
    key: 'monitoring',
    items: [
      { key: 'reports', path: '/admin/reports', icon: FileBarChart },
      { key: 'auditTrail', path: '/admin/audit-trail', icon: ScrollText },
    ],
  },
];

export function findAdminNavItem(pathname: string): AdminNavItem | null {
  for (const group of adminNavGroups) {
    const item = group.items.find((i) => pathname === i.path || pathname.startsWith(`${i.path}/`));
    if (item) return item;
  }
  return null;
}
