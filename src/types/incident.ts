import type { IncidentSeverity } from './dashboard';

export type { IncidentSeverity };

export type HazardTagKey =
  | 'fire'
  | 'oil_spill'
  | 'vehicle_rollover'
  | 'injury'
  | 'structural_collapse'
  | 'flooding'
  | 'security_threat';

export type IncidentStatus = 'pending' | 'approved' | 'rejected';

export type IncidentMediaType = 'image' | 'video';

export interface Incident {
  id: string;
  title: string;
  description: string;
  hazardTags: HazardTagKey[];
  severity: IncidentSeverity;
  plausibilityScore: number;
  status: IncidentStatus;
  area: string;
  lat: number;
  lng: number;
  reporterName: string;
  reporterPhone: string;
  createdAt: string;
  mediaType: IncidentMediaType;
  mediaUrl: string | null;
  assignedVehicleId: string | null;
}
