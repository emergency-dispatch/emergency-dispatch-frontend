import type { IncidentSeverity } from './dashboard';

export type { IncidentSeverity };

// Known hazard tags with dedicated icon/color meta (data/incidentMock.ts).
// Backend AI returns free-form strings, so this is a display allowlist, not a full domain type.
export type HazardTagKey =
  | 'fire'
  | 'oil_spill'
  | 'vehicle_rollover'
  | 'injury'
  | 'structural_collapse'
  | 'flooding'
  | 'security_threat';

// Local queue lifecycle only ('approved'/'rejected' incidents are already gone from
// the backend queue by the time we set these — see DispatchContext.approveIncident/rejectIncident).
export type IncidentStatus = 'pending' | 'approved' | 'rejected';

export type IncidentMediaType = 'image' | 'video';

export interface Incident {
  id: string;
  title: string;
  description: string;
  hazardTags: string[];
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

// ---------------------------------------------------------------------------
// Backend API DTOs — mirror EmergencyDispatch.Application.DTOs.Incident / Ai
// (enums serialize as strings: Program.cs registers JsonStringEnumConverter)
// ---------------------------------------------------------------------------

export type BackendIncidentStatus =
  | 'Pending'
  | 'AiProcessing'
  | 'AiProcessed'
  | 'Verified'
  | 'Dispatched'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled'
  | 'Escalated';

export type BackendSeverityLevel = 'Unclassified' | 'Level1' | 'Level2' | 'Level3' | 'Level4' | 'Level5';

export interface IncidentMediaDto {
  id: string;
  mediaUrl: string;
  mediaType: 'Photo' | 'Video';
  fileSizeBytes?: number;
  mimeType?: string;
}

export interface AiClassificationResultDto {
  hazardTags: string[];
  severityScore: number;
  summary?: string;
  confidenceScore?: number;
  isSuccess: boolean;
  modelName?: string;
  rawResponse?: string;
  errorMessage?: string;
  processingDurationMs: number;
}

export interface IncidentResponseDto {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  locationAddress: string;
  status: BackendIncidentStatus;
  severity: BackendSeverityLevel;
  reportedByUserId?: string;
  reporterName?: string;
  reporterPhone?: string;
  verifiedByUserId?: string;
  verifiedByUserName?: string;
  verifiedAt?: string;
  operatorNotes?: string;
  createdAt: string;
  updatedAt?: string;
  mediaItems: IncidentMediaDto[];
  aiClassification?: AiClassificationResultDto | null;
}

export interface VerifyIncidentRequestDto {
  confirmedSeverity: BackendSeverityLevel;
  adjustedTitle?: string;
  operatorNotes?: string;
}

const SEVERITY_FROM_BACKEND: Record<BackendSeverityLevel, IncidentSeverity> = {
  Unclassified: 0,
  Level1: 1,
  Level2: 2,
  Level3: 3,
  Level4: 4,
  Level5: 5,
};

const SEVERITY_TO_BACKEND: Record<Exclude<IncidentSeverity, 0>, BackendSeverityLevel> = {
  1: 'Level1',
  2: 'Level2',
  3: 'Level3',
  4: 'Level4',
  5: 'Level5',
};

export function severityToBackend(severity: Exclude<IncidentSeverity, 0>): BackendSeverityLevel {
  return SEVERITY_TO_BACKEND[severity];
}

/**
 * Maps an incident straight out of GET /api/Incidents/queue to the UI's Incident
 * shape. Always status: 'pending' — that's the only thing the queue endpoint returns.
 */
export function mapIncidentResponseToIncident(dto: IncidentResponseDto): Incident {
  const firstMedia = dto.mediaItems[0] ?? null;
  const ai = dto.aiClassification;

  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    hazardTags: ai?.hazardTags ?? [],
    severity: SEVERITY_FROM_BACKEND[dto.severity] ?? 0,
    plausibilityScore: Math.round((ai?.confidenceScore ?? 0) * 100),
    status: 'pending',
    area: dto.locationAddress,
    lat: dto.latitude,
    lng: dto.longitude,
    reporterName: dto.reporterName || 'Không rõ danh tính',
    reporterPhone: dto.reporterPhone || '—',
    createdAt: dto.createdAt,
    mediaType: firstMedia?.mediaType === 'Video' ? 'video' : 'image',
    mediaUrl: firstMedia?.mediaUrl ?? null,
    assignedVehicleId: null,
  };
}
