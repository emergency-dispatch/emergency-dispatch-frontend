import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IncidentQueuePage } from '@/pages/operator/IncidentQueuePage';
import { IncidentAuditTimeline } from '@/components/operator/incidents/IncidentAuditTimeline';
import { incidentService } from '@/services/incidentService';
import { makeDispatchStore, mockStore } from '../../setup/dispatchStore';
import { makeIncident } from '../../setup/fixtures';
import { t } from '../../setup/render';
import type { Incident } from '@/types/incident';

vi.mock('@/context/DispatchContext', () => ({ useDispatchStore: () => mockStore.current }));
vi.mock('@/services/incidentService', () => ({ incidentService: { getAuditTrail: vi.fn() } }));

const myLock = () => ({ operatorId: 'op1', operatorName: 'Tôi', expiresAt: new Date(Date.now() + 90_000).toISOString() });

const setup = (incidents: Incident[], extra: Parameters<typeof makeDispatchStore>[0] = {}, state?: unknown) => {
  mockStore.current = makeDispatchStore({
    incidents,
    stations: [
      { id: 'st-1', name: 'Trạm 1', address: '', lat: 0, lng: 0, coverageRadiusKm: 5, vehicleIds: [] },
      { id: 'st-2', name: 'Trạm 2', address: '', lat: 0, lng: 0, coverageRadiusKm: 5, vehicleIds: [] },
    ],
    ...extra,
  });
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/dashboard/command-center/incidents', state }]}>
      <IncidentQueuePage />
    </MemoryRouter>,
  );
};

const openDrawer = async (title = 'Cháy kho hàng') => {
  await userEvent.click(screen.getByText(title));
  return screen.getByText(t('incidents.drawer.kicker')).closest('aside')!;
};

beforeEach(() => {
  vi.mocked(incidentService.getAuditTrail).mockResolvedValue({ items: [], totalCount: 0 } as never);
});

