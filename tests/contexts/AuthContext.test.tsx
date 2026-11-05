import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, AuthProvider, type AuthContextType } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleRoute } from '@/routes/RoleRoute';
import { authService } from '@/services/authService';
import { userService } from '@/services/userService';
import { API_CONFIG } from '@/config/api';
import { UserRole } from '@/types/auth';

vi.mock('@/services/authService', () => ({
  authService: {
    login: vi.fn(),
    googleLogin: vi.fn(),
    register: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    logout: vi.fn(),
  },
}));
vi.mock('@/services/userService', () => ({ userService: { getMe: vi.fn(), updateProfile: vi.fn() } }));

const auth = vi.mocked(authService);
const users = vi.mocked(userService);
const me = { id: 'u1', fullName: 'An', email: 'a@b.vn', role: UserRole.Operator, isEmailVerified: false };
const session = { accessToken: 'at', refreshToken: 'rt', expiresAt: '', user: me };

function LocationProbe() {
  return <div data-testid="path">{useLocation().pathname}</div>;
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/start']}>
    <AuthProvider>
      {children}
      <LocationProbe />
    </AuthProvider>
  </MemoryRouter>
);

beforeEach(() => {
  vi.clearAllMocks();
  auth.logout.mockResolvedValue({ success: true, message: '', data: true });
});

describe('AuthProvider', () => {
  it('không có token → chưa đăng nhập, xóa cache user', async () => {
    localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(me));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(users.getMe).not.toHaveBeenCalled();
  });

  it('cache user lỗi JSON → null', async () => {
    localStorage.setItem(API_CONFIG.USER_KEY, '{bad');
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('có token → tải hồ sơ', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'at');
    users.getMe.mockResolvedValue({ success: true, message: '', data: { ...me, fullName: 'Mới' } as never });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user?.fullName).toBe('Mới');
    expect(result.current.isAuthenticated).toBe(true);
    expect(JSON.parse(localStorage.getItem(API_CONFIG.USER_KEY)!).fullName).toBe('Mới');
  });

  it('tải hồ sơ lỗi → xóa phiên', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'at');
    users.getMe.mockRejectedValue(new Error('401'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(API_CONFIG.TOKEN_KEY)).toBeNull();
  });

  it('refreshProfile trả null khi API success=false', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'at');
    users.getMe.mockResolvedValue({ success: false, message: '', data: null as never });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(result.current.refreshProfile()).resolves.toBeNull();
  });

  it('login lưu phiên', async () => {
    auth.login.mockResolvedValue({ success: true, message: '', data: session as never });
    users.getMe.mockResolvedValue({ success: true, message: '', data: me as never });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.login({ email: 'a@b.vn', password: 'x' }));
    expect(localStorage.getItem(API_CONFIG.TOKEN_KEY)).toBe('at');
    expect(localStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY)).toBe('rt');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it.each([
    ['login', 'Đăng nhập không thành công', (c: AuthContextType) => c.login({ email: '', password: '' })],
    ['googleLogin', 'Đăng nhập bằng Google không thành công', (c: AuthContextType) => c.googleLogin('t')],
    ['register', 'Đăng ký tài khoản không thành công', (c: AuthContextType) => c.register({ fullName: '', email: '', password: '' })],
    ['verifyEmail', 'Mã xác thực không hợp lệ', (c: AuthContextType) => c.verifyEmail({ email: '', token: '' })],
    ['resendVerification', 'Không thể gửi lại mã xác thực', (c: AuthContextType) => c.resendVerification('a')],
  ] as const)('%s thất bại → ném lỗi mặc định', async (method, message, call) => {
    (auth[method as keyof typeof auth] as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, message: '', data: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(call(result.current)).rejects.toThrow(message);
  });

  it('googleLogin thành công', async () => {
    auth.googleLogin.mockResolvedValue({ success: true, message: '', data: session as never });
    users.getMe.mockRejectedValue(new Error('tạm lỗi'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.googleLogin('id'));
    expect(auth.googleLogin).toHaveBeenCalledWith('id');
  });

  it('register chỉ lưu phiên khi có accessToken', async () => {
    auth.register.mockResolvedValue({ success: true, message: '', data: { ...session, accessToken: '' } as never });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.register({ fullName: 'A', email: 'a@b.vn', password: 'x' }));
    expect(localStorage.getItem(API_CONFIG.TOKEN_KEY)).toBeNull();

    auth.register.mockResolvedValue({ success: true, message: '', data: session as never });
    await act(() => result.current.register({ fullName: 'A', email: 'a@b.vn', password: 'x' }));
    expect(localStorage.getItem(API_CONFIG.TOKEN_KEY)).toBe('at');
  });

  it('verifyEmail đánh dấu isEmailVerified', async () => {
    auth.login.mockResolvedValue({ success: true, message: '', data: session as never });
    users.getMe.mockResolvedValue({ success: false, message: '', data: null as never });
    auth.verifyEmail.mockResolvedValue({ success: true, message: '', data: true });
    auth.resendVerification.mockResolvedValue({ success: true, message: '', data: true });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.login({ email: 'a', password: 'b' }));
    await act(() => result.current.verifyEmail({ email: 'a', token: '123' }));
    expect(result.current.user?.isEmailVerified).toBe(true);
    await expect(result.current.resendVerification('a')).resolves.toBe(true);
    expect(auth.resendVerification).toHaveBeenCalledWith({ email: 'a' });
  });

  it('updateProfile', async () => {
    users.updateProfile.mockResolvedValue({ success: true, message: '', data: { ...me, fullName: 'B' } as never });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.updateProfile({ fullName: 'B' }));
    expect(result.current.user?.fullName).toBe('B');
    users.updateProfile.mockResolvedValue({ success: false, message: 'Sai', data: null as never });
    await expect(result.current.updateProfile({ fullName: 'B' })).rejects.toThrow('Sai');
  });

  it('logout điều hướng, thu hồi token và xóa phiên (kể cả khi API lỗi)', async () => {
    localStorage.setItem(API_CONFIG.TOKEN_KEY, 'at');
    localStorage.setItem(API_CONFIG.REFRESH_TOKEN_KEY, 'rt');
    users.getMe.mockResolvedValue({ success: true, message: '', data: me as never });
    auth.logout.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    await act(() => result.current.logout('/bye'));
    expect(auth.logout).toHaveBeenCalledWith('rt');
    expect(screen.getByTestId('path')).toHaveTextContent('/bye');
    expect(result.current.user).toBeNull();
    expect(result.current.isLoggingOut).toBe(false);
    expect(localStorage.getItem(API_CONFIG.REFRESH_TOKEN_KEY)).toBeNull();
  });
});

