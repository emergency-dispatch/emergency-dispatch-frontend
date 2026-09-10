import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, isLoggingOut } = useAuth();
  const location = useLocation();

  if (isLoading || isLoggingOut) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0B0F19] text-white">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono-data tracking-wider uppercase text-slate-400">
          {isLoggingOut ? 'Đang đăng xuất...' : 'Đang xác thực thông tin tài khoản...'}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
