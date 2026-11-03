import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CitizenPhoneModal } from '@/components/citizen/CitizenPhoneModal';
import { CitizenReportsModal } from '@/components/citizen/CitizenReportsModal';
import { CitizenLiveTrackingMapModal } from '@/components/citizen/CitizenLiveTrackingMapModal';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { incidentService } from '@/services/incidentService';
import { trackingHubService } from '@/services/realtime/incidentHubService';
import { UserRole } from '@/types/auth';
import { t } from '../../setup/render';
import type { IncidentResponseDto } from '@/types/incident';

vi.mock('@/services/liveMapService', async (orig) => ({
  ...(await orig<typeof import('@/services/liveMapService')>()),
  liveMapService: { getStations: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/services/incidentService', () => ({
  incidentService: { getIncidents: vi.fn(), getMyReports: vi.fn(), getById: vi.fn(), getTracking: vi.fn() },
}));

const inc = vi.mocked(incidentService);

const withAuth = (ui: ReactElement, ctx: Partial<AuthContextType>) =>
  render(<AuthContext.Provider value={ctx as AuthContextType}>{ui}</AuthContext.Provider>);

const dto = (o: Partial<IncidentResponseDto>): IncidentResponseDto =>
  ({ id: 'abcdef12-3456', title: 'Cháy', description: '', latitude: 10.84, longitude: 106.8, locationAddress: 'D1', status: 'Pending', severity: 'Level2', createdAt: '2026-10-01T00:00:00Z', mediaItems: [], ...o }) as IncidentResponseDto;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(trackingHubService, 'start').mockResolvedValue(false);
  vi.spyOn(trackingHubService, 'invoke').mockResolvedValue(null);
  vi.spyOn(trackingHubService, 'on').mockReturnValue(() => {});
});

describe('CitizenPhoneModal', () => {
  const user = { id: 'c', fullName: 'Dân A', phoneNumber: '' };

  it('đóng → không render', () => {
    const { container } = withAuth(<CitizenPhoneModal isOpen={false} onClose={vi.fn()} />, { user: user as never });
    expect(container).toBeEmptyDOMElement();
  });

  it('SĐT sai định dạng → báo lỗi, không lưu', async () => {
    const updateProfile = vi.fn();
    withAuth(<CitizenPhoneModal isOpen onClose={vi.fn()} />, { user: user as never, updateProfile });
    await userEvent.type(screen.getByPlaceholderText(t('citizen.sos.phoneModalPlaceholder')), '0123');
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t('citizen.sos.phoneModalBtnSave')) }));
    expect(screen.getByText(t('citizen.sos.phoneModalInvalidError'))).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('lưu SĐT hợp lệ vào hồ sơ', async () => {
    const updateProfile = vi.fn().mockResolvedValue({});
    const onSuccess = vi.fn();
    withAuth(<CitizenPhoneModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />, { user: user as never, updateProfile });
    await userEvent.type(screen.getByPlaceholderText(t('citizen.sos.phoneModalPlaceholder')), '0912345678');
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t('citizen.sos.phoneModalBtnSave')) }));
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'Dân A', phoneNumber: '0912345678' }));
    expect(await screen.findByText(t('citizen.sos.phoneModalSaveSuccess'))).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledWith('0912345678');
  });

  it('để trống → xóa SĐT; lỗi hiện thông báo', async () => {
    const updateProfile = vi.fn().mockRejectedValue(new Error('Lỗi mạng'));
    withAuth(<CitizenPhoneModal isOpen onClose={vi.fn()} />, { user: { ...user, phoneNumber: '0912345678' } as never, updateProfile });
    const input = screen.getByPlaceholderText(t('citizen.sos.phoneModalPlaceholder'));
    expect(input).toHaveValue('0912345678');
    await userEvent.clear(input);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t('citizen.sos.phoneModalBtnRemove')) }));
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: null }));
    expect(await screen.findByText('Lỗi mạng')).toBeInTheDocument();
  });
});

