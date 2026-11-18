import type { ComponentType } from 'react';
import {
  Ban,
  CircleDashed,
  ClipboardCheck,
  Combine,
  FileBarChart,
  Building2,
  LayoutDashboard,
  ListTree,
  Package,
  ScrollText,
  Siren,
  Tags,
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
      { key: 'equipment', path: '/admin/equipment', icon: Package },
    ],
  },
  {
    // Danh mục loại xe / loại sự cố (§31–32).
    key: 'catalogs',
    items: [
      { key: 'unitTypes', path: '/admin/unit-types', icon: Tags },
      { key: 'incidentTypes', path: '/admin/incident-types', icon: ListTree },
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
      // Gồm cả tham số điều phối (đường dẫn cũ /admin/settings/dispatch chuyển về đây).
      { key: 'escalation', path: '/admin/settings/escalation', icon: Siren },
      { key: 'serviceArea', path: '/admin/settings/service-area', icon: CircleDashed },
      { key: 'duplicateDetection', path: '/admin/settings/duplicate-detection', icon: Combine },
    ],
  },
  {
    key: 'monitoring',
    items: [
      { key: 'reports', path: '/admin/reports', icon: FileBarChart },
      { key: 'completionReports', path: '/admin/completion-reports', icon: ClipboardCheck },
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
