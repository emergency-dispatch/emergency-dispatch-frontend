export type BackendDispatchStatus =
  | 'Dispatched'
  | 'Accepted'
  | 'EnRoute'
  | 'OnScene'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected';

export type RejectionReason =
  | 'VehicleBreakdown'
  | 'AlreadyOnMission'
  | 'TooFar'
  | 'MedicalLeave'
  | 'NoResponse'
  | 'Other';

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
  enRouteAt?: string | null;
  status: BackendDispatchStatus;
  notes?: string | null;
  distanceKm?: number | null;
  estimatedArrivalMinutes?: number | null;
  rejectionReason?: RejectionReason | null;
  rejectionNotes?: string | null;
  rejectedAt?: string | null;
  responseDurationMinutes?: number | null;
  onSceneDurationMinutes?: number | null;
  completionReport?: CompletionReportDto | null;
}

export interface CompletionReportDto {
  stationTeamId?: string | null;
  stationTeamName?: string | null;
  actionsSummary: string;
  victimsAssistedCount: number;
  equipmentUsed: string[];
  evidenceMediaUrls: string[];
  handoverEntity?: string | null;
  handoverContactName?: string | null;
  handoverContactPhone?: string | null;
  handoverNotes?: string | null;
  signatureUrl?: string | null;
  signerName?: string | null;
  signedAt?: string | null;
  submittedByUserId?: string | null;
  submittedAt: string;
}

export interface UpdateAssignmentStatusDto {
  status: 'Accepted' | 'EnRoute' | 'OnScene' | 'Cancelled';
  notes?: string;
}

export interface RejectAssignmentDto {
  reason: RejectionReason;
  notes?: string;
}

export interface ResolveDispatchDto {
  resolutionSummary: string; // Min 10 characters (Required)
  evidenceMediaUrls: string[]; // Min 1 item (Required by backend MSG42)
  victimsAssistedCount: number; // Required >= 0
  equipmentUsed?: string[];
  handoverEntity?: string;
  handoverContactName?: string;
  handoverContactPhone?: string;
  handoverNotes?: string;
  signatureUrl: string; // Required by backend (FR-RS-03, BR-25)
}

export type BackendDispatchAlgorithm = 'NearestAvailable' | 'LoadAware';

export interface AssignDispatchDto {
  incidentId: string;
  rescueUnitId?: string;
  rescueUnitIds?: string[];
  algorithm?: BackendDispatchAlgorithm;
  allowExtraUnits?: boolean;
  notes?: string;
  /**
   * §21.2: giao xe đáp ứng yêu cầu chi viện (Backup) của đội hiện trường — được vượt giới hạn Cấp 1–2
   * và yêu cầu tự chuyển Fulfilled. Cấp 3 vẫn tối đa 5 xe.
   */
  fieldRequestId?: string;
}

export interface RecommendedUnitResponseDto {
  rescueUnitId: string;
  plateNumber: string;
  unitType: string;
  status: string;
  stationId: string;
  stationName: string;
  currentLat: number;
  currentLng: number;
  distanceKm: number;
  estimatedEtaMinutes: number;
  activeTasksCount: number;
  stationLoad: number;
  stationActiveMissions: number;
  cost: number;
  score: number;
  searchRadiusKm: number;
  radiusExpanded: boolean;
  algorithmUsed: BackendDispatchAlgorithm;
  recommendationReason: string;
  /** Quãng đường / thời gian theo đường bộ (OSRM); null nếu máy chủ chỉ đường lỗi. */
  roadDistanceKm?: number | null;
  roadDurationMinutes?: number | null;
  /** Máy chủ chỉ đường lỗi → quãng đường / ETA là ước lượng. */
  isApproximate?: boolean;
  /** Xe của trạm khác (điều hỗ trợ). */
  isSupportUnit?: boolean;
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
