import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OperatorSidebar } from '@/components/operator/OperatorSidebar';
import { OperatorAlerts } from '@/components/operator/OperatorAlerts';
import { EscalationAlert } from '@/components/operator/EscalationAlert';
import { IncomingIncidentToasts } from '@/components/operator/IncomingIncidentToasts';
import { makeDispatchStore, mockStore } from '../../setup/dispatchStore';
import { makeIncident } from '../../setup/fixtures';
import { t } from '../../setup/render';

vi.mock('@/context/DispatchContext', () => ({ useDispatchStore: () => mockStore.current }));

function Probe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname + JSON.stringify(loc.state ?? null)}</div>;
}

const renderAt = (ui: ReactElement, path = '/dashboard/command-center/live-map') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      {ui}
      <Routes>
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  mockStore.current = makeDispatchStore();
});

describe('OperatorSidebar', () => {
  it('4 mục điều hướng, badge số sự cố chờ duyệt, mục đang mở', () => {
    mockStore.current = makeDispatchStore({
      incidents: [makeIncident({ id: 'a' }), makeIncident({ id: 'b' }), makeIncident({ id: 'c', status: 'approved' })],
    });
    renderAt(<OperatorSidebar />, '/dashboard/command-center/incidents');
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
    expect(links[1]).toHaveAttribute('title', t('layout.nav.incidentQueue'));
    expect(links[1]).toHaveAttribute('href', '/dashboard/command-center/incidents');
    expect(links[1]).toHaveTextContent('2');
    expect(links[1]).toHaveClass('bg-red-50');
    expect(links[0]).not.toHaveClass('bg-red-50');
  });

  it('trên 99 → 99+', () => {
    mockStore.current = makeDispatchStore({ incidents: Array.from({ length: 120 }, (_, i) => makeIncident({ id: `i${i}` })) });
    renderAt(<OperatorSidebar />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});

describe('OperatorAlerts', () => {
  it('không có cảnh báo → không hiện', () => {
    const { container } = renderAt(<OperatorAlerts />);
    expect(container.querySelector('[role=alert]')).toBeNull();
  });

  it('ngoài vùng + sự cố chờ duyệt → mở hàng đợi', async () => {
    mockStore.current = makeDispatchStore({
      incidents: [makeIncident({ id: 'i1' })],
      operatorAlerts: [{ id: 'a1', kind: 'out_of_area', incidentId: 'i1', title: 'SOS ngoài vùng', message: 'Cách 2 km', at: '' }],
    });
    renderAt(<OperatorAlerts />);
    expect(screen.getByRole('alert')).toHaveTextContent('SOS ngoài vùng');
    await userEvent.click(screen.getByRole('button', { name: t('layout.operatorAlerts.verify') }));
    expect(mockStore.current.dismissOperatorAlert).toHaveBeenCalledWith('a1');
    expect(screen.getByTestId('loc')).toHaveTextContent('/dashboard/command-center/incidents{"openIncidentId":"i1"}');
  });

  it('xe hỗ trợ → xem trên bản đồ; chuyển trạm không có nút hành động; đóng', async () => {
    mockStore.current = makeDispatchStore({
      operatorAlerts: [
        { id: 'a2', kind: 'support_dispatched', incidentId: 'i9', title: 'Xe đi hỗ trợ', message: '', at: '' },
        { id: 'a3', kind: 'transferred', incidentId: 'i8', title: 'Đã chuyển trạm', message: '', at: '' },
      ],
    });
    renderAt(<OperatorAlerts />);
    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: t('layout.operatorAlerts.viewOnMap') })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: t('layout.operatorAlerts.viewOnMap') }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/dashboard/command-center/live-map{"focusIncidentId":"i9"}');
    await userEvent.click(screen.getAllByRole('button', { name: t('layout.operatorAlerts.dismiss') })[1]);
    expect(mockStore.current.dismissOperatorAlert).toHaveBeenCalledWith('a3');
  });
});

