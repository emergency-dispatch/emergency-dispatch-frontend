import type { Messages } from '../../types';
import type { citizenLayoutVi } from '../../vi/citizen/layout';

export const citizenLayoutEn: Messages<typeof citizenLayoutVi> = {
  features: 'Features & Solutions',
  hotlines: 'Hotlines',
  reportSos: 'Emergency SOS',
  cooldownLabel: 'Cooldown ({{time}})',
  signIn: 'Sign In',
  signOut: 'Sign Out',
  profile: 'User Profile',
  settings: 'Settings & Security',
  myReports: 'Incident History',
  staffPortal: 'Rescue Operations',
  cadPortal: 'CAD Command Center',
  language: 'Language',
  menu: 'Navigation Menu',
  toPortal: 'Go to {{portal}}',
  navCadTitle: 'CAD Features',
  navCadDesc: 'Digital maps, incident monitoring & intelligent dispatch',
  navAiTitle: 'AI VLM Technology',
  navAiDesc: 'Vision-language model incident analysis & automated AI Triage',
  navWorkflowTitle: 'Rescue Workflow',
  navWorkflowDesc: 'Standardized 4-step multi-agency coordinated response',
  navRolesTitle: 'Role Solutions',
  navRolesDesc: 'CAD Command Center, Field Rescue Forces & Citizens',
};
