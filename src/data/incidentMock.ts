import { AlertTriangle, Building2, CarFront, Droplet, Flame, HeartPulse, ShieldAlert, WavesHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { HazardTagKey, IncidentSeverity } from '../types/incident';

export const HAZARD_TAG_META: Record<HazardTagKey, { label: string; color: string; icon: LucideIcon }> = {
  fire: { label: '#Fire', color: '#DC2626', icon: Flame },
  oil_spill: { label: '#Oil_Spill', color: '#EAB308', icon: Droplet },
  vehicle_rollover: { label: '#Vehicle_Rollover', color: '#F97316', icon: CarFront },
  injury: { label: '#Injury', color: '#EC4899', icon: HeartPulse },
  structural_collapse: { label: '#Structural_Collapse', color: '#64748B', icon: Building2 },
  flooding: { label: '#Flooding', color: '#06B6D4', icon: WavesHorizontal },
  security_threat: { label: '#Security_Threat', color: '#8B5CF6', icon: ShieldAlert },
};

// Fallback for hazard tags the AI returns that aren't in the known set above
// (backend hazard tags are free-form strings, e.g. "heavy_smoke", "NeedsHumanReview").
export const UNKNOWN_HAZARD_TAG_META = { label: 'Chưa phân loại', color: '#64748B', icon: AlertTriangle };

export const SEVERITY_META: Record<IncidentSeverity, { label: string; badgeClass: string }> = {
  0: { label: 'Chưa phân loại', badgeClass: 'bg-slate-100 text-slate-500 border-slate-300' },
  1: { label: 'Cấp 1 · Thấp', badgeClass: 'bg-severity-1-bg text-severity-1-text border-severity-1-border' },
  2: { label: 'Cấp 2 · Trung bình', badgeClass: 'bg-severity-2-bg text-severity-2-text border-severity-2-border' },
  3: { label: 'Cấp 3 · Cao', badgeClass: 'bg-severity-3-bg text-severity-3-text border-severity-3-border' },
  4: { label: 'Cấp 4 · Nghiêm trọng', badgeClass: 'bg-severity-4-bg text-severity-4-text border-severity-4-border' },
  5: { label: 'Cấp 5 · Nguy kịch', badgeClass: 'bg-severity-5-bg text-severity-5-text border-severity-5-border' },
};

// Raw hex per severity, for contexts that need an inline style value rather
// than a Tailwind class (e.g. Leaflet divIcon HTML strings).
export const SEVERITY_COLOR: Record<IncidentSeverity, string> = {
  0: '#64748B',
  1: '#10B981',
  2: '#F59E0B',
  3: '#F97316',
  4: '#DC2626',
  5: '#8B5CF6',
};
