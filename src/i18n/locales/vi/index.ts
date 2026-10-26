import { commonVi } from './common';
import { contextVi } from './operator/context';
import { enumsVi } from './enums';
import { layoutVi } from './operator/layout';
import { vehiclesVi } from './operator/vehicles';
import { teamsVi } from './operator/teams';
import { liveMapVi } from './operator/liveMap';
import { incidentsVi } from './operator/incidents';
import { adminVi } from './admin';
import { citizenVi } from './citizen';
import { profileVi } from './profile';

export const vi = {
  common: commonVi,
  context: contextVi,
  enums: enumsVi,
  layout: layoutVi,
  vehicles: vehiclesVi,
  teams: teamsVi,
  liveMap: liveMapVi,
  incidents: incidentsVi,
  admin: adminVi,
  citizen: citizenVi,
  profile: profileVi,
} as const;

export type ViTranslations = typeof vi;