describe('EscalationAlert', () => {
  const escalated = () => {
    const pending = makeIncident({ id: 'e1', title: 'Cháy chưa duyệt', createdAt: new Date(Date.now() - 7 * 60_000).toISOString() });
    const approved = makeIncident({ id: 'e2', title: 'Chưa có xe', status: 'approved' });
    return makeDispatchStore({
      incidents: [pending, approved, makeIncident({ id: 'x' })],
      escalatedIncidentIds: new Set(['e1', 'e2']),
      escalationTiers: new Map([['e2', 2]]),
    });
  };

  it('không có ca leo thang → không hiện', () => {
    renderAt(<EscalationAlert />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('banner liệt kê ca leo thang, cấp 2, thời gian chờ; điều hướng theo trạng thái', async () => {
    mockStore.current = escalated();
    renderAt(<EscalationAlert />);
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent('Cháy chưa duyệt');
    expect(banner).toHaveTextContent(t('layout.escalation.tier2'));
    expect(banner).toHaveTextContent(t('layout.escalation.waiting', { minutes: 7 }));
    await userEvent.click(screen.getByRole('button', { name: t('layout.escalation.dispatch') }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/dashboard/command-center/live-map{"focusIncidentId":"e2"}');
    await userEvent.click(screen.getByRole('button', { name: t('layout.escalation.verify') }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/dashboard/command-center/incidents');
  });

  it('thu gọn / mở lại', async () => {
    mockStore.current = escalated();
    renderAt(<EscalationAlert />);
    await userEvent.click(screen.getByRole('button', { name: t('layout.escalation.collapse') }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('layout.escalation.collapsedButton', { count: 2 }) }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('drawer đang mở → mặc định thu gọn', () => {
    mockStore.current = { ...escalated(), incidentDrawerOpen: true };
    renderAt(<EscalationAlert />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('layout.escalation.collapsedButton', { count: 2 }) })).toBeInTheDocument();
  });
});

describe('IncomingIncidentToasts', () => {
  it('không có tin mới → không hiện', () => {
    renderAt(<IncomingIncidentToasts />);
    expect(screen.queryByText(t('layout.incomingIncident.title'))).not.toBeInTheDocument();
  });

  it('hiện tin đầu tiên; bỏ qua / duyệt ngay', async () => {
    const incident = makeIncident({ id: 'n1', title: 'Tai nạn xe tải', createdAt: new Date(Date.now() - 65_000).toISOString() });
    mockStore.current = makeDispatchStore({ incomingIncidents: [incident, makeIncident({ id: 'n2', title: 'Tin thứ hai' })] });
    renderAt(<IncomingIncidentToasts />);
    expect(screen.getByText('Tai nạn xe tải')).toBeInTheDocument();
    expect(screen.queryByText('Tin thứ hai')).not.toBeInTheDocument();
    expect(screen.getByText(/^01:0[5-6]$/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '0981234456' })).toHaveAttribute('href', 'tel:0981234456');
    await userEvent.click(screen.getByRole('button', { name: t('layout.incomingIncident.skip') }));
    expect(mockStore.current.dismissIncomingIncident).toHaveBeenCalledWith('n1');
    await userEvent.click(screen.getByRole('button', { name: t('layout.incomingIncident.verifyNow') }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/dashboard/command-center/incidents{"openIncidentId":"n1"}');
  });

  it('tin chuyển trạm + AI đang phân tích', () => {
    const incident = makeIncident({ id: 'n1', aiPending: true, reporterPhone: '—' });
    mockStore.current = makeDispatchStore({
      incomingIncidents: [incident],
      incomingTransferNotes: new Map([['n1', { fromStationName: 'Trạm 3', transferredByName: 'Op B', reason: 'Gần trạm bạn hơn' }]]),
    });
    renderAt(<IncomingIncidentToasts />);
    expect(screen.getByText(t('layout.incomingIncident.transferredKicker'))).toBeInTheDocument();
    expect(screen.getByText(t('layout.incomingIncident.transferReason', { reason: 'Gần trạm bạn hơn' }))).toBeInTheDocument();
    expect(screen.getByText(t('layout.incomingIncident.aiAnalyzing'))).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
