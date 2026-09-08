import type { LucideIcon } from 'lucide-react';

export type IncidentSeverity = 1 | 2 | 3 | 4 | 5;

export interface DashboardNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface DashboardNavGroup {
  id: string;
  label: string;
  items: DashboardNavItem[];
}

export interface DashboardNotification {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  createdAt: string;
  unclaimedMinutes: number;
  acknowledged: boolean;
}

export interface DashboardUser {
  name: string;
  role: string;
  avatarInitials: string;
  status: 'online' | 'away' | 'offline';
  station: string;
  area: string;
}
