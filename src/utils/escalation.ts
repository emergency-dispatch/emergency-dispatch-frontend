import { ESCALATION_NIGHT_THRESHOLD_MS, ESCALATION_THRESHOLD_MS } from '../data/dispatchConfig';
import type { Incident } from '../types/incident';
import type { Vehicle, VehicleStatus } from '../types/vehicle';

// Đội đã "nhận" sự cố khi xe đã Chấp nhận trở đi — lúc đó sự cố tự hạ thang.
const CLAIMED_STATUSES: VehicleStatus[] = ['accepted', 'en_route', 'on_scene', 'recovering'];

export function isNightShift(now: number): boolean {
  const hour = new Date(now).getHours();
  return hour >= 22 || hour < 6;
}

export function escalationThresholdMs(now: number): number {
  return isNightShift(now) ? ESCALATION_NIGHT_THRESHOLD_MS : ESCALATION_THRESHOLD_MS;
}

/**
 * Mô phỏng Escalation Daemon phía client (FR-SYS-02): sự cố Cấp 3 chưa có đội nhận
 * quá ngưỡng → Escalated. TODO(backend): nhận trạng thái Escalated qua SignalR.
 */
export function isIncidentEscalated(incident: Incident, vehiclesById: Map<string, Vehicle>, now: number): boolean {
  if (incident.severity !== 3) return false;
  if (incident.status !== 'pending' && incident.status !== 'approved') return false;

  const claimed = incident.assignedVehicleIds.some((id) => {
    const status = vehiclesById.get(id)?.status;
    return !!status && CLAIMED_STATUSES.includes(status);
  });
  if (claimed) return false;

  return now - new Date(incident.createdAt).getTime() > escalationThresholdMs(now);
}
