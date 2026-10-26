import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock
} from 'lucide-react';
import { useTranslation } from '../../i18n';

interface FooterProps {
  onOpenSos: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSos }) => {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600 font-sans relative overflow-hidden">
      
      {/* Top Banner Accent Line */}
      <div className="h-1 w-full bg-red-600"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8">
          
          {/* Col 1: Brand & Description (4 cols) */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center shadow-sm text-white shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span className="text-2xl font-black text-slate-900 tracking-wider inline-flex items-center">
                ResQ<span className="text-red-600 font-extrabold">-AI</span>
              </span>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
              {t('citizen.landing.footerDesc')}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-slate-600">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-semibold whitespace-nowrap shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                CAD ENGINE ONLINE
              </span>
              <span className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-semibold whitespace-nowrap shadow-xs">
                ENCRYPTED TLS 1.3
              </span>
            </div>
          </div>

          {/* Col 2: Quick Role Portals (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-900 font-bold">
              {t('citizen.landing.footerPortals')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={onOpenSos}
                  className="text-slate-600 hover:text-red-600 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>{t('citizen.landing.footerOnlineSos')}</span>
                  <span className="text-[10px] font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200 font-bold shrink-0">{t('citizen.landing.footer1Touch')}</span>
                </button>
              </li>
              <li>
                <Link to="/login" className="text-slate-600 hover:text-red-600 transition-colors">
                  {t('citizen.landing.footerOperatorPortal')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-600 hover:text-red-600 transition-colors">
                  {t('citizen.landing.footerStaffPortal')}
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-slate-600 hover:text-red-600 transition-colors">
                  {t('citizen.landing.footerRegister')}
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="text-slate-600 hover:text-red-600 transition-colors">
                  {t('citizen.landing.footerForgotPass')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: National & Park Hotlines (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-900 font-bold">
              {t('citizen.landing.footerHotlinesTitle')}
            </h4>
            <ul className="space-y-2 text-sm font-mono">
              <li>
                <a href="tel:02837360000" className="text-slate-700 hover:text-red-600 transition-colors flex items-center justify-between gap-3 p-1.5 rounded hover:bg-white">
                  <span>{t('citizen.landing.footerParkSecurity')}</span>
                  <span className="text-xs text-red-600 font-bold shrink-0">{t('citizen.landing.footerParkSecurityNote')}</span>
                </a>
              </li>
              <li>
                <a href="tel:114" className="text-slate-700 hover:text-red-600 transition-colors flex items-center justify-between gap-3 p-1.5 rounded hover:bg-white">
                  <span>{t('citizen.landing.footerFire114')}</span>
                  <span className="text-xs text-red-600 font-bold shrink-0">{t('citizen.landing.footerFire114Note')}</span>
                </a>
              </li>
              <li>
                <a href="tel:115" className="text-slate-700 hover:text-red-600 transition-colors flex items-center justify-between gap-3 p-1.5 rounded hover:bg-white">
                  <span>{t('citizen.landing.footerAmbulance115')}</span>
                  <span className="text-xs text-red-600 font-bold shrink-0">{t('citizen.landing.footerAmbulance115Note')}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Standards & Security (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-900 font-bold">
              {t('citizen.landing.footerSecurityTitle')}
            </h4>
            <div className="space-y-2.5 text-xs text-slate-600 font-mono">
              <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('citizen.landing.footerCadStandard')}</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5 shadow-xs">
                <Lock className="w-4 h-4 text-red-600 shrink-0" />
                <span>{t('citizen.landing.footerTlsAes')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Credits & Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div>
            © 2026 <strong className="text-slate-700">ResQ-AI</strong> Emergency Dispatch Platform.
          </div>
          <div className="flex items-center gap-4">
            <span>{t('citizen.landing.footerThesisProject')}</span>
            <span>•</span>
            <span className="text-slate-600 font-semibold">{t('citizen.landing.footerCadDesign')}</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
