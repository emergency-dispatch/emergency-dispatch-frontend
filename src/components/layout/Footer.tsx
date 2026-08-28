import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  PhoneCall, 
  ShieldCheck, 
  Lock, 
  ExternalLink, 
  Heart,
  Globe,
  Radio
} from 'lucide-react';

interface FooterProps {
  onOpenSos: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSos }) => {
  return (
    <footer className="bg-[#080C14] border-t border-slate-800 text-slate-400 font-sans relative overflow-hidden">
      
      {/* Top Banner Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-red-600 via-blue-600 to-red-600"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Col 1 & 2: Brand & Description */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3 whitespace-nowrap">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-blue-600 flex items-center justify-center shadow-lg text-white border border-slate-700 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span className="text-2xl font-black text-white tracking-wider inline-flex items-center">
                ResQ<span className="text-red-500 font-extrabold">-AI</span>
              </span>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm text-balance">
              Next-Generation Autonomous Emergency Dispatch System. Powered by multi-modal Vision-Language AI for ultra-low latency incident triage, dynamic multi-agency routing, and live rescue tracking.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono-data text-slate-400">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-semibold whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                CAD ENGINE ONLINE
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-blue-400 font-semibold whitespace-nowrap">
                ENCRYPTED TLS 1.3
              </span>
            </div>
          </div>

          {/* Col 3: Quick Role Portals */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono-data uppercase tracking-widest text-slate-200 font-bold whitespace-nowrap">
              CAD Stakeholder Portals
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={onOpenSos}
                  className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <span>Citizen Web SOS</span>
                  <span className="text-[10px] font-mono-data bg-red-950 text-red-400 px-1.5 py-0.2 rounded border border-red-800 shrink-0">1-TAP</span>
                </button>
              </li>
              <li>
                <Link to="/login" className="text-slate-400 hover:text-white transition-colors whitespace-nowrap">
                  Dispatcher CAD Console
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-400 hover:text-white transition-colors whitespace-nowrap">
                  First Responder Mobile HUD
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-slate-400 hover:text-white transition-colors whitespace-nowrap">
                  Register Responder Account
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="text-slate-400 hover:text-white transition-colors whitespace-nowrap">
                  Forgot Password Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: National Hotlines */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono-data uppercase tracking-widest text-slate-200 font-bold whitespace-nowrap">
              Emergency Hotlines (VN)
            </h4>
            <ul className="space-y-2 text-sm font-mono-data">
              <li>
                <a href="tel:113" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center justify-between whitespace-nowrap gap-2">
                  <span>113 - Police</span>
                  <span className="text-xs text-blue-400 font-bold shrink-0">Cảnh Sát</span>
                </a>
              </li>
              <li>
                <a href="tel:114" className="text-slate-300 hover:text-red-400 transition-colors flex items-center justify-between whitespace-nowrap gap-2">
                  <span>114 - Fire &amp; Rescue</span>
                  <span className="text-xs text-red-400 font-bold shrink-0">Cứu Hỏa</span>
                </a>
              </li>
              <li>
                <a href="tel:115" className="text-slate-300 hover:text-emerald-400 transition-colors flex items-center justify-between whitespace-nowrap gap-2">
                  <span>115 - Medical EMS</span>
                  <span className="text-xs text-emerald-400 font-bold shrink-0">Cấp Cứu</span>
                </a>
              </li>
              <li>
                <a href="tel:111" className="text-slate-300 hover:text-purple-400 transition-colors flex items-center justify-between whitespace-nowrap gap-2">
                  <span>111 - Child Protection</span>
                  <span className="text-xs text-purple-400 font-bold shrink-0">Bảo Vệ Trẻ Em</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 5: Standards & Security */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono-data uppercase tracking-widest text-slate-200 font-bold whitespace-nowrap">
              Compliance &amp; Security
            </h4>
            <div className="space-y-2.5 text-xs text-slate-400 font-mono-data">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-balance">GovTech CAD Level 4 Standards Compliant</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-balance">Zero-Trust End-to-End Encryption (AES-256)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Credits & Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono-data text-slate-500">
          <div className="whitespace-nowrap">
            © 2026 <strong className="text-slate-300">ResQ-AI</strong> Emergency Dispatch Platform. All rights reserved.
          </div>
          <div className="flex items-center gap-4 whitespace-nowrap">
            <span>Graduation Thesis Project (KLTN 2026)</span>
            <span>•</span>
            <span className="text-slate-400">High-Tech CAD Design</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
