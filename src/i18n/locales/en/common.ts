import type { Messages } from '../types';
import type { commonVi } from '../vi/common';

export const commonEn: Messages<typeof commonVi> = {
  close: 'Close',
  cancel: 'Cancel',
  saving: 'Saving...',
  processing: 'Processing...',
  loading: 'Loading…',
  dismissNotice: 'Dismiss notification',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  recordCount: '{{count}} records',
  you: 'You',
  km: '{{value}} km',
  minutesShort: '{{count}} min',
  duration: {
    justNow: 'Just now',
    minutes: '{{m}} min',
    hours: '{{h}} h',
    hoursMinutes: '{{h}} h {{m}} min',
    days: '{{d}} d',
    daysHours: '{{d}} d {{h}} h',
  },
  reason: {
    counter: '{{length}}/{{min}} characters minimum · recorded in the Audit Trail',
  },
};
