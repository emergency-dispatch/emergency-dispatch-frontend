import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveMapPage } from '@/pages/operator/LiveMapPage';
import { makeDispatchStore, mockStore } from '../../setup/dispatchStore';
import { makeIncident } from '../../setup/fixtures';

vi.mock('@/context/DispatchContext', () => ({ useDispatchStore: () => mockStore.current }));
vi.mock('@/hooks/useDispatchRoutes', () => ({ useDispatchRoutes: () => [] }));

// Panel con giả: hiện prop quan trọng + nút gọi callback.
const h = vi.hoisted(() => ({ props: {} as Record<string, Record<string, unknown>> }));
vi.mock('@/components/operator/livemap/LiveMapView', () => ({
  LiveMapView: (p: Record<string, unknown>) => {
    h.props.map = p;
    return <div data-testid="map">pick:{String(!!p.pickLocation)}</div>;
  },
}));
vi.mock('@/components/operator/livemap/DispatchIncidentList', () => ({
  DispatchIncidentList: (p: { selectedIncidentId: string | null; panelError: string | null; onSelectIncident: (id: string | null) => void; onCancelVehicle: (id: string) => void; onCancelIncident: (id: string, code: string) => void }) => (
    <div data-testid="list">
      selected:{String(p.selectedIncidentId)} error:{String(p.panelError)}
      <button onClick={() => p.onSelectIncident(null)}>clear</button>
      <button onClick={() => p.onCancelVehicle('v1')}>recall</button>
      <button onClick={() => p.onCancelIncident('i-low', 'Duplicate')}>cancel-incident</button>
    </div>
  ),
}));
vi.mock('@/components/operator/livemap/DispatchRecommendPanel', () => ({
  DispatchRecommendPanel: (p: { onAssign: (v: string, a: string, o?: unknown) => void }) => (
    <button onClick={() => p.onAssign('v1', 'nearest')}>assign</button>
  ),
}));
vi.mock('@/components/operator/livemap/CreateIncidentPanel', () => ({
  CreateIncidentPanel: (p: { onCreated: (info: unknown) => void; onClose: () => void }) => (
    <div data-testid="create">
      <button onClick={() => p.onCreated({ incidentId: 'new', title: 'Sự cố mới', message: 'Đã tạo', dispatchSucceeded: false, dispatchMessage: 'Không còn xe' })}>created</button>
      <button onClick={p.onClose}>close-create</button>
    </div>
  ),
}));
vi.mock('@/components/operator/livemap/GpsSimulatorPanel', () => ({ GpsSimulatorPanel: () => null }));

function Probe() {
  return <div data-testid="search">{useLocation().search}</div>;
}

const renderPage = (entry: string | { pathname: string; state?: unknown } = '/dashboard/command-center/live-map') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/dashboard/command-center/live-map"
          element={
            <>
              <LiveMapPage />
              <Probe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  h.props = {};
  mockStore.current = makeDispatchStore({
    incidents: [
      makeIncident({ id: 'i-low', status: 'approved', severity: 1 }),
      makeIncident({ id: 'i-high', status: 'approved', severity: 3 }),
      makeIncident({ id: 'i-pending' }),
    ],
  });
});

describe('LiveMapPage', () => {
  it('chưa gán trạm → hướng dẫn', () => {
    mockStore.current = makeDispatchStore({ stationNotAssigned: 'Chưa gán trạm' });
    renderPage();
    expect(screen.getByText('Chưa gán trạm')).toBeInTheDocument();
  });

  it('tự chọn sự cố ưu tiên nhất còn thiếu xe; chỉ truyền sự cố đã duyệt cho bản đồ', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId('list')[0]).toHaveTextContent('selected:i-high'));
    expect((h.props.map.dispatchIncidents as { id: string }[]).map((i) => i.id)).toEqual(['i-low', 'i-high']);
  });

  it('bỏ chọn thủ công → không tự chọn lại', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId('list')[0]).toHaveTextContent('selected:i-high'));
    await userEvent.click(screen.getAllByText('clear')[0]);
    expect(screen.getAllByTestId('list')[0]).toHaveTextContent('selected:null');
  });

  it('deep link focusIncidentId', async () => {
    renderPage({ pathname: '/dashboard/command-center/live-map', state: { focusIncidentId: 'i-low' } });
    await waitFor(() => expect(screen.getAllByTestId('list')[0]).toHaveTextContent('selected:i-low'));
  });

  it('giao xe cho sự cố đang chọn; lỗi hiện ở panel', async () => {
    vi.mocked(mockStore.current.assignVehicle).mockResolvedValueOnce({ ok: false, message: 'Xe vừa được giao' });
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId('list')[0]).toHaveTextContent('selected:i-high'));
    await userEvent.click(screen.getByText('assign'));
    expect(mockStore.current.assignVehicle).toHaveBeenCalledWith('v1', 'i-high', 'nearest', undefined);
    expect(await screen.findAllByText(/error:Xe vừa được giao/)).not.toHaveLength(0);
  });

  it('thu hồi xe / hủy sự cố', async () => {
    renderPage();
    await userEvent.click(screen.getAllByText('recall')[0]);
    expect(mockStore.current.cancelAssignment).toHaveBeenCalledWith('v1');
    await userEvent.click(screen.getAllByText('cancel-incident')[0]);
    expect(mockStore.current.rejectIncident).toHaveBeenCalledWith('i-low', expect.any(String), null, 'Duplicate');
  });

  it('?create=1 → form tạo sự cố + bản đồ chọn vị trí; tạo xong → đóng form, chọn sự cố mới, hiện kết quả', async () => {
    renderPage('/dashboard/command-center/live-map?create=1');
    expect(screen.getByTestId('create')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toHaveTextContent('pick:true');
    await userEvent.click(screen.getByText('created'));
    expect(screen.queryByTestId('create')).not.toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Đã tạo');
    expect(status).toHaveTextContent('Không còn xe');
    expect(screen.getAllByTestId('list')[0]).toHaveTextContent('selected:new');
  });

  it('đóng form tạo → bỏ ?create', async () => {
    renderPage('/dashboard/command-center/live-map?create=1&x=1');
    await userEvent.click(screen.getByText('close-create'));
    expect(screen.getByTestId('search')).toHaveTextContent('?x=1');
  });

  it('điều xe thất bại → thông báo không tự ẩn, đóng bằng nút', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage('/dashboard/command-center/live-map?create=1');
    act(() => screen.getByText('created').click());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    vi.useRealTimers();
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
