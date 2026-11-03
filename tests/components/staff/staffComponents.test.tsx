import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffStatusStepper } from '@/components/staff/StaffStatusStepper';
import { StaffTurnByTurnGuide } from '@/components/staff/StaffTurnByTurnGuide';
import { StaffQuickActionPanel } from '@/components/staff/StaffQuickActionPanel';
import { StaffMissionHistoryModal } from '@/components/staff/StaffMissionHistoryModal';
import { StaffQrHandover } from '@/components/staff/StaffQrHandover';
import { StaffSignaturePad } from '@/components/staff/StaffSignaturePad';
import { StaffClosureReportModal } from '@/components/staff/StaffClosureReportModal';
import { StaffNavbar } from '@/components/staff/StaffNavbar';
import { StaffSidebar } from '@/components/staff/StaffSidebar';
import { StaffStandbyView } from '@/components/staff/StaffStandbyView';
import { StaffNavigationMap } from '@/components/staff/StaffNavigationMap';
import { StaffMissionAlertModal } from '@/components/staff/StaffMissionAlertModal';
import { StaffScheduleView } from '@/components/staff/schedule/StaffScheduleView';
import { ShiftRegisterModal } from '@/components/staff/schedule/ShiftRegisterModal';
import { ShiftLeaveModal } from '@/components/staff/schedule/ShiftLeaveModal';
import { ShiftDetailDrawer } from '@/components/staff/schedule/ShiftDetailDrawer';
import { StaffReportsView } from '@/components/staff/reports/StaffReportsView';
import { StaffEquipmentView } from '@/components/staff/equipment/StaffEquipmentView';
import { StaffProfileView } from '@/components/staff/profile/StaffProfileView';
import { StaffTeamView } from '@/components/staff/team/StaffTeamView';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { userService } from '@/services/userService';
import { initialStaffMission, mockRouteSteps, mockShiftSchedules, mockStaffProfile } from '@/data/staffMock';
import type { StaffMission } from '@/types/staff';

vi.mock('@/services/userService', () => ({ userService: { getMe: vi.fn(), getMyTeam: vi.fn() } }));
vi.mock('@/services/staffAudioService', () => ({
  staffAudioService: { playEmergencySiren: vi.fn(), stopEmergencySiren: vi.fn(), playSuccessChime: vi.fn(), playPriorityBeep: vi.fn(), setMuted: vi.fn(), getIsMuted: () => false },
}));

const mission = (o: Partial<StaffMission> = {}): StaffMission => ({ ...initialStaffMission, routeSteps: mockRouteSteps, ...o });

const wrap = (ui: ReactElement) =>
  render(
    <AuthContext.Provider value={{ user: { id: 's', fullName: 'Cứu Hộ A', role: 'RescueStaff' }, logout: vi.fn(), updateProfile: vi.fn(), refreshProfile: vi.fn() } as unknown as AuthContextType}>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(userService.getMe).mockResolvedValue({ success: false, message: '', data: null as never });
  vi.mocked(userService.getMyTeam).mockResolvedValue({ success: false, message: 'Chưa có tổ', data: null as never });
  // jsdom không có canvas 2D.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
});

describe('StaffStatusStepper', () => {
  it('accepted → bấm xuất phát chuyển en_route', async () => {
    const onStatusChange = vi.fn();
    wrap(<StaffStatusStepper mission={mission({ status: 'accepted' })} onStatusChange={onStatusChange} onOpenReportModal={vi.fn()} />);
    await userEvent.click(screen.getByText('XUẤT PHÁT TỚI HIỆN TRƯỜNG (EN ROUTE)'));
    expect(onStatusChange).toHaveBeenCalledWith('en_route');
  });

  it('on_scene → mở báo cáo nghiệm thu', async () => {
    const onOpenReportModal = vi.fn();
    wrap(<StaffStatusStepper mission={mission({ status: 'on_scene' })} onStatusChange={vi.fn()} onOpenReportModal={onOpenReportModal} />);
    await userEvent.click(screen.getByText('HOÀN TẤT XỬ LÝ & LẬP BÁO CÁO (COMPLETED)'));
    expect(onOpenReportModal).toHaveBeenCalled();
  });
});

