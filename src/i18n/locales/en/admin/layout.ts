import type { Messages } from '../../types';
import type { adminLayoutVi } from '../../vi/admin/layout';

export const adminLayoutEn: Messages<typeof adminLayoutVi> = {
  systemAdmin: 'System administration',
  defaultName: 'Administrator',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  expandSidebar: 'Expand sidebar',
  collapseSidebar: 'Collapse sidebar',
  collapse: 'Collapse',
  profile: 'Profile & Change password',
  underDevelopment: 'Under development',
  unsavedChanges: 'You have unsaved changes. Leave this page and discard them?',
  groups: {
    operations: 'Operations',
    catalogs: 'Catalogs',
    users: 'Users',
    settings: 'Configuration',
    monitoring: 'Monitoring',
  },
  pageTitles: {
    citizenReports: 'Citizen reports & alerts',
  },
  nav: {
    overview: 'Overview',
    stations: 'Rescue stations',
    vehicles: 'Fleet',
    equipment: 'Equipment',
    unitTypes: 'Vehicle types',
    incidentTypes: 'Incident types',
    accounts: 'Internal accounts',
    citizens: 'Citizen accounts',
    blockedNumbers: 'Blocked numbers',
    escalation: 'Dispatch & escalation',
    serviceArea: 'Service area',
    citizenReports: 'Reports & alerts',
    reports: 'Incident reports',
    completionReports: 'Completion reports',
    auditTrail: 'Audit Trail',
  },
};