describe('IncidentQueuePage', () => {
  it('chưa gán trạm → hướng dẫn', () => {
    setup([], { stationNotAssigned: 'Bạn chưa được gán trạm' });
    expect(screen.getByText('Bạn chưa được gán trạm')).toBeInTheDocument();
  });

  it('chỉ hiện sự cố chờ duyệt; mở ca → giữ khóa', async () => {
    setup([makeIncident({ id: 'a' }), makeIncident({ id: 'b', title: 'Đã duyệt', status: 'approved' })]);
    expect(screen.queryByText('Đã duyệt')).not.toBeInTheDocument();
    await openDrawer();
    expect(mockStore.current.lockIncident).toHaveBeenCalledWith('a');
    expect(mockStore.current.setIncidentDrawerOpen).toHaveBeenCalledWith(true);
  });

  it('ca do người khác giữ → không lấy khóa, chỉ xem', async () => {
    setup([makeIncident({ lock: { operatorId: 'op2', operatorName: 'Chị Hoa', expiresAt: new Date(Date.now() + 60_000).toISOString() } })]);
    const drawer = await openDrawer();
    expect(mockStore.current.lockIncident).not.toHaveBeenCalled();
    expect(within(drawer).getByRole('button', { name: t('incidents.drawer.approve') })).toBeDisabled();
  });

  it('mở từ thông báo (state.openIncidentId) → tự mở ca', async () => {
    setup([makeIncident({ id: 'x1', title: 'Tin mới' })], {}, { openIncidentId: 'x1' });
    await waitFor(() => expect(mockStore.current.lockIncident).toHaveBeenCalledWith('x1'));
    expect(screen.getByText(t('incidents.drawer.kicker'))).toBeInTheDocument();
  });

  it('duyệt giữ nguyên cấp AI', async () => {
    setup([makeIncident({ lock: myLock() })]);
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole('button', { name: t('incidents.drawer.approve') }));
    expect(mockStore.current.approveIncident).toHaveBeenCalledWith('inc-1', 2, undefined, undefined, undefined);
  });

  it('ghi đè cấp độ bắt buộc lý do ≥ 5 ký tự', async () => {
    setup([makeIncident({ lock: myLock() })]);
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole('button', { name: t('enums.severity.level3') }));
    const approve = within(drawer).getByRole('button', { name: t('incidents.drawer.approve') });
    expect(approve).toBeDisabled();
    await userEvent.type(within(drawer).getByPlaceholderText(t('incidents.drawer.overridePlaceholder')), 'Có người mắc kẹt');
    expect(approve).toBeEnabled();
    await userEvent.click(approve);
    expect(mockStore.current.approveIncident).toHaveBeenCalledWith('inc-1', 3, 'Có người mắc kẹt', undefined, undefined);
  });

  it('chưa có loại sự cố → bắt buộc chọn Cháy nổ / Tai nạn', async () => {
    setup([makeIncident({ lock: myLock(), category: 'unknown', needsEventType: true })]);
    const drawer = await openDrawer();
    const approve = within(drawer).getByRole('button', { name: t('incidents.drawer.approve') });
    expect(approve).toBeDisabled();
    await userEvent.click(within(drawer).getByRole('button', { name: t('enums.category.accident'), pressed: false }));
    await userEvent.click(approve);
    expect(mockStore.current.approveIncident).toHaveBeenCalledWith('inc-1', 2, undefined, 'accident', undefined);
  });

  it('AI không phân loại được → chưa chọn cấp, chọn Cấp 1 vẫn cần lý do', async () => {
    setup([makeIncident({ lock: myLock(), aiUnclassified: true, severity: 1 })]);
    const drawer = await openDrawer();
    const approve = within(drawer).getByRole('button', { name: t('incidents.drawer.approve') });
    expect(approve).toBeDisabled();
    await userEvent.click(within(drawer).getByRole('button', { name: t('enums.severity.level1') }));
    expect(approve).toBeDisabled();
    await userEvent.type(within(drawer).getByPlaceholderText(t('incidents.drawer.overridePlaceholder')), 'Đã gọi xác minh');
    expect(approve).toBeEnabled();
  });

  it('duyệt kèm thẩm định ùn tắc', async () => {
    setup([makeIncident({ lock: myLock(), trafficJam: { status: 'Suspected', evidence: 'Dồn ứ', reviewed: false, verifiedAt: null, verifiedByUserId: null } })]);
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole('button', { name: t('incidents.traffic.confirm') }));
    await userEvent.click(within(drawer).getByRole('button', { name: t('incidents.drawer.approve') }));
    expect(mockStore.current.approveIncident).toHaveBeenCalledWith('inc-1', 2, undefined, undefined, 'Confirmed');
  });

  it('hủy ca + chặn số', async () => {
    setup([makeIncident({ lock: myLock() })]);
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole('button', { name: t('incidents.drawer.rejectTitle') }));
    await userEvent.click(within(drawer).getByRole('radio', { name: t('enums.cancellationReason.Duplicate') }));
    await userEvent.click(within(drawer).getByRole('checkbox'));
    await userEvent.selectOptions(within(drawer).getByRole('combobox'), '7d');
    await userEvent.click(within(drawer).getByRole('button', { name: t('incidents.drawer.confirmReject') }));
    expect(mockStore.current.rejectIncident).toHaveBeenCalledWith('inc-1', expect.stringContaining('trùng sự cố khác'), '7d', 'Duplicate');
  });

  it('hủy ca kèm ghi chú, không chặn số', async () => {
    setup([makeIncident({ lock: myLock() })]);
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole('button', { name: t('incidents.drawer.rejectTitle') }));
    await userEvent.type(within(drawer).getByPlaceholderText(t('incidents.drawer.rejectNotePlaceholder')), '  Thử nghiệm  ');
    await userEvent.click(within(drawer).getByRole('button', { name: t('incidents.drawer.confirmReject') }));
    expect(mockStore.current.rejectIncident).toHaveBeenCalledWith('inc-1', 'Thử nghiệm', null, 'FalseReport');
  });

  it('chuyển trạm: bỏ trạm đang phụ trách, cần lý do', async () => {
    setup([makeIncident({ lock: myLock(), responsibleStationId: 'st-1' })]);
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole('button', { name: t('incidents.drawer.transfer') }));
    const select = within(drawer).getByRole('combobox');
    expect(within(select).queryByRole('option', { name: 'Trạm 1' })).not.toBeInTheDocument();
    await userEvent.selectOptions(select, 'st-2');
    const confirm = within(drawer).getByRole('button', { name: t('incidents.drawer.confirmTransfer') });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(drawer).getByPlaceholderText(t('incidents.drawer.transferPlaceholder')), 'Trạm 2 gần hơn');
    await userEvent.click(confirm);
    expect(mockStore.current.transferIncident).toHaveBeenCalledWith('inc-1', 'st-2', 'Trạm 2 gần hơn');
  });

  it('hiện số điện thoại', async () => {
    setup([makeIncident({ lock: myLock(), reporterPhone: '098***456' })]);
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole('button', { name: t('incidents.drawer.revealPhone') }));
    expect(mockStore.current.revealReporterPhone).toHaveBeenCalledWith('inc-1');
    expect(await within(drawer).findByText('0981234567')).toBeInTheDocument();
  });

  it('lỗi thao tác → hiện trong drawer; đóng drawer → nhả khóa', async () => {
    setup([makeIncident({ lock: myLock() })]);
    vi.mocked(mockStore.current.approveIncident).mockResolvedValue({ ok: false, message: 'Đã có người duyệt' });
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole('button', { name: t('incidents.drawer.approve') }));
    expect(await within(drawer).findByText('Đã có người duyệt')).toBeInTheDocument();
    await userEvent.click(within(drawer).getByRole('button', { name: t('common.close') }));
    expect(mockStore.current.releaseIncident).toHaveBeenCalledWith('inc-1');
  });

  it('cảnh báo AI: lỗi, độ tin cậy thấp, YOLO sơ bộ, bất đồng engine', async () => {
    setup([
      makeIncident({ id: 'f', title: 'AI lỗi', lock: myLock(), aiFailed: true }),
      makeIncident({ id: 'l', title: 'Tin cậy thấp', lock: myLock(), confidenceScore: 30, aiFlags: { preliminaryYolo: true, engineDisagreement: true } }),
    ]);
    let drawer = await openDrawer('AI lỗi');
    expect(within(drawer).getByText(t('incidents.drawer.aiFailedTitle'))).toBeInTheDocument();
    await userEvent.click(within(drawer).getByRole('button', { name: t('common.close') }));
    drawer = await openDrawer('Tin cậy thấp');
    expect(within(drawer).getByText(t('incidents.drawer.lowConfidenceTitle'))).toBeInTheDocument();
    expect(within(drawer).getByText(t('incidents.drawer.preliminaryYoloTitle'))).toBeInTheDocument();
    expect(within(drawer).getByText(t('incidents.drawer.engineDisagreementTitle'))).toBeInTheDocument();
  });

  it('tab lịch sử xử lý', async () => {
    setup([makeIncident({ lock: myLock() })]);
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole('tab', { name: t('incidents.drawer.tabHistory') }));
    expect(incidentService.getAuditTrail).toHaveBeenCalledWith('inc-1');
    expect(await within(drawer).findByText(t('incidents.audit.empty'))).toBeInTheDocument();
  });
});

