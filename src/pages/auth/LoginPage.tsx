import React, { useState } from 'react';
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

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Read message or redirect if passed from navigation
  const successRedirectMsg = (location.state as { message?: string })?.message;

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

      // Role-based or previous target redirect
      const stateFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (stateFrom && stateFrom !== '/login') {
        navigate(stateFrom, { replace: true });
        return;
      }

      const role = authData.user.role;
      if (role === UserRole.RescueStaff) {
        navigate('/staff', { replace: true });
      } else if (role === UserRole.Operator || role === UserRole.Admin) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
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
      const role = authData.user.role;
      if (role === UserRole.RescueStaff) {
        navigate('/staff', { replace: true });
      } else if (role === UserRole.Operator || role === UserRole.Admin) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
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
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successRedirectMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
          {errorMsg.toLowerCase().includes('xác thực') && (
            <button
              type="button"
              onClick={() => setShowVerifyModal(true)}
              className="text-xs font-bold text-blue-400 hover:underline shrink-0"
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
          <div className="border-t border-slate-800 w-full"></div>
          <span className="bg-[#131D33] px-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 shrink-0">
            hoặc bằng tài khoản
          </span>
          <div className="border-t border-slate-800 w-full"></div>
        </div>
      </div>

      {/* Main Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email or CAD ID */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
            Địa chỉ Email / Mã định danh CAD
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@resq.gov.vn hoặc email người dân"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono-data"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
              Mật khẩu
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-mono-data text-blue-400 hover:text-blue-300 transition-colors"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono-data"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-slate-400">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Ghi nhớ phiên đăng nhập trên thiết bị này</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-glow-blue active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 border border-blue-500 disabled:opacity-60"
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
      <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-400">
        Chưa có tài khoản Người dân?{' '}
        <Link to="/register" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
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
