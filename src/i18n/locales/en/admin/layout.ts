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
    users: 'Users',
    settings: 'Configuration',
    monitoring: 'Monitoring',
  },
  nav: {
    overview: 'Overview',
    stations: 'Rescue stations',
    vehicles: 'Fleet',
    accounts: 'Internal accounts',
    citizens: 'Citizen accounts',
    blockedNumbers: 'Blocked numbers',
    escalation: 'Escalation',
    dispatch: 'Dispatch parameters',
    serviceArea: 'Service area',
    reports: 'Incident reports',
    auditTrail: 'Audit Trail',
  },
};
