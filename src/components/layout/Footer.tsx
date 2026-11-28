import React from 'react';
import { Link } from 'react-router-dom';
import { 
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

      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_auto_auto_auto] gap-8 xl:gap-7 items-start">
          
          {/* Col 1: Brand & Description */}
          <div className="space-y-4">
            <Link
              to="/"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center"
            >
              <img
                src="/brand-logo.png"
                alt="ResQ-AI"
                className="h-10 w-auto object-contain"
              />
            </Link>

            <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
              {t('citizen.landing.footerDesc')}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs font-mono text-slate-600">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-semibold whitespace-nowrap shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                {t('citizen.landing.footerEngineOnline')}
              </span>
              <span className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-semibold whitespace-nowrap shadow-xs">
                {t('citizen.landing.footerTls')}
              </span>
            </div>
          </div>

          {/* Col 2: Quick Role Portals */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-900 font-bold">
              {t('citizen.landing.footerPortals')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={onOpenSos}
                  className="text-slate-600 hover:text-red-600 transition-colors flex items-center gap-2 text-left whitespace-nowrap cursor-pointer"
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

          {/* Col 3: National & Park Hotlines */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-900 font-bold">
              {t('citizen.landing.footerHotlinesTitle')}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="tel:02837360000" className="text-slate-700 hover:text-red-600 transition-colors flex items-center justify-between gap-4 py-1.5 px-2 -mx-2 rounded hover:bg-white">
                  <span className="whitespace-nowrap">{t('citizen.landing.footerParkSecurity')}</span>
                  <span className="text-xs font-mono text-red-600 font-bold shrink-0 whitespace-nowrap">{t('citizen.landing.footerParkSecurityNote')}</span>
                </a>
              </li>
              <li>
                <a href="tel:114" className="text-slate-700 hover:text-red-600 transition-colors flex items-center justify-between gap-4 py-1.5 px-2 -mx-2 rounded hover:bg-white">
                  <span className="whitespace-nowrap">{t('citizen.landing.footerFire114')}</span>
                  <span className="text-xs font-mono text-red-600 font-bold shrink-0 whitespace-nowrap">{t('citizen.landing.footerFire114Note')}</span>
                </a>
              </li>
              <li>
                <a href="tel:115" className="text-slate-700 hover:text-red-600 transition-colors flex items-center justify-between gap-4 py-1.5 px-2 -mx-2 rounded hover:bg-white">
                  <span className="whitespace-nowrap">{t('citizen.landing.footerAmbulance115')}</span>
                  <span className="text-xs font-mono text-red-600 font-bold shrink-0 whitespace-nowrap">{t('citizen.landing.footerAmbulance115Note')}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Standards & Security */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-900 font-bold">
              {t('citizen.landing.footerSecurityTitle')}
            </h4>
            <div className="space-y-2.5 text-xs text-slate-600 font-mono">
              <div className="px-3 py-2.5 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="xl:whitespace-nowrap">{t('citizen.landing.footerCadStandard')}</span>
              </div>
              <div className="px-3 py-2.5 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5 shadow-xs">
                <Lock className="w-4 h-4 text-red-600 shrink-0" />
                <span className="xl:whitespace-nowrap">{t('citizen.landing.footerTlsAes')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Credits & Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div>
            © 2026 <strong className="text-slate-700">ResQ-AI</strong> · {t('citizen.landing.footerRights')}
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
