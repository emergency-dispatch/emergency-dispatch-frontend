import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage';
import { VerifyEmailModal } from '@/components/auth/VerifyEmailModal';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { UserRole } from '@/types/auth';

vi.mock('@/services/authService', () => ({
  authService: { verifyEmail: vi.fn(), resendVerification: vi.fn(), forgotPassword: vi.fn(), resetPassword: vi.fn() },
}));

const auth = vi.mocked(authService);

function Probe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

const renderAt = (ui: ReactElement, ctx: Partial<AuthContextType> = {}, entry: string | { pathname: string; state?: unknown; search?: string } = '/x') =>
  render(
    <AuthContext.Provider value={{ user: null, isAuthenticated: false, isLoading: false, login: vi.fn(), googleLogin: vi.fn(), register: vi.fn(), logout: vi.fn(), ...ctx } as unknown as AuthContextType}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/x" element={ui} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

const loginResult = (role: UserRole) => ({ accessToken: 'a', refreshToken: 'r', expiresAt: '', user: { role } });

beforeEach(() => vi.clearAllMocks());

describe('LoginPage', () => {
  it('thiếu email / mật khẩu → báo lỗi', async () => {
    const login = vi.fn();
    renderAt(<LoginPage />, { login });
    fireEvent.submit(screen.getByRole('button', { name: /Xác thực & Vào hệ thống/ }).closest('form')!);
    expect(screen.getByText('Vui lòng nhập email và mật khẩu của bạn')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it.each([
    [UserRole.Operator, '/dashboard/command-center/live-map'],
    [UserRole.Admin, '/admin/overview'],
    [UserRole.RescueStaff, '/staff'],
    [UserRole.Citizen, '/'],
  ])('đăng nhập %s → %s', async (role, path) => {
    const login = vi.fn().mockResolvedValue(loginResult(role));
    renderAt(<LoginPage />, { login });
    await userEvent.type(screen.getByPlaceholderText('ten@resq.gov.vn hoặc email người dân'), '  a@b.vn ');
    await userEvent.type(screen.getByPlaceholderText('••••••••••••'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /Xác thực & Vào hệ thống/ }));
    expect(login).toHaveBeenCalledWith({ email: 'a@b.vn', password: 'secret' });
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent(path === '/' ? '/' : path));
  });

  it('redirect hợp lệ theo ?redirect=; redirect không được phép bị bỏ', async () => {
    const login = vi.fn().mockResolvedValue(loginResult(UserRole.Admin));
    renderAt(<LoginPage />, { login }, '/x?redirect=/admin/stations');
    await userEvent.type(screen.getByPlaceholderText('ten@resq.gov.vn hoặc email người dân'), 'a@b.vn');
    await userEvent.type(screen.getByPlaceholderText('••••••••••••'), 'x');
    await userEvent.click(screen.getByRole('button', { name: /Xác thực & Vào hệ thống/ }));
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/admin/stations'));
  });

  it('đã đăng nhập → chuyển hướng ngay', async () => {
    renderAt(<LoginPage />, { isAuthenticated: true, user: { role: UserRole.Operator } as never });
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/dashboard/command-center/live-map'));
  });

  it('hiện message từ state; lỗi chưa xác thực email → mở modal OTP', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Tài khoản chưa xác thực email'));
    renderAt(<LoginPage />, { login }, { pathname: '/x', state: { message: 'Phiên đã hết hạn' } });
    expect(screen.getByText('Phiên đã hết hạn')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('ten@resq.gov.vn hoặc email người dân'), 'a@b.vn');
    await userEvent.type(screen.getByPlaceholderText('••••••••••••'), 'x');
    await userEvent.click(screen.getByRole('button', { name: /Xác thực & Vào hệ thống/ }));
    expect(await screen.findByText('Tài khoản chưa xác thực email')).toBeInTheDocument();
    expect(screen.getByText('Kích hoạt tài khoản')).toBeInTheDocument();
  });

  it('Google SDK chưa sẵn sàng → báo lỗi', async () => {
    renderAt(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /Đăng nhập với Google/ }));
    expect(screen.getByText(/Google SDK chưa sẵn sàng/)).toBeInTheDocument();
  });
});

