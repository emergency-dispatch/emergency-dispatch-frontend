import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { GoogleButton } from '../../components/auth/GoogleButton';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  UserPlus, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<'citizen' | 'responder'>('citizen');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setErrorMsg('Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('Please accept the Terms of Service to continue');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      navigate('/login');
    }, 1200);
  };

  const handleGoogleSignup = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/');
    }, 1000);
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join ResQ-AI for real-time emergency reporting and rescue coordination"
    >
      {/* Role Switcher */}
      <div className="grid grid-cols-2 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 mb-6 font-mono-data text-xs">
        <button
          type="button"
          onClick={() => setRole('citizen')}
          className={`py-2 rounded-lg font-bold transition-all ${
            role === 'citizen'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Citizen User
        </button>
        <button
          type="button"
          onClick={() => setRole('responder')}
          className={`py-2 rounded-lg font-bold transition-all ${
            role === 'responder'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Rescue Responder
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Google Sign-up */}
      <div className="space-y-4 mb-6">
        <GoogleButton 
          text="Sign up with Google" 
          onClick={handleGoogleSignup}
          isLoading={isLoading}
        />

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full"></div>
          <span className="bg-[#131D33] px-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 shrink-0">
            or with email
          </span>
          <div className="border-t border-slate-800 w-full"></div>
        </div>
      </div>

      {/* Sign Up Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
            Full Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Nguyen Van An"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono-data"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
            Email Address
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
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono-data"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
            Phone Number (for SMS Alerts)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+84 912 345 678"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono-data"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
            Create Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono-data"
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

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
            Confirm Password
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
              placeholder="Re-enter password"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono-data"
            />
          </div>
        </div>

        {/* Terms Agreement */}
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-slate-400 leading-snug">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0"
            />
            <span>
              I agree to the <a href="#terms" className="text-red-400 hover:underline">Terms of Emergency Dispatch</a> and <a href="#privacy" className="text-red-400 hover:underline">Privacy Policy</a>.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm tracking-wide shadow-glow-red active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 border border-red-500 disabled:opacity-60 mt-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-400">
        Already registered with ResQ-AI?{' '}
        <Link to="/login" className="text-red-400 hover:text-red-300 font-bold transition-colors">
          Sign In
        </Link>
      </div>
    </AuthLayout>
  );
};
