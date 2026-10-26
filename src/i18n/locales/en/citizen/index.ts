import type { Messages } from '../../types';
import type { citizenVi } from '../../vi/citizen';
import { citizenLayoutEn } from './layout';
import { citizenLandingEn } from './landing';
import { citizenSosEn } from './sos';
import { citizenReportsEn } from './reports';

export const citizenEn: Messages<typeof citizenVi> = {
  layout: citizenLayoutEn,
  landing: citizenLandingEn,
  sos: citizenSosEn,
  reports: citizenReportsEn,
};
