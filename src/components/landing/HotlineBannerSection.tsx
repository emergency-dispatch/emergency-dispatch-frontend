import React from 'react';
import { 
  PhoneCall, 
  ShieldAlert, 
  Flame, 
  HeartPulse, 
  AlertOctagon, 
  ArrowUpRight
} from 'lucide-react';
import { useTranslation } from '../../i18n';

interface HotlineBannerSectionProps {
  onOpenSos: () => void;
}

export const HotlineBannerSection: React.FC<HotlineBannerSectionProps> = ({ onOpenSos }) => {
  const { t } = useTranslation();

  const hotlines = [
    {
      number: '028.3736',
      name: t('citizen.landing.hotlines.h1.name'),
      vietnameseName: t('citizen.landing.hotlines.h1.vietnameseName'),
      icon: ShieldAlert,
      badge: t('citizen.landing.hotlines.h1.badge'),
      tel: 'tel:02837360000'
    },
    {
      number: '114',
      name: t('citizen.landing.hotlines.h2.name'),
      vietnameseName: t('citizen.landing.hotlines.h2.vietnameseName'),
      icon: Flame,
      badge: t('citizen.landing.hotlines.h2.badge'),
      tel: 'tel:114'
    },
    {
      number: '115',
      name: t('citizen.landing.hotlines.h3.name'),
      vietnameseName: t('citizen.landing.hotlines.h3.vietnameseName'),
      icon: HeartPulse,
      badge: t('citizen.landing.hotlines.h3.badge'),
      tel: 'tel:115'
    }
  ];

  return (
    <section id="hotlines" className="py-20 bg-white relative overflow-hidden border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 whitespace-nowrap">
              <PhoneCall className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="text-xs font-mono text-red-600 font-bold uppercase tracking-wider">
                {t('citizen.landing.hotlines.tag')}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              {t('citizen.landing.hotlines.title')}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
              {t('citizen.landing.hotlines.desc')}
            </p>
          </div>

          <button
            onClick={onOpenSos}
            className="self-start md:self-auto px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm flex items-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>{t('citizen.landing.hotlines.sosBtn')}</span>
          </button>
        </div>

        {/* Hotline Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {hotlines.map((hotline) => {
            const Icon = hotline.icon;

            return (
              <a
                key={hotline.number}
                href={hotline.tel}
                className="group rounded-2xl bg-slate-50 p-6 border border-slate-200 transition-all duration-200 flex flex-col justify-between h-full hover:border-red-400 hover:bg-red-50/20 hover:shadow-sm relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono text-slate-600 px-2.5 py-1 rounded-md bg-white border border-slate-200 whitespace-nowrap font-medium">
                      {hotline.badge}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-black font-mono text-red-600 whitespace-nowrap">
                        {hotline.number}
                      </span>
                      <span className="text-xs font-mono text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
                        {t('citizen.landing.hotlines.tollFree')}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-2 leading-snug">
                      {hotline.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hotline.vietnameseName}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-red-600 group-hover:text-red-700 transition-colors">
                  <span className="whitespace-nowrap">{t('citizen.landing.hotlines.tapToCall')}</span>
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </div>
              </a>
            );
          })}
        </div>

      </div>
    </section>
  );
};
