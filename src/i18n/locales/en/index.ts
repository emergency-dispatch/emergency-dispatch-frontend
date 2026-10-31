import type { Messages } from '../types';
import type { vi } from '../vi';
import { commonEn } from './common';
import { contextEn } from './operator/context';
import { enumsEn } from './enums';
import { layoutEn } from './operator/layout';
import { vehiclesEn } from './operator/vehicles';
import { teamsEn } from './operator/teams';
import { liveMapEn } from './operator/liveMap';
import { incidentsEn } from './operator/incidents';
import { adminEn } from './admin';
import { citizenEn } from './citizen';
import { profileEn } from './profile';

export const en: Messages<typeof vi> = {
  common: commonEn,
  context: contextEn,
  enums: enumsEn,
  layout: layoutEn,
  vehicles: vehiclesEn,
  teams: teamsEn,
  liveMap: liveMapEn,
  incidents: incidentsEn,
  admin: adminEn,
  citizen: citizenEn,
  profile: profileEn,
};
