import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffPage, getSavedClosureReports, isGuid, saveClosureReportLocally } from '@/pages/staff/StaffPage';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { dispatchService } from '@/services/dispatchService';
import { userService } from '@/services/userService';
import { routingService } from '@/services/routingService';
import { staffAudioService } from '@/services/staffAudioService';
import { incidentHubService } from '@/services/realtime/incidentHubService';
import { UserRole } from '@/types/auth';
import type { DispatchAssignmentResponseDto } from '@/types/dispatch';

vi.mock('@/services/dispatchService', () => ({
  dispatchService: { getMyAssignments: vi.fn(), updateAssignmentStatus: vi.fn(), rejectAssignment: vi.fn(), resolveAssignment: vi.fn() },
}));
vi.mock('@/services/userService', () => ({ userService: { getMe: vi.fn(), getMyTeam: vi.fn() } }));
vi.mock('@/services/staffAudioService', () => ({
  staffAudioService: { playEmergencySiren: vi.fn(), stopEmergencySiren: vi.fn(), playSuccessChime: vi.fn(), playPriorityBeep: vi.fn(), setMuted: vi.fn(), getIsMuted: () => false },
}));

const disp = vi.mocked(dispatchService);
const GUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

const assignment = (o: Partial<DispatchAssignmentResponseDto> = {}): DispatchAssignmentResponseDto => ({
  id: GUID,
  incidentId: 'inc-1',
  incidentTitle: 'Cháy nhà xưởng',
  incidentAddress: 'Lô E2a, Khu CNC',
  incidentLat: 10.85,
  incidentLng: 106.81,
  incidentSeverity: 'Level3',
  rescueUnitId: 'u1',
  rescueUnit: { plateNumber: '51A-999', currentLat: 10.84, currentLng: 106.8 } as never,
  dispatchedAt: '2026-10-01T03:00:00Z',
  status: 'Dispatched',
  ...o,
});

const renderPage = () =>
  render(
    <AuthContext.Provider value={{ user: { id: 's1', fullName: 'Cứu Hộ A', role: UserRole.RescueStaff }, logout: vi.fn(), updateProfile: vi.fn(), refreshProfile: vi.fn().mockResolvedValue(null) } as unknown as AuthContextType}>
      <MemoryRouter>
        <StaffPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(incidentHubService, 'start').mockResolvedValue(false);
  vi.spyOn(incidentHubService, 'onJobAssigned').mockReturnValue(() => {});
  vi.spyOn(incidentHubService, 'onAssignmentStatus').mockReturnValue(() => {});
  vi.spyOn(routingService, 'calculateDrivingRoute').mockImplementation(async (o, d) => routingService.createFallbackRoute(o, d));
  vi.mocked(userService.getMe).mockResolvedValue({ success: false, message: '', data: null as never });
  vi.mocked(userService.getMyTeam).mockResolvedValue({ success: false, message: '', data: null as never });
  disp.updateAssignmentStatus.mockResolvedValue({ success: true, message: '', data: assignment({ status: 'Accepted' }) } as never);
  disp.rejectAssignment.mockResolvedValue({ success: true, message: '', data: assignment({ status: 'Rejected' }) } as never);
});

describe('StaffPage helpers', () => {
  it('isGuid', () => {
    expect(isGuid('3fa85f64-5717-4562-b3fc-2c963f66afa6')).toBe(true);
    expect(isGuid('abc')).toBe(false);
    expect(isGuid(undefined)).toBe(false);
  });

  it('lưu / đọc báo cáo nghiệm thu cục bộ theo missionId và incidentId', () => {
    expect(getSavedClosureReports()).toEqual({});
    saveClosureReportLocally({ missionId: 'm1', incidentId: 'i1', actionSummary: 'Xong' } as never);
    const saved = getSavedClosureReports();
    expect(saved.m1.actionSummary).toBe('Xong');
    expect(saved.i1).toEqual(saved.m1);
    localStorage.setItem('resq_staff_closure_reports', '{bad');
    expect(getSavedClosureReports()).toEqual({});
  });
});

