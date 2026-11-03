import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GpsSimulatorPanel } from '@/components/operator/livemap/GpsSimulatorPanel';
import { MapboxLocationPicker } from '@/components/common/MapboxLocationPicker';
import { OperatorLayout } from '@/components/operator/OperatorLayout';
import AdminPlaceholderPage from '@/pages/admin/AdminPlaceholderPage';
import { apiClient } from '@/services/apiClient';
import { incidentService } from '@/services/incidentService';
import { mapboxService } from '@/services/mapboxService';
import { FakeMap } from '../setup/mapboxGlMock';
import { t } from '../setup/render';
import type { Vehicle } from '@/types/vehicle';

vi.mock('@/services/incidentService', () => ({ incidentService: { getTracking: vi.fn() } }));
vi.mock('@/services/mapboxService', async (orig) => ({
  ...(await orig<typeof import('@/services/mapboxService')>()),
  mapboxService: { reverseGeocode: vi.fn() },
}));
// OperatorLayout: thay provider + các phần con nặng bằng bản giả.
vi.mock('@/context/DispatchContext', () => ({ DispatchProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/operator/OperatorSidebar', () => ({ OperatorSidebar: () => <nav>sidebar</nav> }));
vi.mock('@/components/operator/OperatorTopbar', () => ({ OperatorTopbar: () => <header>topbar</header> }));
vi.mock('@/components/operator/EscalationAlert', () => ({ EscalationAlert: () => null }));
vi.mock('@/components/operator/IncomingIncidentToasts', () => ({ IncomingIncidentToasts: () => null }));
vi.mock('@/components/operator/OperatorAlerts', () => ({ OperatorAlerts: () => null }));

const v = (o: Partial<Vehicle>): Vehicle =>
  ({ id: 'v1', plate: '51A-1', type: 'fire_truck', status: 'en_route', incidentId: 'i1', stationId: 's', stationName: 'Trạm', lat: 0, lng: 0, ...o }) as Vehicle;

beforeEach(() => {
  vi.clearAllMocks();
  FakeMap.instances.length = 0;
});

describe('GpsSimulatorPanel', () => {
  it('không có xe đang chạy → thông báo', () => {
    render(<GpsSimulatorPanel vehicles={[v({ status: 'available', incidentId: null })]} />);
    expect(screen.getByText(t('liveMap.gpsSim.noVehicles'))).toBeInTheDocument();
  });

  it('nhảy tới đích: tải tuyến và gửi vị trí cuối', async () => {
    vi.mocked(incidentService.getTracking).mockResolvedValue({
      success: true,
      message: '',
      data: { units: [{ rescueUnitId: 'v1', routeTrajectory: [{ latitude: 10.84, longitude: 106.8 }, { latitude: 10.85, longitude: 106.81 }] }] },
    } as never);
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: {} });
    render(<GpsSimulatorPanel vehicles={[v({})]} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'v1');
    await userEvent.click(screen.getByText(t('liveMap.gpsSim.jumpToEnd')));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/rescue-units/v1/location', { latitude: 10.85, longitude: 106.81 }));
    expect(await screen.findByText(t('liveMap.gpsSim.arrived'))).toBeInTheDocument();
  });

  it('thu nhỏ panel', async () => {
    render(<GpsSimulatorPanel vehicles={[]} />);
    await userEvent.click(screen.getByRole('button', { name: t('liveMap.gpsSim.minimize') }));
    expect(screen.queryByText(t('liveMap.gpsSim.noVehicles'))).not.toBeInTheDocument();
  });
});

describe('MapboxLocationPicker', () => {
  it('bấm bản đồ → tra địa chỉ và báo tọa độ mới', async () => {
    vi.mocked(mapboxService.reverseGeocode).mockResolvedValue('Đường D1');
    const onChange = vi.fn();
    render(<MapboxLocationPicker latitude={10.84} longitude={106.8} onChange={onChange} />);
    const map = FakeMap.instances.slice(-1)[0]!;
    await act(async () => map.fire('click', { lngLat: { lat: 10.85, lng: 106.81 } }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(10.85, 106.81, 'Đường D1'));
  });

  it('tra địa chỉ lỗi → vẫn báo tọa độ', async () => {
    vi.mocked(mapboxService.reverseGeocode).mockRejectedValue(new Error('x'));
    const onChange = vi.fn();
    render(<MapboxLocationPicker latitude={10.84} longitude={106.8} onChange={onChange} />);
    await act(async () => FakeMap.instances.slice(-1)[0]!.fire('click', { lngLat: { lat: 1, lng: 2 } }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(1, 2));
  });
});

describe('OperatorLayout / AdminPlaceholderPage', () => {
  it('OperatorLayout ghép sidebar + topbar + trang con', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/x']}>
        <Routes>
          <Route path="/dashboard" element={<OperatorLayout />}>
            <Route path="x" element={<div>trang con</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('sidebar')).toBeInTheDocument();
    expect(screen.getByText('topbar')).toBeInTheDocument();
    expect(screen.getByText('trang con')).toBeInTheDocument();
  });

  it('AdminPlaceholderPage lấy tiêu đề theo mục điều hướng', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/admin/reports']}>
        <AdminPlaceholderPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: t('admin.layout.nav.reports') })).toBeInTheDocument();
    expect(screen.getByText(t('admin.layout.underDevelopment'))).toBeInTheDocument();
    unmount();
    render(
      <MemoryRouter initialEntries={['/admin/khac']}>
        <AdminPlaceholderPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: t('admin.layout.systemAdmin') })).toBeInTheDocument();
  });
});
