import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { GoogleButton } from '../../components/auth/GoogleButton';
import { VerifyEmailModal } from '../../components/auth/VerifyEmailModal';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/apiClient';
import { API_CONFIG } from '../../config/api';
import { UserRole } from '../../types/auth';
import { getDefaultRouteForRole, isRouteAllowedForRole } from '../../utils/routeUtils';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading: authLoading, login, googleLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Read message or redirect if passed from navigation
  const successRedirectMsg = (location.state as { message?: string })?.message;

  const handleRoleRedirect = (role: UserRole) => {
    const rawRedirect =
      (location.state as { from?: { pathname?: string } })?.from?.pathname ||
      new URLSearchParams(location.search).get('redirect') ||
      undefined;

    if (rawRedirect && isRouteAllowedForRole(rawRedirect, role)) {
      navigate(rawRedirect, { replace: true });
      return;
    }

    navigate(getDefaultRouteForRole(role), { replace: true });
  };

  // If already authenticated, redirect to appropriate role portal
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      handleRoleRedirect(user.role);
    }
  }, [authLoading, isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập email và mật khẩu của bạn');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    try {
      const authData = await login({
        email: email.trim(),
        password,
      });

      handleRoleRedirect(authData.user.role);
    } catch (err) {
      const message = getApiErrorMessage(err, 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      setErrorMsg(message);

      // Check if unverified email error
      if (message.toLowerCase().includes('xác thực') || message.toLowerCase().includes('verify')) {
        setShowVerifyModal(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const authData = await googleLogin(credential);
      handleRoleRedirect(authData.user.role);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Đăng nhập Google thất bại.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setErrorMsg('');
    const clientId = API_CONFIG.GOOGLE_CLIENT_ID;

    // Check if Google SDK is loaded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    if (!google?.accounts?.id) {
      setErrorMsg('Google SDK chưa sẵn sàng. Vui lòng thử tải lại trang hoặc kiểm tra kết nối mạng.');
      return;
    }

    if (!clientId) {
      setErrorMsg('Chưa cấu hình Google Client ID. Vui lòng bổ sung VITE_GOOGLE_CLIENT_ID vào file .env và backend appsettings.json.');
      return;
    }

    setIsLoading(true);
    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) {
            setErrorMsg('Không nhận được token xác thực từ Google.');
            setIsLoading(false);
            return;
          }
          await handleGoogleSuccess(response.credential);
        },
      });

      google.accounts.id.prompt((notification: { isNotDisplayed: () => boolean; getNotDisplayedReason: () => string }) => {
        if (notification.isNotDisplayed()) {
          setIsLoading(false);
          setErrorMsg(`Không thể mở cửa sổ Google: ${notification.getNotDisplayedReason()}`);
        }
      });
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(getApiErrorMessage(err, 'Lỗi kích hoạt Google Sign-In.'));
    }
  };

  return (
    <AuthLayout
      title="Resq-ai Login"
      subtitle="Truy cập thiết bị đầu cuối điều phối khẩn cấp hoặc cổng tác chiến"
    >
      {successRedirectMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successRedirectMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          {errorMsg.toLowerCase().includes('xác thực') && (
            <button
              type="button"
              onClick={() => setShowVerifyModal(true)}
              className="text-xs font-bold text-red-600 hover:underline shrink-0 cursor-pointer"
            >
              Nhập mã OTP
            </button>
          )}
        </div>
      )}

      {/* Google Login Button */}
      <div className="space-y-4 mb-6">
        <GoogleButton 
          text="Đăng nhập với Google" 
          onSuccess={handleGoogleSuccess}
          onError={(err) => setErrorMsg(err)}
          onClickFallback={handleGoogleLogin}
          isLoading={isLoading}
        />

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="bg-white px-3 text-[11px] font-mono uppercase tracking-wider text-slate-500 shrink-0">
            hoặc bằng tài khoản
          </span>
          <div className="border-t border-slate-200 w-full"></div>
        </div>
      </div>

      {/* Main Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email or CAD ID */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 font-bold">
            Địa chỉ Email / Mã định danh CAD
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@resq.gov.vn hoặc email người dân"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 font-bold">
              Mật khẩu
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <span>Ghi nhớ phiên đăng nhập trên thiết bị này</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm tracking-wide shadow-sm active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Xác thực &amp; Vào hệ thống</span>
            </>
          )}
        </button>
      </form>

      {/* Switch to Sign Up */}
      <div className="mt-6 pt-5 border-t border-slate-200 text-center text-xs text-slate-600">
        Chưa có tài khoản Người dân?{' '}
        <Link to="/register" className="text-red-600 hover:text-red-700 font-bold transition-colors">
          Đăng ký ngay
        </Link>
      </div>

      {/* Verify Email Modal */}
      <VerifyEmailModal
        isOpen={showVerifyModal}
        email={email}
        onClose={() => setShowVerifyModal(false)}
        onSuccess={() => {
          setShowVerifyModal(false);
          setErrorMsg('');
        }}
      />
    </AuthLayout>
  );
};
