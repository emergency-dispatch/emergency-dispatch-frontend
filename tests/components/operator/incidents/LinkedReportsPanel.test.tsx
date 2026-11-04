import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LinkedReportsPanel } from '@/components/operator/incidents/LinkedReportsPanel';
import { incidentService } from '@/services/incidentService';
import { t } from '../../../setup/render';
import type { LinkedReportDto } from '@/types/incident';

vi.mock('@/services/incidentService', () => ({
  incidentService: { getLinkedReports: vi.fn(), unlinkReport: vi.fn(), confirmDuplicate: vi.fn() },
}));

const getLinked = vi.mocked(incidentService.getLinkedReports);
const unlink = vi.mocked(incidentService.unlinkReport);
const confirmDup = vi.mocked(incidentService.confirmDuplicate);

const report = (o: Partial<LinkedReportDto> = {}): LinkedReportDto => ({
  incidentId: 'r1',
  status: 'Linked',
  reportedAt: '2026-11-04T03:05:00Z',
  linkedAt: '2026-11-04T03:05:00Z',
  distanceMeters: 80,
  description: 'Khói bốc lên từ tầng 3',
  locationAddress: 'Đường D1',
  latitude: 10.84,
  longitude: 106.8,
  reporterName: 'Trần B',
  maskedReporterPhone: '098****456',
  reportedEventType: null,
  quickCheckEventType: null,
  isOutlier: false,
  mediaUrls: [],
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  unlink.mockResolvedValue({} as never);
  confirmDup.mockResolvedValue({} as never);
});

describe('LinkedReportsPanel', () => {
  it('hiện báo cáo đang gộp, khoảng cách, cảnh báo lệch, loại người báo chọn / ảnh; báo cáo đã xác nhận trùng không có nút', async () => {
    getLinked.mockResolvedValue([
      report(),
      report({ incidentId: 'r2', reporterName: 'Lê C', isOutlier: true, reportedEventType: 'FireExplosion', quickCheckEventType: 'TrafficAccident' }),
      report({ incidentId: 'r3', reporterName: 'Phạm D', status: 'Cancelled' }),
    ]);
    render(<LinkedReportsPanel parentIncidentId="p1" linkedReportCount={2} />);

    expect(await screen.findByText('Trần B')).toBeInTheDocument();
    expect(getLinked).toHaveBeenCalledWith('p1');
    // Chỉ đếm báo cáo đang gộp (r1, r2), không đếm báo cáo đã xác nhận trùng.
    expect(screen.getByText(t('incidents.linked.heading', { count: 2 }))).toBeInTheDocument();
    expect(screen.getAllByText(/cách 80 m/)).toHaveLength(3);
    expect(screen.getByText(t('incidents.linked.outlier'))).toBeInTheDocument();
    expect(screen.getByText(t('incidents.linked.reportedType', { type: t('enums.category.fire') }))).toBeInTheDocument();
    expect(screen.getByText(t('incidents.linked.yoloType', { type: t('enums.category.accident') }))).toBeInTheDocument();
    expect(screen.getByText(t('incidents.linked.confirmedBadge'))).toBeInTheDocument();
    // 2 báo cáo đang gộp → 2 cặp nút; báo cáo đã xác nhận trùng không có nút.
    expect(screen.getAllByRole('button', { name: t('incidents.linked.unlink') })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: t('incidents.linked.confirm') })).toHaveLength(2);
  });

  it('Tách ra: hỏi lại, gửi lý do (tùy chọn), báo thành công và tải lại', async () => {
    getLinked.mockResolvedValue([report()]);
    render(<LinkedReportsPanel parentIncidentId="p1" linkedReportCount={1} />);
    await userEvent.click(await screen.findByRole('button', { name: t('incidents.linked.unlink') }));

    expect(screen.getByText(t('incidents.linked.unlinkPrompt'))).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(t('incidents.linked.unlinkPlaceholder')), ' cháy nhà bên cạnh ');
    getLinked.mockResolvedValue([]);
    await userEvent.click(screen.getByRole('button', { name: t('incidents.linked.unlinkConfirm') }));

    expect(unlink).toHaveBeenCalledWith('r1', 'cháy nhà bên cạnh');
    expect(await screen.findByText(t('incidents.linked.unlinkDone'))).toBeInTheDocument();
    await waitFor(() => expect(getLinked).toHaveBeenCalledTimes(2));
  });

  it('Xác nhận trùng: không ghi chú vẫn gửi được; "Quay lại" hủy thao tác', async () => {
    getLinked.mockResolvedValue([report()]);
    render(<LinkedReportsPanel parentIncidentId="p1" linkedReportCount={1} />);
    await userEvent.click(await screen.findByRole('button', { name: t('incidents.linked.confirm') }));
    await userEvent.click(screen.getByRole('button', { name: t('incidents.linked.back') }));
    expect(screen.queryByText(t('incidents.linked.confirmPrompt'))).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: t('incidents.linked.confirm') }));
    await userEvent.click(screen.getByRole('button', { name: t('incidents.linked.confirmConfirm') }));
    expect(confirmDup).toHaveBeenCalledWith('r1', '');
    expect(await screen.findByText(t('incidents.linked.confirmDone'))).toBeInTheDocument();
  });

  it('thao tác lỗi → hiện thông báo của backend', async () => {
    getLinked.mockResolvedValue([report()]);
    confirmDup.mockRejectedValue(new Error('Báo cáo này không nằm trong nhóm gom nào.'));
    render(<LinkedReportsPanel parentIncidentId="p1" linkedReportCount={1} />);
    await userEvent.click(await screen.findByRole('button', { name: t('incidents.linked.confirm') }));
    await userEvent.click(screen.getByRole('button', { name: t('incidents.linked.confirmConfirm') }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Báo cáo này không nằm trong nhóm gom nào.');
  });

  it('chỉ xem (Operator khác giữ ca) → không có nút thao tác', async () => {
    getLinked.mockResolvedValue([report()]);
    render(<LinkedReportsPanel parentIncidentId="p1" linkedReportCount={1} readOnly />);
    expect(await screen.findByText('Trần B')).toBeInTheDocument();
    expect(screen.getByText(t('incidents.linked.readOnly'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('incidents.linked.unlink') })).not.toBeInTheDocument();
  });

  it('linkedReportCount đổi (realtime) → tải lại; lỗi tải → hiện lỗi', async () => {
    getLinked.mockResolvedValue([report()]);
    const { rerender } = render(<LinkedReportsPanel parentIncidentId="p1" linkedReportCount={1} />);
    await screen.findByText('Trần B');
    getLinked.mockRejectedValue(new Error('Bạn không có quyền xem sự cố này.'));
    rerender(<LinkedReportsPanel parentIncidentId="p1" linkedReportCount={2} />);
    await waitFor(() => expect(getLinked).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Bạn không có quyền xem sự cố này.')).toBeInTheDocument();
  });

  it('ảnh: tối đa 4 ảnh thu nhỏ, phần còn lại gộp "+N"; video hiện biểu tượng', async () => {
    getLinked.mockResolvedValue([
      report({ mediaUrls: ['a.jpg', 'b.jpg', 'c.mp4', 'd.jpg', 'e.jpg', 'f.jpg'] }),
    ]);
    render(<LinkedReportsPanel parentIncidentId="p1" linkedReportCount={1} />);
    const item = (await screen.findByText('Trần B')).closest('li')!;
    expect(within(item).getAllByRole('link')).toHaveLength(4);
    expect(within(item).getByText('+2')).toBeInTheDocument();
    expect(item.querySelectorAll('img')).toHaveLength(3);
  });
});
