import { citizenLayoutVi } from './layout';
import { citizenLandingVi } from './landing';
import { citizenSosVi } from './sos';
import { citizenReportsVi } from './reports';

export const citizenVi = {
  layout: citizenLayoutVi,
  landing: citizenLandingVi,
  sos: citizenSosVi,
  reports: citizenReportsVi,
} as const;
