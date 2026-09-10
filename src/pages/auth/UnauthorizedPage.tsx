import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth';

export const UnauthorizedPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getTargetPortal = () => {
    if (!user) return { label: 'Trang chủ', path: '/' };
    switch (user.role) {
      case UserRole.RescueStaff:
        return { label: 'Cổng tác chiến Cứu hộ (/staff)', path: '/staff' };
      case UserRole.Operator:
      case UserRole.Admin:
        return { label: 'Trung tâm chỉ huy (/dashboard)', path: '/dashboard' };
      case UserRole.Citizen:
      default:
        return { label: 'Trang chủ Báo sự cố', path: '/' };
    }
  };

  const portal = getTargetPortal();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden cad-grid-bg">
      {/* Glow effect */}
      <div className="absolute w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="max-w-md w-full rounded-2xl bg-slate-900/90 border border-red-900/60 p-8 shadow-2xl backdrop-blur-xl relative z-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-800 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-900/40">
          <ShieldAlert className="w-9 h-9 text-red-500 animate-pulse" />
        </div>

        <span className="px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-400 font-mono-data text-[11px] font-bold tracking-widest uppercase mb-3 inline-block">
          403 Access Denied
        </span>

        <h1 className="text-2xl font-black text-white tracking-wide mt-1 mb-2">
          Truy cập bị từ chối
        </h1>

        <p className="text-xs text-slate-400 font-mono-data mb-6 leading-relaxed">
          Tài khoản của bạn ({user?.email || 'Người dùng'}) với vai trò{' '}
          <span className="text-white font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
            {user?.role || 'Guest'}
          </span>{' '}
          không có thẩm quyền truy cập khu vực tác chiến này.
        </p>

        <div className="space-y-3">
          <Link
            to={portal.path}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-glow-blue transition-all flex items-center justify-center gap-2 border border-blue-500"
          >
            <Home className="w-4 h-4" />
            <span>Về {portal.label}</span>
          </Link>

          <button
            onClick={() => navigate(-1)}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang trước</span>
          </button>

          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="w-full py-2.5 rounded-xl bg-red-950/40 hover:bg-red-950/70 text-red-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-red-900/50 mt-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất tài khoản khác</span>
          </button>
        </div>
      </div>
    </div>
  );
};
