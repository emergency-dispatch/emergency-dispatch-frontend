import type { Messages } from '../../types';
import type { adminVi } from '../../vi/admin';
import { adminLayoutEn } from './layout';
import { adminCommonEn } from './common';
import { adminStationsEn } from './stations';
import { adminVehiclesEn } from './vehicles';
import { adminEquipmentEn } from './equipment';
import { adminUsersEn } from './users';
import { adminSettingsEn } from './settings';
import { adminMonitoringEn } from './monitoring';

export const adminEn: Messages<typeof adminVi> = {
  layout: adminLayoutEn,
  common: adminCommonEn,
  stations: adminStationsEn,
  vehicles: adminVehiclesEn,
  equipment: adminEquipmentEn,
  users: adminUsersEn,
  settings: adminSettingsEn,
  monitoring: adminMonitoringEn,
};
