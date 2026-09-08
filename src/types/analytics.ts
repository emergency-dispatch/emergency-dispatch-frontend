import type { HazardTagKey } from './incident';

export type TimeRange = 'day' | 'week' | 'month';

export interface IncidentTrendPoint {
  label: string;
  count: number;
}

export interface IncidentTypeStat {
  type: HazardTagKey;
  label: string;
  count: number;
  color: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface AnalyticsKpis {
  avgResponseMinutes: number;
  successRate: number;
  totalIncidentsToday: number;
  totalIncidentsPeriod: number;
}

export interface AnalyticsSnapshot {
  kpis: AnalyticsKpis;
  trend: IncidentTrendPoint[];
  byType: IncidentTypeStat[];
  heatmap: HeatmapPoint[];
}
