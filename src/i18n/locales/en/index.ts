import type { Messages } from '../types';
import type { vi } from '../vi';
import { commonEn } from './common';
import { contextEn } from './context';
import { enumsEn } from './enums';
import { layoutEn } from './layout';
import { vehiclesEn } from './vehicles';
import { teamsEn } from './teams';
import { liveMapEn } from './liveMap';
import { incidentsEn } from './incidents';

export const en: Messages<typeof vi> = {
  common: commonEn,
  context: contextEn,
  enums: enumsEn,
  layout: layoutEn,
  vehicles: vehiclesEn,
  teams: teamsEn,
  liveMap: liveMapEn,
  incidents: incidentsEn,
};
