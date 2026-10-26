import type { LucideIcon } from 'lucide-react';

// 0 = Unclassified (AI fallback/timeout, needs manual Operator review), 1-3 = standard levels
export type IncidentSeverity = 0 | 1 | 2 | 3;

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