describe('IncidentAuditTimeline', () => {
  it('mới nhất trước; ẩn mô tả của mốc Created; vai trò; ùn tắc', async () => {
    vi.mocked(incidentService.getAuditTrail).mockResolvedValue({
      items: [
        { id: '1', incidentId: 'i', action: 'Created', description: 'Tiếp nhận SOS', actorName: 'Dân A', actorRole: 'Citizen', timestamp: '2026-10-01T01:00:00Z' },
        { id: '2', incidentId: 'i', action: 'Verified', description: 'Xác minh Cấp 3', actorName: 'Op', actorRole: 'Operator', timestamp: '2026-10-01T01:05:00Z' },
        { id: '3', incidentId: 'i', action: 'StatusChanged', newStateJson: '{"trafficJamStatus":"Confirmed"}', actorRole: 'Robot', timestamp: '2026-10-01T01:06:00Z' },
        { id: '4', incidentId: 'i', action: 'Weird' as never, timestamp: '2026-10-01T00:59:00Z' },
      ],
      totalCount: 10,
    } as never);
    render(<IncidentAuditTimeline incidentId="i" />);
    const items = await screen.findAllByRole('listitem');
    expect(items[0]).toHaveTextContent(t('incidents.audit.trafficJamConfirmed'));
    expect(items[0]).toHaveTextContent('Robot');
    expect(items[1]).toHaveTextContent(t('incidents.audit.actions.Verified'));
    expect(items[1]).toHaveTextContent(t('incidents.audit.roles.Operator'));
    expect(screen.queryByText('Tiếp nhận SOS')).not.toBeInTheDocument();
    expect(items[3]).toHaveTextContent(t('incidents.audit.unknownAction'));
    expect(screen.getByText(new RegExp(t('incidents.audit.count', { count: 10 })))).toBeInTheDocument();
  });

  it('lỗi tải → thông báo; tải lại', async () => {
    vi.mocked(incidentService.getAuditTrail).mockRejectedValueOnce(new Error('Không có quyền')).mockResolvedValueOnce({ items: [], totalCount: 0 } as never);
    render(<IncidentAuditTimeline incidentId="i" />);
    expect(await screen.findByText('Không có quyền')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('incidents.audit.reload') }));
    expect(await screen.findByText(t('incidents.audit.empty'))).toBeInTheDocument();
  });
});
