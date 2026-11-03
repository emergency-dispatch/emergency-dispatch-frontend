import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportsPage from '@/pages/admin/ReportsPage';
import { reportAdminService } from '@/services/admin/reportAdminService';
import { stationAdminService } from '@/services/admin/stationAdminService';
import { page, t } from '../../setup/render';
import type { IncidentHistoryItemDto } from '@/types/report';

vi.mock('@/services/admin/reportAdminService', () => ({
  reportAdminService: { listIncidents: vi.fn(), getSummary: vi.fn(), exportIncidents: vi.fn() },
}));
vi.mock('@/services/admin/stationAdminService', () => ({ stationAdminService: { list: vi.fn() } }));

const svc = vi.mocked(reportAdminService);

const item = (o: Partial<IncidentHistoryItemDto>): IncidentHistoryItemDto => ({
  id: 'i1',
  title: 'Cháy kho',
  locationAddress: 'Đường D1',
  severity: 'Level3',
  aiSeverityScore: 88,
  status: 'Completed',
  cancellationReason: null,
  resolutionSummary: 'Đã dập tắt',
  reportedAt: '2026-10-01T01:00:00Z',
  verifiedAt: '2026-10-01T01:02:00Z',
  firstDispatchedAt: null,
  firstArrivedAt: null,
  closedAt: '2026-10-01T02:00:00Z',
  responseMinutes: 12,
  resolutionMinutes: 75,
  verifiedByName: 'Op A',
  closedByName: null,
  stations: ['Trạm A'],
  units: ['51A-1'],
  ...o,
});

function AuditProbe() {
  return <div data-testid="audit">{useLocation().search}</div>;
}

const renderPage = (url = '/admin/reports') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/admin/reports" element={<ReportsPage />} />
        <Route path="/admin/audit-trail" element={<AuditProbe />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(stationAdminService.list).mockResolvedValue(page([{ id: 's1', name: 'Trạm A' }]) as never);
  svc.listIncidents.mockResolvedValue(
    page([item({}), item({ id: 'i2', title: 'Báo khống', status: 'Cancelled', cancellationReason: 'FalseReport', severity: 'Unclassified' })]) as never,
  );
  svc.getSummary.mockResolvedValue({ total: 2, completed: 1, cancelled: 1, bySeverity: { Level3: 1, Unclassified: 1 }, avgResponseMinutes: 12, avgResolutionMinutes: 75 });
});

describe('ReportsPage', () => {
  it('thẻ thống kê và bảng; đọc bộ lọc từ URL (ngày sai định dạng bị bỏ)', async () => {
    renderPage('/admin/reports?from=2026-10-01&to=01/10/2026&status=Cancelled&severity=Level2&station=s1');
    expect(await screen.findByText('Cháy kho')).toBeInTheDocument();
    expect(svc.listIncidents).toHaveBeenCalledWith(
      { fromDate: '2026-10-01', toDate: undefined, stationId: 's1', status: 'Cancelled', severity: 'Level2', search: undefined },
      { pageIndex: 1, pageSize: 20 },
    );
    expect(screen.getAllByText('1 giờ 15 phút').length).toBeGreaterThan(0);
    expect(screen.getByText(t('enums.cancellationReason.FalseReport'))).toBeInTheDocument();
  });

  it('xóa bộ lọc', async () => {
    renderPage('/admin/reports?status=Completed');
    await screen.findByText('Cháy kho');
    await userEvent.click(screen.getByRole('button', { name: t('admin.common.clearFilters') }));
    await waitFor(() => expect(svc.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'All' })));
    expect(screen.queryByRole('button', { name: t('admin.common.clearFilters') })).not.toBeInTheDocument();
  });

  it('xuất CSV thành công / PDF lỗi', async () => {
    svc.exportIncidents.mockResolvedValueOnce('bao-cao.csv').mockRejectedValueOnce(new Error('Quá 5000 dòng'));
    renderPage();
    await screen.findByText('Cháy kho');
    await userEvent.click(screen.getByRole('button', { name: t('admin.monitoring.reports.exportCsv') }));
    expect(svc.exportIncidents).toHaveBeenCalledWith(expect.objectContaining({ status: 'All' }), 'Csv');
    expect(await screen.findByRole('status')).toHaveTextContent(t('admin.monitoring.reports.downloaded', { name: 'bao-cao.csv' }));
    await userEvent.click(screen.getByRole('button', { name: t('admin.monitoring.reports.exportPdf') }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Quá 5000 dòng');
  });

  it('không có dữ liệu → khóa nút xuất', async () => {
    svc.listIncidents.mockResolvedValue(page([]) as never);
    svc.getSummary.mockResolvedValue({ total: 0, completed: 0, cancelled: 0, bySeverity: {}, avgResponseMinutes: null, avgResolutionMinutes: null });
    renderPage();
    expect(await screen.findByText(t('admin.monitoring.reports.table.empty'))).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: t('admin.monitoring.reports.exportCsv') })).toBeDisabled());
  });

  it('mở chi tiết sự cố → mốc thời gian, chuyển sang nhật ký', async () => {
    renderPage();
    await userEvent.click(await screen.findByText('Cháy kho'));
    const drawer = screen.getByRole('dialog', { name: t('admin.monitoring.reports.drawer.title') });
    expect(within(drawer).getByText('Đã dập tắt')).toBeInTheDocument();
    expect(within(drawer).getByText('88%')).toBeInTheDocument();
    expect(within(drawer).getAllByText(t('admin.monitoring.reports.drawer.none')).length).toBeGreaterThan(0);
    await userEvent.click(within(drawer).getByRole('button', { name: t('admin.monitoring.reports.drawer.viewAudit') }));
    expect(screen.getByTestId('audit')).toHaveTextContent('?incident=i1');
  });
});
