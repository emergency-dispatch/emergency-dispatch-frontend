import type { Messages } from '../../types';
import type { contextVi } from '../../vi/operator/context';

export const contextEn: Messages<typeof contextVi> = {
  loadQueueFailed: 'Could not load the incident queue.',
  stationNotAssigned: 'An Admin has not assigned you a station yet.',
  sessionEnded: 'Your session has ended.',
  verifyFailed: 'Failed to verify the incident.',
  cancelFailed: 'Failed to cancel the incident.',
  blockAfterCancelFailed: 'Incident cancelled, but blocking the phone number failed: {{message}}',
  transferFailed: 'Failed to transfer the incident.',
  lockedByOther: 'Another dispatcher is handling this incident.',
  lockFailed: 'Could not take this incident.',
  incidentOrVehicleNotFound: 'Incident or vehicle not found.',
  vehicleNotAvailable: 'Vehicle {{plate}} is no longer available.',
  singleVehicleOnly: 'Level 1–2 incidents can only be assigned 1 vehicle.',
  maxVehicles: 'Level 3 incidents can be assigned up to {{max}} vehicles.',
  assignFailed: 'Failed to assign the vehicle.',
  noActiveAssignment: 'This vehicle has no active assignment.',
  unassignFailed: 'Failed to cancel the assignment.',
  vehicleStatusFailed: 'Could not change the vehicle status.',
  vehicleUpdateFailed: 'Could not update the vehicle.',
  vehicleCreateFailed: 'Could not add the vehicle.',
  resolveTrafficFailed: 'Could not resolve the traffic jam.',
  loadNotificationsFailed: 'Could not load notifications.',
};