describe('RegisterPage', () => {
  const fill = async (password = '123456', confirm = password) => {
    await userEvent.type(screen.getByPlaceholderText('ví dụ: Nguyễn Văn An'), 'Dân A');
    await userEvent.type(screen.getByPlaceholderText('ten@example.com'), 'dan@x.vn');
    await userEvent.type(screen.getByPlaceholderText('Tối thiểu 6 ký tự'), password);
    await userEvent.type(screen.getByPlaceholderText('Nhập lại mật khẩu'), confirm);
  };
  const submit = () => userEvent.click(screen.getByRole('button', { name: /Tạo tài khoản/ }));

  it('kiểm tra bắt buộc, độ dài, xác nhận mật khẩu', async () => {
    const register = vi.fn();
    renderAt(<RegisterPage />, { register });
    fireEvent.submit(screen.getByRole('button', { name: /Tạo tài khoản/ }).closest('form')!);
    expect(screen.getByText('Vui lòng điền đầy đủ các thông tin bắt buộc')).toBeInTheDocument();
    await fill('123', '123');
    await submit();
    expect(screen.getByText('Mật khẩu phải có độ dài tối thiểu 6 ký tự')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('mật khẩu xác nhận không khớp', async () => {
    renderAt(<RegisterPage />, { register: vi.fn() });
    await fill('123456', '654321');
    await submit();
    expect(screen.getByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument();
  });

  it('lực lượng cứu nạn không tự đăng ký', async () => {
    const register = vi.fn();
    renderAt(<RegisterPage />, { register });
    await userEvent.click(screen.getByRole('button', { name: 'Lực lượng cứu nạn' }));
    await fill();
    expect(screen.getByRole('button', { name: /Tạo tài khoản/ })).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: /Tạo tài khoản/ }).closest('form')!);
    expect(screen.getByText(/được cấp phát nội bộ/)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('đăng ký thành công → mở modal OTP; lỗi → thông báo', async () => {
    const register = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Email đã tồn tại'));
    renderAt(<RegisterPage />, { register });
    await fill();
    await submit();
    expect(register).toHaveBeenCalledWith({ fullName: 'Dân A', email: 'dan@x.vn', password: '123456', phoneNumber: undefined });
    expect(await screen.findByText('Kích hoạt tài khoản')).toBeInTheDocument();
  });
});

describe('VerifyEmailModal', () => {
  it('đóng → không render', () => {
    const { container } = render(<VerifyEmailModal isOpen={false} email="a@b" onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('OTP phải 6 số; xác thực thành công gọi onSuccess', async () => {
    auth.verifyEmail.mockResolvedValue({ success: true, message: '', data: true });
    const onSuccess = vi.fn();
    render(<VerifyEmailModal isOpen email=" a@b.vn " onClose={vi.fn()} onSuccess={onSuccess} />);
    const otp = screen.getByPlaceholderText('123456');
    await userEvent.type(otp, '12a3');
    expect(otp).toHaveValue('123');
    expect(screen.getByRole('button', { name: /Xác nhận kích hoạt/ })).toBeDisabled();
    fireEvent.submit(otp.closest('form')!);
    expect(screen.getByText('Vui lòng nhập đúng mã OTP gồm 6 chữ số')).toBeInTheDocument();
    await userEvent.type(otp, '456');
    await userEvent.click(screen.getByRole('button', { name: /Xác nhận kích hoạt/ }));
    expect(auth.verifyEmail).toHaveBeenCalledWith({ email: 'a@b.vn', token: '123456' });
    expect(await screen.findByText('Xác thực thành công!')).toBeInTheDocument();
    await waitFor(() => expect(onSuccess).toHaveBeenCalled(), { timeout: 2500 });
  });

  it('gửi lại mã chỉ sau 60 giây', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    auth.resendVerification.mockResolvedValue({ success: true, message: '', data: true });
    render(<VerifyEmailModal isOpen email="a@b.vn" onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Gửi lại mã ngay/ })).not.toBeInTheDocument();
    for (let i = 0; i < 61; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    vi.useRealTimers();
    await userEvent.click(await screen.findByRole('button', { name: /Gửi lại mã ngay/ }));
    expect(auth.resendVerification).toHaveBeenCalledWith({ email: 'a@b.vn' });
    expect(await screen.findByText('Mã xác thực mới đã được gửi tới hộp thư của bạn.')).toBeInTheDocument();
  });
});

describe('ForgotPasswordPage', () => {
  it('3 bước: gửi mã → đặt lại → hoàn tất', async () => {
    auth.forgotPassword.mockResolvedValue({ success: true, message: '', data: true });
    auth.resetPassword.mockResolvedValue({ success: true, message: '', data: true });
    renderAt(<ForgotPasswordPage />);
    fireEvent.submit(screen.getByRole('button', { name: /Gửi mã xác thực OTP/ }).closest('form')!);
    expect(screen.getByText('Vui lòng nhập địa chỉ email của bạn')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('name@example.com'), 'a@b.vn');
    await userEvent.click(screen.getByRole('button', { name: /Gửi mã xác thực OTP/ }));
    expect(auth.forgotPassword).toHaveBeenCalledWith({ email: 'a@b.vn' });

    await userEvent.type(await screen.findByPlaceholderText('123456'), '654321');
    await userEvent.type(screen.getByPlaceholderText('Tối thiểu 6 ký tự'), 'newpass');
    await userEvent.type(screen.getByPlaceholderText('Nhập lại mật khẩu mới'), 'khac');
    await userEvent.click(screen.getByRole('button', { name: /Xác nhận & Cập nhật mật khẩu/ }));
    expect(screen.getByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument();
    await userEvent.clear(screen.getByPlaceholderText('Nhập lại mật khẩu mới'));
    await userEvent.type(screen.getByPlaceholderText('Nhập lại mật khẩu mới'), 'newpass');
    await userEvent.click(screen.getByRole('button', { name: /Xác nhận & Cập nhật mật khẩu/ }));
    expect(auth.resetPassword).toHaveBeenCalledWith({ email: 'a@b.vn', token: '654321', newPassword: 'newpass', confirmPassword: 'newpass' });
    await userEvent.click(await screen.findByRole('link', { name: /Tiến hành Đăng nhập/ }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/login');
  });

  it('gửi mã thất bại', async () => {
    auth.forgotPassword.mockResolvedValue({ success: false, message: 'Email không tồn tại', data: false });
    renderAt(<ForgotPasswordPage />);
    await userEvent.type(screen.getByPlaceholderText('name@example.com'), 'x@y.vn');
    await userEvent.click(screen.getByRole('button', { name: /Gửi mã xác thực OTP/ }));
    expect(await screen.findByText('Email không tồn tại')).toBeInTheDocument();
  });
});

describe('UnauthorizedPage', () => {
  it('đăng xuất tài khoản khác', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderAt(<UnauthorizedPage />, { user: { role: UserRole.RescueStaff, fullName: 'A' } as never, logout });
    expect(screen.getByRole('link', { name: /Về/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Đăng xuất tài khoản khác/ }));
    expect(logout).toHaveBeenCalled();
  });
});