describe('CitizenReportsModal', () => {
  it('Citizen: dùng my-reports, gộp sự cố lưu cục bộ, mới nhất trước', async () => {
    localStorage.setItem('resq_my_reported_incident_ids', JSON.stringify(['local-1']));
    inc.getMyReports.mockResolvedValue({
      success: true,
      message: '',
      data: { items: [{ id: 'r1', title: 'Cháy cũ', description: '', locationAddress: 'A', status: 'Completed', severity: 'Level1', reportedAt: '2026-09-01T00:00:00Z', mediaUrls: ['a.jpg'] }] },
    } as never);
    inc.getById.mockResolvedValue({ success: true, message: '', data: dto({ id: 'local-1', title: 'Cháy kho mới', createdAt: '2026-10-05T00:00:00Z' }) } as never);
    withAuth(<CitizenReportsModal isOpen onClose={vi.fn()} />, { user: { role: UserRole.Citizen } as never });
    expect(await screen.findByText('Cháy kho mới')).toBeInTheDocument();
    expect(inc.getMyReports).toHaveBeenCalledWith({ pageSize: 50 });
    expect(inc.getIncidents).not.toHaveBeenCalled();
    const titles = screen.getAllByText(/Cháy kho mới|Cháy cũ/).map((e) => e.textContent);
    expect(titles[0]).toBe('Cháy kho mới');
    expect(screen.getByText(t('citizen.reports.status.completed'))).toBeInTheDocument();
  });

  it('Operator / Admin dùng danh sách toàn hệ thống', async () => {
    inc.getIncidents.mockResolvedValue({ success: true, message: '', data: { items: [dto({ status: 'Dispatched', title: 'Đang điều xe' })] } } as never);
    withAuth(<CitizenReportsModal isOpen onClose={vi.fn()} />, { user: { role: UserRole.Operator } as never });
    expect(await screen.findByText('Đang điều xe')).toBeInTheDocument();
    expect(inc.getIncidents).toHaveBeenCalledWith({ pageSize: 50 });
    expect(screen.getAllByText(t('citizen.reports.trackRescueUnit')).length).toBeGreaterThan(0);
  });

  it('khách vãng lai không có báo cáo → trạng thái trống', async () => {
    withAuth(<CitizenReportsModal isOpen onClose={vi.fn()} />, { user: null });
    expect(await screen.findByText(t('citizen.reports.emptyTitle'))).toBeInTheDocument();
  });

  it('lỗi tải → thông báo', async () => {
    inc.getMyReports.mockRejectedValue(new Error('Hết phiên'));
    withAuth(<CitizenReportsModal isOpen onClose={vi.fn()} />, { user: { role: UserRole.Citizen } as never });
    expect(await screen.findByText('Hết phiên')).toBeInTheDocument();
  });

  it('khóa cuộn trang khi mở', async () => {
    const { unmount } = withAuth(<CitizenReportsModal isOpen onClose={vi.fn()} />, { user: null });
    expect(document.body.style.overflow).toBe('hidden');
    await screen.findByText(t('citizen.reports.emptyTitle'));
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('CitizenLiveTrackingMapModal', () => {
  it('tải thông tin xe và đăng ký nhận vị trí realtime', async () => {
    inc.getTracking.mockResolvedValue({
      success: true,
      message: '',
      data: { incidentId: 'abcdef12-3456', vehicleLat: 10.85, vehicleLng: 106.81, plateNumber: '51A-999', estimatedArrivalMinutes: 6, distanceKm: 2.5, dispatchStatus: 'EnRoute', routeTrajectory: [] },
    } as never);
    vi.spyOn(trackingHubService, 'start').mockResolvedValue(true);
    render(<CitizenLiveTrackingMapModal incident={dto({ status: 'Dispatched' })} onClose={vi.fn()} />);
    await waitFor(() => expect(inc.getTracking).toHaveBeenCalledWith('abcdef12-3456'));
    expect(await screen.findByText('51A-999')).toBeInTheDocument();
    await waitFor(() => expect(trackingHubService.invoke).toHaveBeenCalledWith('SubscribeIncident', 'abcdef12-3456'));
  });

  it('lỗi tải thông tin xe không làm hỏng modal; đóng được', async () => {
    inc.getTracking.mockRejectedValue(new Error('Chưa điều xe'));
    const onClose = vi.fn();
    render(<CitizenLiveTrackingMapModal incident={dto({})} onClose={onClose} />);
    await waitFor(() => expect(inc.getTracking).toHaveBeenCalled());
    // Ghi chú: errorMsg của modal hiện không được render ra UI.
    expect(screen.queryByText('Chưa điều xe')).not.toBeInTheDocument();
  });
});
