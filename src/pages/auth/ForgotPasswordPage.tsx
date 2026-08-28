import React, { useState } from 'react';
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
  ShieldAlert
} from 'lucide-react';

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

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your account email address');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 1000);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !newPassword) {
      setErrorMsg('Please enter the verification code and new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
    }, 1200);
  };

  return (
    <AuthLayout
      title={step === 3 ? "Password Reset Complete" : "Reset Password"}
      subtitle={
        step === 1
          ? "Enter your registered email to receive a secure recovery code"
          : step === 2
            ? `Enter the 6-digit code sent to ${email}`
            : "Your credentials have been securely updated"
      }
    >
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Request Code Form */}
      {step === 1 && (
        <form onSubmit={handleSendCode} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
              Account Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono-data"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-glow-blue active:scale-[0.99] transition-all flex items-center justify-center gap-2 border border-blue-500 disabled:opacity-60"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Send Verification Code</span>
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
            <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
              6-Digit Verification Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-base font-mono-data tracking-widest text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono-data"
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

          <div className="space-y-1.5">
            <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono-data"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-glow-blue active:scale-[0.99] transition-all flex items-center justify-center gap-2 border border-blue-500 disabled:opacity-60 mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span>Confirm &amp; Update Password</span>
            )}
          </button>
        </form>
      )}

      {/* Step 3: Success Confirmation */}
      {step === 3 && (
        <div className="text-center space-y-6 py-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-600/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">
              Password Successfully Updated
            </h3>
            <p className="text-xs text-slate-400 font-mono-data">
              You can now authenticate with your new credentials.
            </p>
          </div>

          <Link
            to="/login"
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm font-mono-data shadow-glow-blue flex items-center justify-center gap-2 transition-all block"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-4 h-4 inline" />
          </Link>
        </div>
      )}

      {/* Back to Login Link */}
      {step !== 3 && (
        <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-400">
          Remember your credentials?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
            Back to Sign In
          </Link>
        </div>
      )}
    </AuthLayout>
  );
};
