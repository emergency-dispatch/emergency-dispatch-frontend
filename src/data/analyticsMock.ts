import { HAZARD_TAG_META } from './incidentMock';
import type { HazardTagKey } from '../types/incident';
import type { AnalyticsKpis, AnalyticsSnapshot, HeatmapPoint, IncidentTrendPoint, IncidentTypeStat, TimeRange } from '../types/analytics';

export const ANALYTICS_AREAS = ['Quận 1', 'Quận 3', 'Quận 5', 'Quận 7', 'Bình Thạnh'];

const HOTSPOT_CENTERS: Array<{ lat: number; lng: number; weight: number }> = [
  { lat: 10.7769, lng: 106.7009, weight: 1.0 },
  { lat: 10.7546, lng: 106.6633, weight: 0.8 },
  { lat: 10.8105, lng: 106.7091, weight: 0.6 },
  { lat: 10.7325, lng: 106.7217, weight: 0.5 },
  { lat: 10.7843, lng: 106.6907, weight: 0.4 },
];

function generateTrend(timeRange: TimeRange): IncidentTrendPoint[] {
  if (timeRange === 'day') {
    return Array.from({ length: 12 }, (_, i) => ({
      label: `${(i * 2).toString().padStart(2, '0')}h`,
      count: Math.floor(2 + Math.random() * 10),
    }));
  }

  if (timeRange === 'week') {
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    return days.map((label) => ({ label, count: Math.floor(10 + Math.random() * 40) }));
  }

  return Array.from({ length: 4 }, (_, i) => ({
    label: `Tuần ${i + 1}`,
    count: Math.floor(60 + Math.random() * 120),
  }));
}

function generateByType(): IncidentTypeStat[] {
  const keys = Object.keys(HAZARD_TAG_META) as HazardTagKey[];
  return keys
    .map((type) => ({
      type,
      label: HAZARD_TAG_META[type].label,
      color: HAZARD_TAG_META[type].color,
      count: Math.floor(5 + Math.random() * 45),
    }))
    .sort((a, b) => b.count - a.count);
}

function generateKpis(totalPeriod: number): AnalyticsKpis {
  return {
    avgResponseMinutes: Math.round((6 + Math.random() * 6) * 10) / 10,
    successRate: Math.round(85 + Math.random() * 12),
    totalIncidentsToday: Math.floor(8 + Math.random() * 20),
    totalIncidentsPeriod: totalPeriod,
  };
}

function generateHeatmapPoints(): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];
  HOTSPOT_CENTERS.forEach((center) => {
    const clusterSize = Math.floor(15 + center.weight * 25);
    for (let i = 0; i < clusterSize; i++) {
      points.push({
        lat: center.lat + (Math.random() - 0.5) * 0.02,
        lng: center.lng + (Math.random() - 0.5) * 0.02,
        intensity: center.weight * (0.5 + Math.random() * 0.5),
      });
    }
  });
  return points;
}

/**
 * Stands in for a backend aggregation endpoint. No backend yet, so this
 * generates a plausible mock snapshot per (timeRange, area) — deterministic
 * enough per call, cacheable by the caller (e.g. useMemo keyed on the filters).
 */
export function getAnalyticsSnapshot(timeRange: TimeRange, _area: string): AnalyticsSnapshot {
  const trend = generateTrend(timeRange);
  const totalPeriod = trend.reduce((sum, p) => sum + p.count, 0);

  return {
    kpis: generateKpis(totalPeriod),
    trend,
    byType: generateByType(),
    heatmap: generateHeatmapPoints(),
  };
}
