import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { OperatorTopbar } from '@/components/operator/OperatorTopbar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useNotifications } from '@/hooks/useNotifications';
import { incidentHubService } from '@/services/realtime/incidentHubService';
import { makeDispatchStore, mockStore } from '../setup/dispatchStore';
import { makeIncident } from '../setup/fixtures';
import { t } from '../setup/render';

vi.mock('@/context/DispatchContext', () => ({ useDispatchStore: () => mockStore.current }));
vi.mock('@/hooks/useNotifications', () => ({ useNotifications: vi.fn() }));
vi.mock('@/components/profile/UserProfileModal', () => ({
  UserProfileModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog">profile-modal</div> : null),
}));

const logout = vi.fn().mockResolvedValue(undefined);
const auth = (user: Partial<AuthContextType['user']> = {}) =>
  ({ user: { id: 'op1', fullName: 'Nguyễn Văn Lan', email: 'lan@resq.vn', role: 'Operator', stationName: 'Trạm Thủ Đức', ...user }, logout }) as unknown as AuthContextType;

function Probe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname + loc.search + JSON.stringify(loc.state ?? null)}</div>;
}

const renderWith = (ui: ReactElement, path = '/dashboard/command-center/live-map', value = auth()) =>
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        {ui}
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

const notifications = {
  items: [
    { id: 'n1', type: 'Escalation', title: 'Leo thang', message: 'Ca cháy', incidentId: 'i1', dataJson: null, isRead: false, readAt: null, createdAt: new Date().toISOString() },
    { id: 'n2', type: 'System', title: 'Hệ thống', message: 'Bảo trì', incidentId: null, dataJson: null, isRead: true, readAt: null, createdAt: '2026-01-01T00:00:00Z' },
  ],
  unreadCount: 1,
  loading: false,
  error: null,
  markRead: vi.fn(),
  markAllRead: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockStore.current = makeDispatchStore({ incidents: [makeIncident({ id: 'i1', status: 'approved' })] });
  vi.mocked(useNotifications).mockReturnValue(notifications as never);
  vi.spyOn(incidentHubService, 'getStatus').mockReturnValue('connected');
});