describe('StaffPage', () => {
  it('không có nhiệm vụ → chế độ túc trực', async () => {
    disp.getMyAssignments.mockResolvedValue({ success: true, message: '', data: [] } as never);
    renderPage();
    await waitFor(() => expect(disp.getMyAssignments).toHaveBeenCalled());
    expect(incidentHubService.start).toHaveBeenCalled();
    expect(screen.queryByText('Tiếp Nhận Nhiệm Vụ Ngay')).not.toBeInTheDocument();
  });

  it('lỗi đồng bộ nhiệm vụ không làm hỏng trang (vẫn ở chế độ túc trực)', async () => {
    disp.getMyAssignments.mockRejectedValue(new Error('offline'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderPage();
    await waitFor(() => expect(warn).toHaveBeenCalled());
    // Ghi chú: banner lỗi chỉ hiện trong nhánh có nhiệm vụ đang chạy; ở chế độ túc trực lỗi không hiển thị.
    expect(screen.queryByText(/Lỗi kết nối máy chủ CAD/)).not.toBeInTheDocument();
  });

  it('lệnh mới (Dispatched) → báo động + nhận nhiệm vụ', async () => {
    disp.getMyAssignments.mockResolvedValue({ success: true, message: '', data: [assignment()] } as never);
    renderPage();
    const accept = await screen.findByText('Tiếp Nhận Nhiệm Vụ Ngay');
    expect(staffAudioService.playEmergencySiren).toHaveBeenCalled();
    expect(screen.getAllByText('Cháy nhà xưởng').length).toBeGreaterThan(0);
    await userEvent.click(accept);
    expect(disp.updateAssignmentStatus).toHaveBeenCalledWith(GUID, expect.objectContaining({ status: 'Accepted' }));
  });

  it('từ chối lệnh: lý do khác cần ghi chú ≥ 5 ký tự', async () => {
    disp.getMyAssignments.mockResolvedValue({ success: true, message: '', data: [assignment()] } as never);
    renderPage();
    await userEvent.click(await screen.findByText('Từ Chối Lệnh (BR-22)'));
    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'Other');
    await userEvent.click(screen.getByText('Xác Nhận Từ Chối Lệnh'));
    expect(screen.getByText(/bắt buộc nhập ghi chú tối thiểu 5 ký tự/)).toBeInTheDocument();
    expect(disp.rejectAssignment).not.toHaveBeenCalled();
    await userEvent.type(screen.getByPlaceholderText(/Ghi rõ chi tiết lý do/), 'Xe đang thay lốp');
    await userEvent.click(screen.getByText('Xác Nhận Từ Chối Lệnh'));
    await waitFor(() => expect(disp.rejectAssignment).toHaveBeenCalledWith(GUID, expect.objectContaining({ reason: 'Other', notes: 'Xe đang thay lốp' })));
  });

  it('chuyển tab sidebar', async () => {
    disp.getMyAssignments.mockResolvedValue({ success: true, message: '', data: [] } as never);
    renderPage();
    await waitFor(() => expect(disp.getMyAssignments).toHaveBeenCalled());
    for (const label of ['Tổ Làm Việc & Trạm', 'Báo Cáo & Hiện Trường', 'Quản Lý Ca Trực', 'Kiểm Tra Phương Tiện', 'Hồ Sơ Cán Bộ']) {
      const buttons = screen.getAllByText(label);
      await userEvent.click(buttons[0]);
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    await waitFor(() => expect(userService.getMyTeam).toHaveBeenCalled());
  });

  it('nhiệm vụ đang chạy (EnRoute) → giao diện tác chiến, không báo động', async () => {
    disp.getMyAssignments.mockResolvedValue({ success: true, message: '', data: [assignment({ status: 'EnRoute', acceptedAt: '2026-10-01T03:01:00Z' })] } as never);
    renderPage();
    expect((await screen.findAllByText('Cháy nhà xưởng')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Tiếp Nhận Nhiệm Vụ Ngay')).not.toBeInTheDocument();
    expect(within(document.body).getAllByText(/51A-999/).length).toBeGreaterThan(0);
  });
});
