import {
  Ban,
  CircleDashed,
  Building2,
  LayoutDashboard,
  ScrollText,
  SlidersHorizontal,
  Siren,
  Truck,
  UserCog,
  Users,
} from 'lucide-react';
import type { DashboardNavGroup, DashboardNavItem } from '../../types/dashboard';

// Nhóm không có label (Tổng quan) hiển thị không có tiêu đề nhóm.
export const adminNavGroups: DashboardNavGroup[] = [
  {
    id: 'overview',
    label: '',
    items: [{ label: 'Tổng quan', path: '/admin/overview', icon: LayoutDashboard }],
  },
  {
    id: 'operations',
    label: 'Vận hành',
    items: [
      { label: 'Trạm cứu hộ', path: '/admin/stations', icon: Building2 },
      { label: 'Đội xe', path: '/admin/vehicles', icon: Truck },
    ],
  },
  {
    id: 'users',
    label: 'Người dùng',
    items: [
      { label: 'Tài khoản nội bộ', path: '/admin/accounts', icon: UserCog },
      { label: 'Tài khoản Citizen', path: '/admin/citizens', icon: Users },
      { label: 'Số bị chặn', path: '/admin/blocked-numbers', icon: Ban },
    ],
  },
  {
    id: 'settings',
    label: 'Cấu hình',
    items: [
      { label: 'Leo thang', path: '/admin/settings/escalation', icon: Siren },
      { label: 'Tham số điều phối', path: '/admin/settings/dispatch', icon: SlidersHorizontal },
      { label: 'Khu vực phục vụ', path: '/admin/settings/service-area', icon: CircleDashed },
    ],
  },
  {
    id: 'monitoring',
    label: 'Giám sát',
    items: [{ label: 'Audit Trail', path: '/admin/audit-trail', icon: ScrollText }],
  },
];

export function findAdminNavItem(pathname: string): DashboardNavItem | null {
  for (const group of adminNavGroups) {
    const item = group.items.find((i) => pathname === i.path || pathname.startsWith(`${i.path}/`));
    if (item) return item;
  }
  return null;
}
