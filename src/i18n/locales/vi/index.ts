import { commonVi } from './common';
import { contextVi } from './context';
import { enumsVi } from './enums';
import { layoutVi } from './layout';
import { vehiclesVi } from './vehicles';
import { teamsVi } from './teams';
import { liveMapVi } from './liveMap';
import { incidentsVi } from './incidents';

export const vi = {
  common: commonVi,
  context: contextVi,
  enums: enumsVi,
  layout: layoutVi,
  vehicles: vehiclesVi,
  teams: teamsVi,
  liveMap: liveMapVi,
  incidents: incidentsVi,
} as const;
