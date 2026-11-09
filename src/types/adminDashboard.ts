import type { BackendIncidentStatus, BackendSeverityLevel } from './incident';

/**
 * Mirror AdminDashboardStatsDto (GET /api/dashboard/stats — Admin, Operator).
 * Backend đếm trên toàn bộ dữ liệu (không theo khoảng thời gian, không theo trạm).
 */
export interface AdminDashboardStatsDto {
  totalIncidents: number;
  /** Pending / AiProcessing / AiProcessed / Verified / Dispatched / InProgress / Escalated. */
  activeIncidents: number;
  /** Pending / AiProcessing / AiProcessed. */
  pendingIncidents: number;
  /** Dispatched / InProgress. */
  dispatchedIncidents: number;
  resolvedIncidents: number;
  cancelledIncidents: number;
  escalatedIncidents: number;
  criticalLevel3Incidents: number;
  moderateLevel2Incidents: number;
  minorLevel1Incidents: number;
  totalRescueUnits: number;
  availableUnits: number;
  onMissionUnits: number;
  maintenanceUnits: number;
  totalStations: number;
  activeStations: number;
  totalUsers: number;
  totalCitizens: number;
  totalOperators: number;
  totalRescueStaff: number;
  totalAdmins: number;
  averageResponseTimeMinutes: number;
  incidentResolutionRatePercent: number;
  /** 8 sự cố tạo gần nhất (mọi trạng thái). */
  recentIncidents: RecentIncidentSummaryDto[];
}

export interface RecentIncidentSummaryDto {
  id: string;
  title: string;
  severity: BackendSeverityLevel;
  status: BackendIncidentStatus;
  locationAddress: string | null;
  createdAt: string;
}
