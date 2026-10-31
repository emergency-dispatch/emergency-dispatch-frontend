import React from 'react';
import { 
  Smartphone, 
  MonitorCheck, 
  Truck, 
  CheckCircle, 
  ArrowRight, 
  UserCheck,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { useTranslation } from '../../i18n';

interface RoleSolutionsSectionProps {
  onOpenSos: () => void;
}

export const RoleSolutionsSection: React.FC<RoleSolutionsSectionProps> = ({ onOpenSos }) => {
  const { t } = useTranslation();

  const roles = [
    {
      id: 1,
      name: t('citizen.landing.roles.r1.name'),
      subtitle: t('citizen.landing.roles.r1.subtitle'),
      icon: Smartphone,
      description: t('citizen.landing.roles.r1.desc'),
      features: [
        t('citizen.landing.roles.r1.f1'),
        t('citizen.landing.roles.r1.f2'),
        t('citizen.landing.roles.r1.f3'),
        t('citizen.landing.roles.r1.f4'),
        t('citizen.landing.roles.r1.f5'),
      ],
      actionLabel: t('citizen.landing.roles.r1.action'),
      actionType: 'sos'
    },
    {
      id: 2,
      name: t('citizen.landing.roles.r2.name'),
      subtitle: t('citizen.landing.roles.r2.subtitle'),
      icon: MonitorCheck,
      description: t('citizen.landing.roles.r2.desc'),
      features: [
        t('citizen.landing.roles.r2.f1'),
        t('citizen.landing.roles.r2.f2'),
        t('citizen.landing.roles.r2.f3'),
        t('citizen.landing.roles.r2.f4'),
        t('citizen.landing.roles.r2.f5'),
      ],
      actionLabel: t('citizen.landing.roles.r2.action'),
      actionType: 'link',
      actionHref: '/login'
    },
    {
      id: 3,
      name: t('citizen.landing.roles.r3.name'),
      subtitle: t('citizen.landing.roles.r3.subtitle'),
      icon: Truck,
      description: t('citizen.landing.roles.r3.desc'),
      features: [
        t('citizen.landing.roles.r3.f1'),
        t('citizen.landing.roles.r3.f2'),
        t('citizen.landing.roles.r3.f3'),
        t('citizen.landing.roles.r3.f4'),
        t('citizen.landing.roles.r3.f5'),
      ],
      actionLabel: t('citizen.landing.roles.r3.action'),
      actionType: 'link',
      actionHref: '/login'
    },
    {
      id: 4,
      name: t('citizen.landing.roles.r4.name'),
      subtitle: t('citizen.landing.roles.r4.subtitle'),
      icon: ShieldCheck,
      description: t('citizen.landing.roles.r4.desc'),
      features: [
        t('citizen.landing.roles.r4.f1'),
        t('citizen.landing.roles.r4.f2'),
        t('citizen.landing.roles.r4.f3'),
        t('citizen.landing.roles.r4.f4'),
        t('citizen.landing.roles.r4.f5'),
      ],
      actionLabel: t('citizen.landing.roles.r4.action'),
      actionType: 'link',
      actionHref: '/login'
    }
  ];

  return (
    <section id="roles" className="py-20 bg-slate-50 relative overflow-hidden border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 shadow-sm whitespace-nowrap">
            <UserCheck className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs font-mono uppercase tracking-widest text-red-600 font-bold">
              {t('citizen.landing.roles.tag')}
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {t('citizen.landing.roles.title')}{' '}
            <span className="text-red-600">
              {t('citizen.landing.roles.titleHighlight')}
            </span>
          </h2>

          <p className="text-base text-slate-600 leading-relaxed">
            {t('citizen.landing.roles.desc')}
          </p>
        </div>

        {/* 4 Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {roles.map((role) => {
            const Icon = role.icon;

            return (
              <div
                key={role.id}
                className="group relative rounded-2xl bg-white p-7 border border-slate-200 shadow-sm transition-all duration-300 flex flex-col justify-between h-full hover:shadow-md hover:border-red-300"
              >
                <div>
                  {/* Card Header Icon & Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border border-red-200 bg-red-50 text-red-600 whitespace-nowrap">
                      {t('citizen.landing.roles.roleBadge', { id: role.id })}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-red-600 transition-colors leading-snug">
                      {role.name}
                    </h3>
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">
                      {role.subtitle}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {role.description}
                  </p>

                  {/* Feature Checklist */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 mb-6">
                    {role.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-700 font-medium leading-tight">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-4 border-t border-slate-100">
                  {role.actionType === 'sos' ? (
                    <button
                      onClick={onOpenSos}
                      className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>{role.actionLabel}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  ) : (
                    <a
                      href={role.actionHref}
                      className="w-full py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 hover:text-red-600 font-bold text-sm border border-slate-200 hover:border-red-300 flex items-center justify-center gap-2 transition-all"
                    >
                      <span>{role.actionLabel}</span>
                      <ArrowRight className="w-4 h-4 text-red-600 shrink-0" />
                    </a>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