describe('OperatorTopbar', () => {
  it('trạm, trạng thái kết nối, tên viết tắt', () => {
    renderWith(<OperatorTopbar />);
    expect(screen.getByText('Trạm Thủ Đức')).toBeInTheDocument();
    expect(screen.getByText(t('layout.hubStatus.connected.label'))).toBeInTheDocument();
    expect(screen.getByText('VL')).toBeInTheDocument();
  });

  it('nút tạo sự cố → Live Map ?create=1', async () => {
    renderWith(<OperatorTopbar />);
    await userEvent.click(screen.getByTitle(t('layout.topbar.createIncidentHint')));
    expect(screen.getByTestId('loc')).toHaveTextContent('/dashboard/command-center/live-map?create=1');
  });

  it('chuông thông báo: số chưa đọc, đánh dấu đã đọc, mở sự cố', async () => {
    renderWith(<OperatorTopbar />);
    await userEvent.click(screen.getByRole('button', { name: t('layout.topbar.notifications') }));
    expect(screen.getByText(t('layout.topbar.unreadSuffix', { count: 1 }).trim(), { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByText(t('layout.topbar.markAllRead')));
    expect(notifications.markAllRead).toHaveBeenCalled();
    await userEvent.click(screen.getByText('Leo thang'));
    expect(notifications.markRead).toHaveBeenCalledWith('n1');
    expect(screen.getByTestId('loc')).toHaveTextContent('{"focusIncidentId":"i1"}');
  });

  it('thông báo trống / đang tải; chuông nhấp nháy khi có leo thang', async () => {
    vi.mocked(useNotifications).mockReturnValue({ ...notifications, items: [], unreadCount: 0 } as never);
    mockStore.current = makeDispatchStore({ escalatedIncidentIds: new Set(['x']) });
    renderWith(<OperatorTopbar />);
    const bell = screen.getByRole('button', { name: t('layout.topbar.notifications') });
    expect(bell).toHaveClass('animate-flash-critical');
    await userEvent.click(bell);
    expect(screen.getByText(t('layout.topbar.noNotifications'))).toBeInTheDocument();
    expect(screen.getByText(t('layout.topbar.escalatingBanner', { count: 1 }))).toBeInTheDocument();
  });

  it('đổi ngôn ngữ', async () => {
    renderWith(<OperatorTopbar />);
    const group = screen.getByRole('group', { name: t('layout.topbar.language') });
    await userEvent.click(within(group).getByRole('button', { name: 'EN' }));
    expect(i18n.language).toBe('en');
    expect(within(group).getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('menu người dùng: hồ sơ, đăng xuất', async () => {
    renderWith(<OperatorTopbar />);
    await userEvent.click(screen.getByText('Nguyễn Văn Lan'));
    await userEvent.click(screen.getByText(t('layout.topbar.profile')));
    expect(screen.getByRole('dialog')).toHaveTextContent('profile-modal');
    await userEvent.click(screen.getByText('Nguyễn Văn Lan'));
    await userEvent.click(screen.getByText(t('layout.topbar.logout')));
    expect(logout).toHaveBeenCalledWith('/login');
  });
});

describe('Admin layout', () => {
  const adminAuth = auth({ fullName: 'Quản Trị', role: 'Admin' as never, email: 'admin@resq.vn' });

  it('AdminTopbar: tiêu đề theo trang, menu, đăng xuất', async () => {
    const onOpenMenu = vi.fn();
    renderWith(<AdminTopbar onOpenMenu={onOpenMenu} />, '/admin/stations', adminAuth);
    expect(screen.getByRole('heading', { name: t('admin.layout.nav.stations') })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('admin.layout.openMenu') }));
    expect(onOpenMenu).toHaveBeenCalled();
    await userEvent.click(screen.getByText('Quản Trị'));
    expect(screen.getByText('admin@resq.vn')).toBeInTheDocument();
    await userEvent.click(screen.getByText(t('admin.layout.profile')));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Quản Trị'));
    await userEvent.click(screen.getByText(t('layout.topbar.logout')));
    expect(logout).toHaveBeenCalledWith('/login');
  });

  it('AdminSidebar: nhóm điều hướng, mục đang mở, thu gọn', async () => {
    const onToggle = vi.fn();
    renderWith(<AdminSidebar collapsed={false} onToggle={onToggle} />, '/admin/vehicles', adminAuth);
    const active = screen.getByRole('link', { name: t('admin.layout.nav.vehicles') });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('link')).toHaveLength(11);
    await userEvent.click(screen.getByRole('button', { name: t('admin.layout.collapseSidebar') }));
    expect(onToggle).toHaveBeenCalled();
  });

  it('AdminSidebar (menu trượt): nút đóng', async () => {
    const onClose = vi.fn();
    renderWith(<AdminSidebar collapsed={false} onClose={onClose} />, '/admin/overview', adminAuth);
    await userEvent.click(screen.getByRole('button', { name: t('admin.layout.closeMenu') }));
    expect(onClose).toHaveBeenCalled();
  });

  it('AdminLayout: mở menu trượt, Esc để đóng, hiện trang con', async () => {
    render(
      <AuthContext.Provider value={adminAuth}>
        <MemoryRouter initialEntries={['/admin/overview']}>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="overview" element={<div>trang tổng quan</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByText('trang tổng quan')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t('admin.layout.openMenu') }));
    expect(screen.getByRole('button', { name: t('admin.layout.closeMenu') })).toBeInTheDocument();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(screen.queryByRole('button', { name: t('admin.layout.closeMenu') })).not.toBeInTheDocument();
  });
});
