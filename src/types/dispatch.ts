import type { SeverityLevel } from './incident';

export type BackendDispatchStatus =
  | 'Dispatched'
  | 'Accepted'
  | 'EnRoute'
  | 'OnScene'
  | 'Completed'
  | 'Cancelled';

export interface RescueUnitInAssignment {
  id: string;
  plateNumber: string;
  unitType: string;
  unitTypeName?: string;
  status: string;
  statusName?: string;
  currentLat: number;
  currentLng: number;
  stationId: string;
  stationName: string;
}

export interface DispatchAssignmentResponseDto {
  id: string;
  incidentId: string;
  incidentTitle: string;
  incidentAddress: string;
  incidentLat: number;
  incidentLng: number;
  incidentSeverity: string;
  rescueUnitId: string;
  rescueUnit?: RescueUnitInAssignment;
  dispatchedAt: string;
  acceptedAt?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  status: BackendDispatchStatus;
  notes?: string | null;
  responseDurationMinutes?: number | null;
  onSceneDurationMinutes?: number | null;
}

export interface UpdateAssignmentStatusDto {
  status: 'Accepted' | 'EnRoute' | 'OnScene' | 'Cancelled';
  notes?: string;
}

export interface ResolveDispatchDto {
  resolutionSummary: string; // Min 10 characters
  evidenceMediaUrls?: string[];
  handoverNotes?: string;
}

export interface AssignDispatchDto {
  incidentId: string;
  rescueUnitId: string;
  notes?: string;
}

export interface RecommendedUnitResponseDto {
  unitId: string;
  plateNumber: string;
  unitType: string;
  distanceKm: number;
  estimatedArrivalMinutes: number;
  stationName: string;
  score?: number;
}

export interface TeamMemberSummaryDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: string;
  status: string;
  teamName?: string;
}

export interface StationVehicleSummaryDto {
  id: string;
  plateNumber: string;
  unitType: string;
  status: string;
  currentLat: number;
  currentLng: number;
}

export interface StaffTeamResponseDto {
  stationId?: string | null;
  stationName?: string | null;
  stationAddress?: string | null;
  stationPhoneNumber?: string | null;
  myTeamName?: string | null;
  teamMembers: TeamMemberSummaryDto[];
  stationVehicles: StationVehicleSummaryDto[];
}
