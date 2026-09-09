import type { IncidentSeverity, HazardTagKey } from './incident';
import type { VehicleType } from './vehicle';

export type MissionStatus = 'accepted' | 'en_route' | 'on_scene' | 'completed';

export interface TurnByTurnStep {
  id: string;
  instruction: string;
  roadName: string;
  maneuver: 'straight' | 'turn_left' | 'turn_right' | 'slight_left' | 'slight_right' | 'u_turn' | 'roundabout' | 'arrive';
  distanceMeters: number;
  durationSeconds: number;
  lat: number;
  lng: number;
}

export interface MissionLogEntry {
  id: string;
  timestamp: string;
  status: MissionStatus;
  label: string;
  note?: string;
}

export interface ClosureEvidencePhoto {
  id: string;
  url: string;
  category: 'before_rescue' | 'after_action' | 'casualty_treatment' | 'property_damage';
  label: string;
  timestamp: string;
}

export interface DigitalClosureReport {
  missionId: string;
  incidentId: string;
  vehiclePlate: string;
  teamLeader: string;
  completedAt: string;
  actionSummary: string;
  casualtiesTreated: number;
  casualtiesHospitalized: number;
  fireExtinguished: boolean;
  hazardsNeutralized: boolean;
  resourcesUsed: {
    name: string;
    quantity: number;
    unit: string;
  }[];
  photos: ClosureEvidencePhoto[];
  handoverEntity: string;
  handoverContactName: string;
  handoverContactPhone: string;
  handoverQrData: string;
  signatureDataUrl: string;
  dispatchApprovalStatus: 'submitted' | 'verified';
}

export interface StaffMission {
  id: string;
  incidentId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  hazardTags: HazardTagKey[];
  area: string;
  address: string;
  incidentLat: number;
  incidentLng: number;
  callerName: string;
  callerPhone: string;
  assignedAt: string;
  acceptedAt?: string;
  enRouteAt?: string;
  onSceneAt?: string;
  completedAt?: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleType: VehicleType;
  vehicleLat: number;
  vehicleLng: number;
  status: MissionStatus;
  currentStepIndex: number;
  routeSteps: TurnByTurnStep[];
  routePolyline: [number, number][];
  timeline: MissionLogEntry[];
  closureReport?: DigitalClosureReport;
}

export interface StaffProfile {
  id: string;
  name: string;
  role: string;
  badgeNumber: string;
  stationName: string;
  vehiclePlate: string;
  vehicleType: VehicleType;
  status: 'on_duty' | 'off_duty' | 'break';
  batteryLevel: number;
  gpsSignal: 'strong' | 'moderate' | 'weak';
  phone?: string;
  email?: string;
  certifications?: {
    name: string;
    issuedBy: string;
    expiryDate: string;
    status: 'active' | 'expiring_soon';
  }[];
}

export type ShiftType = 'morning' | 'afternoon' | 'night' | 'off' | 'full_day';

export type ShiftRegistrationType = 'regular' | 'overtime' | 'leave';

export interface ShiftScheduleItem {
  id: string;
  date: string;
  dayOfWeek: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  stationName: string;
  vehiclePlate: string;
  role: string;
  teamMembers: {
    name: string;
    role: string;
    phone: string;
  }[];
  status: 'scheduled' | 'checked_in' | 'completed' | 'swapped';
  checkInTime?: string;
  checkOutTime?: string;
  note?: string;
  dutyHours?: number;
  isOvertime?: boolean;
  registrationId?: string;
}

export interface ShiftSwapRequest {
  id: string;
  fromStaffName: string;
  toStaffName: string;
  targetDate: string;
  originalShift: ShiftType;
  swapShift: ShiftType;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedBy?: string;
  responseNote?: string;
}

export interface ShiftRegistrationRequest {
  id: string;
  staffId: string;
  staffName: string;
  registrationType: ShiftRegistrationType;
  dates: string[]; // List of YYYY-MM-DD
  shiftType: ShiftType;
  stationName: string;
  desiredRole: string;
  preferredVehicle?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  responseNote?: string;
}

export interface ShiftLeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  leaveType: 'annual' | 'compensatory' | 'sick' | 'personal';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  emergencyContact?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedBy?: string;
  responseNote?: string;
}

export interface EquipmentCheckItem {
  id: string;
  name: string;
  category: 'vehicle' | 'medical' | 'firefighting' | 'communication';
  status: 'operational' | 'needs_refill' | 'faulty';
  lastChecked: string;
  quantity: number;
  unit: string;
  note: string;
}

