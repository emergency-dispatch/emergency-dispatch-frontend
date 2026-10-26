import type { Messages } from '../../types';
import type { adminCommonVi } from '../../vi/admin/common';

export const adminCommonEn: Messages<typeof adminCommonVi> = {
  loading: 'Loading...',
  status: 'Status',
  actions: 'Actions',
  allStatuses: 'All statuses',
  filterByStatus: 'Filter by status',
  clearFilters: 'Clear filters',
  invalidDateRange: 'The start date must be on or before the end date.',
  dateRange: {
    label: 'Date range',
    from: 'From date',
    to: 'To date',
    today: 'Today',
    last7Days: '7 days',
    last30Days: '30 days',
  },
  settings: {
    restoreDefaults: 'Restore defaults',
    discard: 'Discard changes',
    save: 'Save settings',
    lastUpdated: 'Last updated: {{time}} by {{name}}.',
    neverUpdated: 'Never updated — using default values.',
    restoreTitle: 'Restore default values?',
    restoreConfirm: 'Restore',
    restoreBody: 'The form will be refilled with default values. Settings only change when you click “Save settings”.',
    loading: 'Loading settings...',
    defaultsFilled: 'Default values filled in. Click “Save settings” to apply.',
    mustBePositive: 'Must be greater than 0.',
  },
};
