import type { Messages } from '../types';
import type { enumsVi } from '../vi/enums';

export const enumsEn: Messages<typeof enumsVi> = {
  severity: { level1: 'Level 1 · Minor', level2: 'Level 2 · Moderate', level3: 'Level 3 · Severe' },
  severityShort: { level1: 'Level 1', level2: 'Level 2', level3: 'Level 3' },
  category: { fire: 'Fire / explosion', accident: 'Accident', unknown: 'Unidentified' },
  hazardTag: { fire: '#Fire', accident: '#Accident', traffic_jam: '#Traffic_Jam', other: 'Other' },
  vehicleStatus: {
    available: 'Available',
    awaiting_ack: 'Awaiting crew',
    accepted: 'Accepted',
    en_route: 'En route',
    on_scene: 'On scene',
    recovering: 'Cooling down',
    unavailable: 'Maintenance',
    outOfService: 'Out of service',
  },
  vehicleType: {
    ambulance: 'Ambulance',
    fire_truck: 'Fire truck',
    police: 'Police car',
    rescue: 'Rescue vehicle',
  },
  unitType: {
    FireTruck: 'Fire truck',
    LadderTruck: 'Ladder truck',
    Ambulance: 'Ambulance',
    HeavyRescueVehicle: 'Heavy rescue vehicle',
    RescueBoat: 'Rescue boat',
    PolicePatrol: 'Patrol car',
  },
  unitStatus: {
    Available: 'Available',
    Dispatched: 'Dispatched',
    OnScene: 'On scene',
    Returning: 'Returning',
    CoolDown: 'Cooling down',
    Maintenance: 'Maintenance',
    OutOfService: 'Out of service',
  },
  teamFunction: {
    fire_truck: 'Firefighting',
    ambulance: 'Accident medical care',
    rescue: 'Rescue (fire & accident)',
  },
  algorithm: {
    nearest: { label: 'Nearest', description: 'Nearest-Available — ranked by distance' },
    load_aware: {
      label: 'Load-aware',
      description: 'Load-Aware — weighs distance, station load and active missions',
    },
  },
  cancellationReason: {
    FalseReport: 'False / incorrect report',
    Duplicate: 'Duplicate of another incident',
    TestReport: 'Test report',
    Other: 'Other reason',
    CitizenCancelled: 'Cancelled by reporter',
    AutoExpired: 'Auto-cancelled (expired)',
  },
  blockDuration: { '7d': '7 days', '30d': '30 days', '1y': '1 year', permanent: 'Permanent' },
  rejectionReason: {
    VehicleBreakdown: 'Vehicle breakdown',
    AlreadyOnMission: 'Busy with another mission',
    TooFar: 'Too far to reach',
    MedicalLeave: 'Health reasons',
    NoResponse: 'No response in time',
    Other: 'Other reason',
  },
};
