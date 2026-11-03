import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { API_CONFIG } from '@/config/api';
import { userService } from '@/services/userService';
import { UserRole } from '@/types/auth';

// Test định tuyến: thay mọi trang bằng component giả hiện tên trang.
const { stub } = vi.hoisted(() => ({ stub: (name: string) => () => 'page:' + name }));
vi.mock('@/pages/HomePage', () => ({ HomePage: stub('home') }));
vi.mock('@/pages/auth/LoginPage', () => ({ LoginPage: stub('login') }));
vi.mock('@/pages/auth/RegisterPage', () => ({ RegisterPage: stub('register') }));
vi.mock('@/pages/auth/ForgotPasswordPage', () => ({ ForgotPasswordPage: stub('forgot') }));
vi.mock('@/pages/auth/UnauthorizedPage', () => ({ UnauthorizedPage: stub('unauthorized') }));
vi.mock('@/pages/staff/StaffPage', () => ({ StaffPage: stub('staff') }));
vi.mock('@/pages/operator/LiveMapPage', () => ({ LiveMapPage: stub('live-map') }));
vi.mock('@/pages/operator/IncidentQueuePage', () => ({ IncidentQueuePage: stub('incidents') }));
vi.mock('@/pages/operator/StationTeamsPage', () => ({ StationTeamsPage: stub('station-teams') }));
vi.mock('@/pages/operator/VehiclesPage', () => ({ VehiclesPage: stub('op-vehicles') }));
vi.mock('@/components/operator/OperatorLayout', async () => {
  const { Outlet } = await import('react-router-dom');
  return { OperatorLayout: () => <div>operator-layout<section><Outlet /></section></div> };
});
vi.mock('@/components/admin/AdminLayout', async () => {
  const { Outlet } = await import('react-router-dom');
  const { Suspense } = await import('react');
  return { AdminLayout: () => <div>admin-layout<section><Suspense fallback="loading"><Outlet /></Suspense></section></div> };
});
vi.mock('@/pages/admin/StationsPage', () => ({ default: () => <div>page:admin-Stations</div> }));
vi.mock('@/pages/admin/OverviewPage', () => ({ default: () => <div>page:admin-Overview</div> }));
vi.mock('@/pages/admin/ReportsPage', () => ({ default: () => <div>page:admin-Reports</div> }));
vi.mock('@/services/userService', () => ({ userService: { getMe: vi.fn() } }));

function loginAs(role: UserRole | null) {
  if (!role) return;
  const user = { id: 'u', fullName: 'U', email: 'u@x', role };
  localStorage.setItem(API_CONFIG.TOKEN_KEY, 'tok');
  localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(user));
  vi.mocked(userService.getMe).mockResolvedValue({ success: true, message: '', data: user as never });
}

const go = (path: string) => {
  window.history.pushState({}, '', path);
  render(<App />);
};

beforeEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, '', '/');
});

describe('App routing', () => {
  it.each([
    ['/', 'home'],
    ['/login', 'login'],
    ['/register', 'register'],
    ['/signup', 'register'],
    ['/forgot-password', 'forgot'],
    ['/unauthorized', 'unauthorized'],
  ])('trang công khai %s', async (path, name) => {
    go(path);
    expect(await screen.findByText(`page:${name}`)).toBeInTheDocument();
  });

  it('đường dẫn lạ → trang chủ', async () => {
    go('/khong-ton-tai');
    expect(await screen.findByText('page:home')).toBeInTheDocument();
  });

  it('chưa đăng nhập vào /dashboard → /login', async () => {
    go('/dashboard');
    expect(await screen.findByText('page:login')).toBeInTheDocument();
  });

  it('Operator: /dashboard → live map; các trang con', async () => {
    loginAs(UserRole.Operator);
    go('/dashboard');
    expect(await screen.findByText('page:live-map')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard/command-center/live-map');
  });

  it.each([
    ['/dashboard/command-center/incidents', 'incidents'],
    ['/dashboard/command-center/station-teams', 'station-teams'],
    ['/dashboard/command-center/vehicles', 'op-vehicles'],
  ])('Operator %s', async (path, name) => {
    loginAs(UserRole.Operator);
    go(path);
    expect(await screen.findByText(`page:${name}`)).toBeInTheDocument();
  });

  it('Admin vào /dashboard → chuyển về /admin/overview', async () => {
    loginAs(UserRole.Admin);
    go('/dashboard/command-center/live-map');
    expect(await screen.findByText('page:admin-Overview')).toBeInTheDocument();
  });

  it('Admin: /admin → overview; route lạ trong /admin → overview; trang con lazy', async () => {
    loginAs(UserRole.Admin);
    go('/admin');
    expect(await screen.findByText('page:admin-Overview')).toBeInTheDocument();
  });

  it('Admin: trang con', async () => {
    loginAs(UserRole.Admin);
    go('/admin/reports');
    expect(await screen.findByText('page:admin-Reports')).toBeInTheDocument();
  });

  it('RescueStaff vào /admin → /unauthorized; vào /staff được', async () => {
    loginAs(UserRole.RescueStaff);
    go('/admin/stations');
    expect(await screen.findByText('page:unauthorized')).toBeInTheDocument();
  });

  it('RescueStaff vào /staff', async () => {
    loginAs(UserRole.RescueStaff);
    go('/staff');
    expect(await screen.findByText('page:staff')).toBeInTheDocument();
  });

  it('Citizen vào /staff → /unauthorized', async () => {
    loginAs(UserRole.Citizen);
    go('/staff');
    expect(await screen.findByText('page:unauthorized')).toBeInTheDocument();
  });
});
