import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-hidden selection:bg-red-600 selection:text-white">
      
      {/* Top Header */}
      <header className="p-6 max-w-7xl w-full mx-auto flex items-center justify-between relative z-10">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xs text-slate-600 hover:text-red-600 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 shrink-0 text-red-600" />
          <span>Về trang chủ</span>
        </Link>

        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-xs text-white">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-wider">
            ResQ<span className="text-red-600">-AI</span>
          </span>
        </Link>
      </header>

      {/* Center Auth Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 my-4">
        <div className="w-full max-w-md">
          
          {/* Card Container */}
          <div className="relative rounded-2xl bg-white p-7 sm:p-9 border border-slate-200 shadow-xl">
            {/* Title & Subtitle */}
            <div className="text-center space-y-1.5 mb-7">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-normal">
                {subtitle}
              </p>
            </div>

            {/* Form Content */}
            {children}
          </div>

          {/* Security Note */}
          <div className="mt-6 text-center text-[11px] font-mono text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hệ thống bảo mật điều hành khẩn cấp ResQ-AI</span>
          </div>

        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="p-4 text-center text-xs font-mono text-slate-500 relative z-10">
        © 2026 ResQ-AI Emergency CAD System
      </footer>

    </div>
  );
};
