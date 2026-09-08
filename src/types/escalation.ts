import type { RoleId } from './account';
import type { IncidentSeverity } from './dashboard';

export interface EscalationRule {
  id: string;
  name: string;
  minSeverity: IncidentSeverity;
  waitMinutes: number;
  notifyRoles: RoleId[];
  enabled: boolean;
}
