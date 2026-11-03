import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OverviewPage from '@/pages/admin/OverviewPage';
import { LONG_MAINTENANCE_DAYS, overviewAdminService, type AdminOverview } from '@/services/admin/overviewAdminService';
import { renderWithRouter, t } from '../../setup/render';

vi.mock('@/services/admin/overviewAdminService', async (orig) => ({
  ...(await orig<typeof import('@/services/admin/overviewAdminService')>()),
  overviewAdminService: { getOverview: vi.fn() },
}));

const svc = vi.mocked(overviewAdminService);

const overview = (o: Partial<AdminOverview['actionItems']> = {}): AdminOverview => ({
  generatedAt: new Date().toISOString(),
  vehicleCounts: { Available: 11, on_mission: 4, CoolDown: 2, Maintenance: 3, OutOfService: 1 },
  activeStationCount: 6,
  accountCounts: { Operator: 7, RescueStaff: 42 } as AdminOverview['accountCounts'],
  citizenCount: 1234,
  actionItems: { stationsWithoutAvailableVehicle: [], longMaintenanceVehicles: [], outOfServiceVehicles: [], ...o },
});

beforeEach(() => vi.clearAllMocks());

describe('OverviewPage', () => {
  it('thẻ số liệu có link lọc sẵn', async () => {
    svc.getOverview.mockResolvedValue(overview());
    renderWithRouter(<OverviewPage />);
    expect(await screen.findByText('1234')).toBeInTheDocument();
    expect(screen.getByText(t('admin.monitoring.overview.onMission')).closest('a')).toHaveAttribute('href', '/admin/vehicles?status=on_mission');
    expect(screen.getByText('42').closest('a')).toHaveAttribute('href', '/admin/accounts?role=RescueStaff');
    expect(screen.getByText('6').closest('a')).toHaveAttribute('href', '/admin/stations');
    expect(screen.getByText(t('admin.monitoring.overview.nothingToDo'))).toBeInTheDocument();
  });

  it('việc cần xử lý', async () => {
    svc.getOverview.mockResolvedValue(
      overview({
        stationsWithoutAvailableVehicle: [
          { id: 's1', name: 'Trạm A', vehicleCount: 0 },
          { id: 's2', name: 'Trạm B', vehicleCount: 3 },
        ],
        longMaintenanceVehicles: [{ id: 'v1', plate: '51A-1', stationName: 'Trạm A', maintenanceSince: '2026-09-01T00:00:00Z', days: 5 }],
        outOfServiceVehicles: [
          { id: 'v2', plate: '51A-2', stationName: 'Trạm Cũ' },
          { id: 'v3', plate: '51A 3', stationName: '' },
        ],
      }),
    );
    renderWithRouter(<OverviewPage />);
    expect(await screen.findByText(t('admin.monitoring.overview.noAvailableVehicle'))).toBeInTheDocument();
    expect(screen.getByText(t('admin.monitoring.overview.stationNoVehicles'))).toBeInTheDocument();
    expect(screen.getByText(t('admin.monitoring.overview.stationNoneAvailable', { count: 3 }))).toBeInTheDocument();
    expect(screen.getByText(t('admin.monitoring.overview.longMaintenance', { days: LONG_MAINTENANCE_DAYS }))).toBeInTheDocument();
    expect(screen.getByText(t('admin.monitoring.overview.previousStation', { station: 'Trạm Cũ' }))).toBeInTheDocument();
    expect(screen.getByText(t('admin.monitoring.overview.previousStationDeleted'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('admin.monitoring.overview.open', { name: '51A 3' }) })).toHaveAttribute(
      'href',
      '/admin/vehicles?search=51A%203',
    );
    expect(screen.queryByText(t('admin.monitoring.overview.nothingToDo'))).not.toBeInTheDocument();
  });

  it('lỗi tải và làm mới', async () => {
    svc.getOverview.mockRejectedValueOnce(new Error('Không tải được')).mockResolvedValueOnce(overview());
    renderWithRouter(<OverviewPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được');
    await userEvent.click(screen.getByRole('button', { name: t('admin.monitoring.refresh') }));
    await waitFor(() => expect(screen.getByText('1234')).toBeInTheDocument());
    expect(svc.getOverview).toHaveBeenCalledTimes(2);
  });
});
