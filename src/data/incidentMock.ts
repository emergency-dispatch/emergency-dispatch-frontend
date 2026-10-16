import {
  AlertTriangle,
  Building2,
  CarFront,
  Droplet,
  Flame,
  HeartPulse,
  ShieldAlert,
  TrafficCone,
  WavesHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  BlockDuration,
  HazardTag,
  HazardTagKey,
  IncidentCategory,
  IncidentSeverity,
  SeverityLevel,
} from '../types/incident';

export const HAZARD_TAG_META: Record<HazardTag, { label: string; color: string; icon: LucideIcon }> = {
  fire: { label: '#Fire', color: '#DC2626', icon: Flame },
  accident: { label: '#Accident', color: '#F97316', icon: CarFront },
  traffic_jam: { label: '#Traffic_Jam', color: '#2563EB', icon: TrafficCone },
};

// Fallback for hazard tags the AI returns that aren't in the known set above
// (backend hazard tags are free-form strings, e.g. "heavy_smoke", "NeedsHumanReview").
export const UNKNOWN_HAZARD_TAG_META = { label: 'Khác', color: '#64748B', icon: AlertTriangle };

export const INCIDENT_CATEGORY_META: Record<IncidentCategory, { label: string; color: string; icon: LucideIcon }> = {
  fire: { label: 'Cháy nổ', color: '#DC2626', icon: Flame },
  accident: { label: 'Tai nạn', color: '#F97316', icon: CarFront },
};

// Cấp 1 xanh lục · Cấp 2 hổ phách · Cấp 3 đỏ thẫm (NFR khả dụng).
export const SEVERITY_LEVEL_META: Record<SeverityLevel, { label: string; badgeClass: string }> = {
  1: { label: 'Cấp 1 · Nhẹ', badgeClass: 'bg-severity-1-bg text-severity-1-text border-severity-1-border' },
  2: { label: 'Cấp 2 · Trung bình', badgeClass: 'bg-severity-2-bg text-severity-2-text border-severity-2-border' },
  3: { label: 'Cấp 3 · Nghiêm trọng', badgeClass: 'bg-severity-4-bg text-severity-4-text border-severity-4-border' },
};

// Raw hex per level, for contexts that need an inline style value rather
// than a Tailwind class (e.g. Leaflet divIcon HTML strings).
export const SEVERITY_LEVEL_COLOR: Record<SeverityLevel, string> = {
  1: '#10B981',
  2: '#F59E0B',
  3: '#B91C1C',
};

// Dưới ngưỡng này (%), sự cố được gắn cảnh báo "Độ tin cậy thấp" để Operator xem kỹ media.
export const LOW_CONFIDENCE_THRESHOLD = 50;

// Khóa mềm khi Operator mở ca (FR-OP-02).
export const SOFT_LOCK_DURATION_MS = 2 * 60 * 1000;

// Ghi đè cấp độ AI bắt buộc lý do tối thiểu (FR-OP-03, lưu IncidentAuditTrail).
export const OVERRIDE_REASON_MIN_LENGTH = 5;

export const BLOCK_DURATION_OPTIONS: Array<{ value: BlockDuration; label: string }> = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '1y', label: '1 năm' },
  { value: 'permanent', label: 'Vĩnh viễn' },
];

// ---------------------------------------------------------------------------
// Legacy thang 0–5 — vẫn được Staff portal & Admin (escalation) dùng. Operator không dùng.
// ---------------------------------------------------------------------------

export const SEVERITY_META: Record<IncidentSeverity, { label: string; badgeClass: string }> = {
  0: { label: 'Chưa phân loại', badgeClass: 'bg-slate-100 text-slate-500 border-slate-300' },
  1: { label: 'Cấp 1 · Thấp', badgeClass: 'bg-severity-1-bg text-severity-1-text border-severity-1-border' },
  2: { label: 'Cấp 2 · Trung bình', badgeClass: 'bg-severity-2-bg text-severity-2-text border-severity-2-border' },
  3: { label: 'Cấp 3 · Cao', badgeClass: 'bg-severity-3-bg text-severity-3-text border-severity-3-border' },
  4: { label: 'Cấp 4 · Nghiêm trọng', badgeClass: 'bg-severity-4-bg text-severity-4-text border-severity-4-border' },
  5: { label: 'Cấp 5 · Nguy kịch', badgeClass: 'bg-severity-5-bg text-severity-5-text border-severity-5-border' },
};

// Tag cũ mà dữ liệu Staff portal vẫn dùng — HazardTagBadge tra ở đây khi tag không thuộc bộ mới.
export const LEGACY_HAZARD_TAG_META: Record<HazardTagKey, { label: string; color: string; icon: LucideIcon }> = {
  fire: { label: '#Fire', color: '#DC2626', icon: Flame },
  oil_spill: { label: '#Oil_Spill', color: '#EAB308', icon: Droplet },
  vehicle_rollover: { label: '#Vehicle_Rollover', color: '#F97316', icon: CarFront },
  injury: { label: '#Injury', color: '#EC4899', icon: HeartPulse },
  structural_collapse: { label: '#Structural_Collapse', color: '#64748B', icon: Building2 },
  flooding: { label: '#Flooding', color: '#06B6D4', icon: WavesHorizontal },
  security_threat: { label: '#Security_Threat', color: '#8B5CF6', icon: ShieldAlert },
};

export const SEVERITY_COLOR: Record<IncidentSeverity, string> = {
  0: '#64748B',
  1: '#10B981',
  2: '#F59E0B',
  3: '#F97316',
  4: '#DC2626',
  5: '#8B5CF6',
};