describe('StaffTurnByTurnGuide', () => {
  it('nút trước bị khóa ở bước đầu; bước sau gọi onNextStep', async () => {
    const onNextStep = vi.fn();
    const { container } = wrap(<StaffTurnByTurnGuide steps={mockRouteSteps} currentStepIndex={0} onNextStep={onNextStep} onPrevStep={vi.fn()} isEnRoute />);
    const [prev, next] = [...container.querySelectorAll('button')].filter((b) => b.className.includes('p-1.5'));
    expect(prev).toBeDisabled();
    await userEvent.click(next);
    expect(onNextStep).toHaveBeenCalled();
    expect(screen.getAllByText(mockRouteSteps[0].instruction).length).toBeGreaterThan(0);
  });
});

describe('StaffClosureReportModal', () => {
  it('chưa có ảnh và tóm tắt ngắn → báo lỗi, không nộp', () => {
    const onSubmitReport = vi.fn();
    wrap(<StaffClosureReportModal mission={mission({ status: 'on_scene' })} isOpen onClose={vi.fn()} onSubmitReport={onSubmitReport} />);
    fireEvent.submit(document.getElementById('closure-form')!);
    expect(screen.getAllByText(/ít nhất 1 ảnh hiện trường/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/tối thiểu 10 ký tự/).length).toBeGreaterThan(0);
    expect(onSubmitReport).not.toHaveBeenCalled();
  });

  it('đóng → không render', () => {
    wrap(<StaffClosureReportModal mission={mission()} isOpen={false} onClose={vi.fn()} onSubmitReport={vi.fn()} />);
    expect(document.getElementById('closure-form')).toBeNull();
  });
});

describe('StaffMissionAlertModal', () => {
  it('đóng → không render; mở → hiện nhiệm vụ', () => {
    const { rerender } = wrap(<StaffMissionAlertModal mission={mission()} isOpen={false} onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.queryByText('Tiếp Nhận Nhiệm Vụ Ngay')).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <StaffMissionAlertModal mission={mission()} isOpen onAccept={vi.fn()} onDecline={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Tiếp Nhận Nhiệm Vụ Ngay')).toBeInTheDocument();
  });
});

describe('Staff – smoke render', () => {
  it.each([
    ['StaffQuickActionPanel', () => <StaffQuickActionPanel missionId="m1" {...({} as any)} />],
    ['StaffMissionHistoryModal', () => <StaffMissionHistoryModal isOpen onClose={vi.fn()} missions={[mission({ status: 'completed' })]} onSelectMission={vi.fn()} />],
    ['StaffQrHandover', () => <StaffQrHandover missionId="m1" incidentId="i1" onScanSuccess={vi.fn()} />],
    ['StaffSignaturePad', () => <StaffSignaturePad onSaveSignature={vi.fn()} />],
    ['StaffNavbar', () => <StaffNavbar profile={mockStaffProfile} hasActiveMission={false} onOpenHistory={vi.fn()} {...({} as any)} />],
    ['StaffSidebar', () => <StaffSidebar activeTab="mission" onSelectTab={vi.fn()} collapsed={false} onToggleCollapse={vi.fn()} hasActiveMission={false} profile={mockStaffProfile} />],
    ['StaffStandbyView', () => <StaffStandbyView profile={mockStaffProfile} loading={false} onRefresh={vi.fn()} completedMissions={[]} />],
    ['StaffNavigationMap', () => <StaffNavigationMap mission={mission()} currentStepIndex={0} />],
        ['ShiftRegisterModal', () => <ShiftRegisterModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} {...({} as any)} />],
    ['ShiftLeaveModal', () => <ShiftLeaveModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} {...({} as any)} />],
    ['ShiftDetailDrawer', () => <ShiftDetailDrawer shift={mockShiftSchedules[0]} onClose={vi.fn()} onRequestSwap={vi.fn()} />],
    ['StaffReportsView', () => <StaffReportsView completedMissions={[mission({ status: 'completed' })]} onOpenNewReport={vi.fn()} />],
    ['StaffEquipmentView', () => <StaffEquipmentView {...({} as any)} />],
    ['StaffProfileView', () => <StaffProfileView profile={mockStaffProfile} {...({} as any)} />],
    ['StaffTeamView', () => <StaffTeamView {...({ profile: mockStaffProfile } as any)} />],
  ])('%s render không lỗi', (_name, make) => {
    const { container } = wrap(make());
    expect(container.ownerDocument.body.textContent!.length).toBeGreaterThan(0);
  });

  it('ScheduleView: báo chưa có API ca trực', () => {
    wrap(<StaffScheduleView />);
    expect(screen.getByText(/CHƯA CÓ API BACKEND/)).toBeInTheDocument();
  });

  it('StatusStepper en_route → on_scene', async () => {
    const onStatusChange = vi.fn();
    wrap(<StaffStatusStepper mission={mission({ status: 'en_route' })} onStatusChange={onStatusChange} onOpenReportModal={vi.fn()} />);
    await userEvent.click(screen.getByText('XÁC NHẬN ĐÃ TỚI HIỆN TRƯỜNG (ON SCENE)'));
    expect(onStatusChange).toHaveBeenCalledWith('on_scene');
  });
});

