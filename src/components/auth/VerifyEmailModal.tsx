import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, KeyRound, AlertCircle, CheckCircle2, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { authService } from '../../services/authService';
import { getApiErrorMessage } from '../../services/apiClient';

interface VerifyEmailModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const VerifyEmailModal: React.FC<VerifyEmailModalProps> = ({
  isOpen,
  email,
  onClose,
  onSuccess,
}) => {
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isOpen && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setErrorMsg('Vui lòng nhập đúng mã OTP gồm 6 chữ số');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await authService.verifyEmail({
        email: email.trim(),
        token: otp.trim(),
      });

      if (res.success) {
        setIsVerified(true);
        setSuccessMsg(res.message || 'Xác thực email tài khoản thành công!');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setErrorMsg(res.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Xác thực thất bại. Vui lòng kiểm tra mã OTP.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || isResending) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsResending(true);

    try {
      const res = await authService.resendVerification({ email: email.trim() });
      if (res.success) {
        setSuccessMsg('Mã xác thực mới đã được gửi tới hộp thư của bạn.');
        setCountdown(60);
        setCanResend(false);
      } else {
        setErrorMsg(res.message || 'Không thể gửi lại mã xác thực.');
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Lỗi gửi lại mã OTP. Vui lòng thử lại sau.'));
    } finally {
      setIsResending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isVerified ? (
          <div className="text-center py-6 space-y-4 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Xác thực thành công!</h3>
            <p className="text-xs text-slate-600 font-mono">{successMsg}</p>
            <div className="w-6 h-6 border-2 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mt-2" />
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Kích hoạt tài khoản</h3>
                <p className="text-xs text-slate-500 font-mono">Mã xác thực OTP gửi qua email</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-mono mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              Mã bảo mật 6 số đã được gửi tới: <br />
              <span className="text-red-600 font-bold">{email}</span>. Vui lòng kiểm tra hộp thư đến (hoặc thư rác).
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-700 font-bold">
                  Mã OTP 6 chữ số
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-center text-lg font-mono tracking-widest font-bold focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wider uppercase font-mono shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Xác nhận kích hoạt</span>
                )}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Chưa nhận được mã?</span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  <span>Gửi lại mã ngay</span>
                </button>
              ) : (
                <span className="text-slate-500 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Gửi lại sau {countdown}s</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
