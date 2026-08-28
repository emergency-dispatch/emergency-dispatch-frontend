import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Sparkles } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between relative overflow-hidden cad-grid-bg selection:bg-red-600 selection:text-white">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Top Header */}
      <header className="p-6 max-w-7xl w-full mx-auto flex items-center justify-between relative z-10">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xs font-mono-data text-slate-400 hover:text-white transition-colors bg-slate-900/60 px-3.5 py-2 rounded-xl border border-slate-800 backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4 shrink-0 text-blue-400" />
          <span>Back to Home</span>
        </Link>

        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-blue-600 flex items-center justify-center shadow-lg shadow-red-500/20 border border-slate-700">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black text-white tracking-wider">
            ResQ<span className="text-red-500">-AI</span>
          </span>
        </Link>
      </header>

      {/* Center Auth Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 my-4">
        <div className="w-full max-w-md">
          
          {/* Card Container */}
          <div className="relative rounded-2xl cad-glass p-7 sm:p-9 border border-slate-700/80 shadow-2xl shadow-black/60 backdrop-blur-xl">
            
            {/* HUD Corner Decors */}
            <div className="hud-corner-tl"></div>
            <div className="hud-corner-tr"></div>
            <div className="hud-corner-bl"></div>
            <div className="hud-corner-br"></div>

            {/* Title & Subtitle */}
            <div className="text-center space-y-1.5 mb-7">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-normal text-balance">
                {subtitle}
              </p>
            </div>

            {/* Form Content */}
            {children}

          </div>

          {/* Security Note */}
          <div className="mt-6 text-center text-[11px] font-mono-data text-slate-500 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>GovTech CAD AES-256 Protected Portal</span>
          </div>

        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="p-4 text-center text-xs font-mono-data text-slate-500 relative z-10">
        © 2026 ResQ-AI Emergency CAD System
      </footer>

    </div>
  );
};
