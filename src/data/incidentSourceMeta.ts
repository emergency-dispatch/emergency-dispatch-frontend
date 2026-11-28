import { Cctv, Eye, MessageSquareMore, Phone, Radio, ShieldAlert, Smartphone, type LucideIcon } from 'lucide-react';
import type { IncidentSource } from '../types/incident';

export const INCIDENT_SOURCE_ICON: Record<IncidentSource, LucideIcon> = {
  CitizenApp: Smartphone,
  PhoneCall: Phone,
  Radio,
  Cctv,
  FieldObservation: Eye,
  RescueTeam: ShieldAlert,
  Other: MessageSquareMore,
};