describe('Staff – component lịch ca (hiện chưa được trang nào dùng)', () => {
  it('render các view lịch ca với dữ liệu mẫu', async () => {
    const { ShiftListView } = await import('@/components/staff/schedule/ShiftListView');
    const { ShiftWeekCalendar } = await import('@/components/staff/schedule/ShiftWeekCalendar');
    const { ShiftMonthCalendar, SHIFT_TYPE_CONFIG } = await import('@/components/staff/schedule/ShiftMonthCalendar');
    const { ShiftRequestsManager } = await import('@/components/staff/schedule/ShiftRequestsManager');
    const { mockShiftLeaveRequests, mockShiftRegistrationRequests, mockShiftSwapRequests } = await import('@/data/staffMock');
    expect(Object.keys(SHIFT_TYPE_CONFIG).length).toBeGreaterThan(0);
    const onSelectShift = vi.fn();
    const first = new Date(mockShiftSchedules[0].date);
    wrap(
      <>
        <ShiftListView schedules={mockShiftSchedules} onSelectShift={onSelectShift} onRequestSwap={vi.fn()} onExportSchedule={vi.fn()} {...({} as any)} />
        <ShiftWeekCalendar currentWeekStart={first} onPrevWeek={vi.fn()} onNextWeek={vi.fn()} onCurrentWeek={vi.fn()} schedules={mockShiftSchedules} selectedDateStr={null} onSelectShift={onSelectShift} onRequestSwap={vi.fn()} onQuickRegisterDate={vi.fn()} filterShiftType="all" />
        <ShiftMonthCalendar currentDate={first} onPrevMonth={vi.fn()} onNextMonth={vi.fn()} onToday={vi.fn()} schedules={mockShiftSchedules} selectedDateStr={null} onSelectShift={onSelectShift} onQuickRegisterDate={vi.fn()} filterShiftType="all" />
        <ShiftRequestsManager
          registrationRequests={mockShiftRegistrationRequests}
          swapRequests={mockShiftSwapRequests}
          leaveRequests={mockShiftLeaveRequests}
          onCancelRegistration={vi.fn()}
          onCancelSwap={vi.fn()}
          onCancelLeave={vi.fn()}
          onOpenRegisterModal={vi.fn()}
          onOpenSwapModal={vi.fn()}
          onOpenLeaveModal={vi.fn()}
          {...({} as any)}
        />
      </>,
    );
    expect(document.body.textContent!.length).toBeGreaterThan(0);
  });

  it('LiveTelemetryBar render', async () => {
    const { LiveTelemetryBar } = await import('@/components/landing/LiveTelemetryBar');
    wrap(<LiveTelemetryBar {...({} as any)} />);
    expect(document.body.textContent!.length).toBeGreaterThan(0);
  });
});