describe('ProtectedRoute / RoleRoute', () => {
  const ctx = (o: Partial<AuthContextType> = {}): AuthContextType =>
    ({ user: null, isAuthenticated: false, isLoading: false, isLoggingOut: false, ...o }) as AuthContextType;

  const renderAt = (value: AuthContextType, element: ReactNode) =>
    render(
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={['/secret']}>
          <Routes>
            <Route path="/secret" element={element}>
              <Route index element={<div>outlet</div>} />
            </Route>
            <Route path="/login" element={<div>login page</div>} />
            <Route path="/unauthorized" element={<div>unauthorized page</div>} />
            <Route path="/staff" element={<div>staff page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

  it('ProtectedRoute: đang tải → spinner', () => {
    renderAt(ctx({ isLoading: true }), <ProtectedRoute />);
    expect(screen.getByText('Đang xác thực thông tin tài khoản...')).toBeInTheDocument();
  });

  it('ProtectedRoute: chưa đăng nhập → /login', () => {
    renderAt(ctx(), <ProtectedRoute />);
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('ProtectedRoute: đã đăng nhập → children hoặc Outlet', () => {
    renderAt(ctx({ isAuthenticated: true }), <ProtectedRoute />);
    expect(screen.getByText('outlet')).toBeInTheDocument();
    renderAt(ctx({ isAuthenticated: true }), <ProtectedRoute>child</ProtectedRoute>);
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('RoleRoute: trạng thái chờ', () => {
    renderAt(ctx({ isLoggingOut: true }), <RoleRoute allowedRoles={[UserRole.Admin]} />);
    expect(screen.getByText('Đang đăng xuất...')).toBeInTheDocument();
    renderAt(ctx({ isLoading: true }), <RoleRoute allowedRoles={[UserRole.Admin]} />);
    expect(screen.getByText('Kiểm tra quyền truy cập...')).toBeInTheDocument();
  });

  it('RoleRoute: chưa đăng nhập → /login', () => {
    renderAt(ctx({ isAuthenticated: true }), <RoleRoute allowedRoles={[UserRole.Admin]} />);
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('RoleRoute: đúng vai trò → Outlet', () => {
    renderAt(ctx({ isAuthenticated: true, user: { ...me, role: UserRole.Admin } as never }), <RoleRoute allowedRoles={[UserRole.Admin]} />);
    expect(screen.getByText('outlet')).toBeInTheDocument();
  });

  it('RoleRoute: sai vai trò → /unauthorized hoặc trang riêng của vai trò', () => {
    const user = { ...me, role: UserRole.RescueStaff } as never;
    renderAt(ctx({ isAuthenticated: true, user }), <RoleRoute allowedRoles={[UserRole.Admin]} />);
    expect(screen.getByText('unauthorized page')).toBeInTheDocument();
    renderAt(
      ctx({ isAuthenticated: true, user }),
      <RoleRoute allowedRoles={[UserRole.Admin]} redirectByRole={{ [UserRole.RescueStaff]: '/staff' }} />,
    );
    expect(screen.getByText('staff page')).toBeInTheDocument();
  });
});
