import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { 
  Mail, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { authService } from '../../services/authService';
import { getApiErrorMessage } from '../../services/apiClient';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (step === 2 && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Vui lòng nhập địa chỉ email của bạn');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await authService.forgotPassword({ email: email.trim() });
      if (res.success) {
        setStep(2);
        setCountdown(60);
        setCanResend(false);
      } else {
        setErrorMsg(res.message || 'Không thể gửi mã xác thực. Vui lòng thử lại.');
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Lỗi gửi yêu cầu khôi phục. Vui lòng kiểm tra lại địa chỉ email.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || isLoading) return;
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await authService.forgotPassword({ email: email.trim() });
      if (res.success) {
        setCountdown(60);
        setCanResend(false);
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Không thể gửi lại mã. Vui lòng thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !newPassword) {
      setErrorMsg('Vui lòng nhập đầy đủ mã OTP và mật khẩu mới');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await authService.resetPassword({
        email: email.trim(),
        token: otpCode.trim(),
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        setStep(3);
      } else {
        setErrorMsg(res.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Lỗi đặt lại mật khẩu. Vui lòng thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === 3 ? 'Đặt Lại Mật Khẩu Thành Công' : 'Khôi Phục Mật Khẩu'}
      subtitle={
        step === 1
          ? 'Nhập email đã đăng ký để nhận mã khôi phục bảo mật 6 số'
          : step === 2
            ? `Nhập mã 6 số đã gửi tới ${email} và tạo mật khẩu mới`
            : 'Mật khẩu của bạn đã được cập nhật an toàn'
      }
    >
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Request Code Form */}
      {step === 1 && (
        <form onSubmit={handleSendCode} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 font-bold">
              Địa chỉ Email tài khoản
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm tracking-wide shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Gửi mã xác thực OTP</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 2: Enter OTP & New Password */}
      {step === 2 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 font-bold">
                Mã xác thực 6 chữ số
              </label>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-[11px] font-mono text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Gửi lại mã</span>
                </button>
              ) : (
                <span className="text-[11px] font-mono text-slate-500">
                  Gửi lại sau {countdown}s
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-base font-mono tracking-widest text-center focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 font-bold">
              Mật khẩu mới (Tối thiểu 6 ký tự)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
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

          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 font-bold">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm tracking-wide shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span>Xác nhận &amp; Cập nhật mật khẩu</span>
            )}
          </button>
        </form>
      )}

      {/* Step 3: Success Confirmation */}
      {step === 3 && (
        <div className="text-center space-y-6 py-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">
              Cập Nhật Mật Khẩu Thành Công
            </h3>
            <p className="text-xs text-slate-600 font-mono">
              Bạn có thể đăng nhập ngay với thông tin mật khẩu mới.
            </p>
          </div>

          <Link
            to="/login"
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all block"
          >
            <span>Tiến hành Đăng nhập</span>
            <ArrowRight className="w-4 h-4 inline" />
          </Link>
        </div>
      )}

      {/* Back to Login Link */}
      {step !== 3 && (
        <div className="mt-6 pt-5 border-t border-slate-200 text-center text-xs text-slate-600">
          Nhớ lại mật khẩu?{' '}
          <Link to="/login" className="text-red-600 hover:text-red-700 font-bold transition-colors">
            Quay lại Đăng nhập
          </Link>
        </div>
      )}
    </AuthLayout>
  );
};
