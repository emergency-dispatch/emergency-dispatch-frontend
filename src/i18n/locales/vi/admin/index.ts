import { adminLayoutVi } from './layout';
import { adminCommonVi } from './common';
import { adminStationsVi } from './stations';
import { adminVehiclesVi } from './vehicles';
import { adminUsersVi } from './users';
import { adminSettingsVi } from './settings';
import { adminMonitoringVi } from './monitoring';

export const adminVi = {
  layout: adminLayoutVi,
  common: adminCommonVi,
  stations: adminStationsVi,
  vehicles: adminVehiclesVi,
  users: adminUsersVi,
  settings: adminSettingsVi,
  monitoring: adminMonitoringVi,
} as const;
