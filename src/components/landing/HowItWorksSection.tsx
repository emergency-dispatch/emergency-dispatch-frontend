import React, { useState } from 'react';
import { 
  Camera, 
  BrainCircuit, 
  Truck, 
  Navigation, 
  CheckCircle2, 
  ArrowRight,
  Layers
} from 'lucide-react';
import { useTranslation } from '../../i18n';

export const HowItWorksSection: React.FC = () => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      step: 1,
      id: 'step-1',
      title: t('citizen.landing.howItWorks.step1.title'),
      subtitle: t('citizen.landing.howItWorks.step1.subtitle'),
      icon: Camera,
      badgeColor: 'bg-red-600 text-white',
      badgeBorder: 'border-red-500',
      textColor: 'text-red-500',
      description: t('citizen.landing.howItWorks.step1.desc'),
      bulletPoints: [
        t('citizen.landing.howItWorks.step1.b1'),
        t('citizen.landing.howItWorks.step1.b2'),
        t('citizen.landing.howItWorks.step1.b3'),
        t('citizen.landing.howItWorks.step1.b4'),
      ],
      mockMetric: t('citizen.landing.howItWorks.step1.metric'),
      logs: [
        { color: 'text-red-400 font-bold', text: t('citizen.landing.howItWorks.step1.log1') },
        { color: 'text-slate-300 font-bold', text: t('citizen.landing.howItWorks.step1.log2') },
        { color: 'text-emerald-400 font-bold', text: t('citizen.landing.howItWorks.step1.log3') },
      ],
    },
    {
      step: 2,
      id: 'step-2',
      title: t('citizen.landing.howItWorks.step2.title'),
      subtitle: t('citizen.landing.howItWorks.step2.subtitle'),
      icon: BrainCircuit,
      badgeColor: 'bg-red-600 text-white',
      badgeBorder: 'border-red-500',
      textColor: 'text-red-500',
      description: t('citizen.landing.howItWorks.step2.desc'),
      bulletPoints: [
        t('citizen.landing.howItWorks.step2.b1'),
        t('citizen.landing.howItWorks.step2.b2'),
        t('citizen.landing.howItWorks.step2.b3'),
        t('citizen.landing.howItWorks.step2.b4'),
      ],
      mockMetric: t('citizen.landing.howItWorks.step2.metric'),
      logs: [
        { color: 'text-amber-400 font-bold', text: t('citizen.landing.howItWorks.step2.log1') },
        { color: 'text-slate-200 font-bold', text: t('citizen.landing.howItWorks.step2.log2') },
        { color: 'text-red-400 font-bold', text: t('citizen.landing.howItWorks.step2.log3') },
      ],
    },
    {
      step: 3,
      id: 'step-3',
      title: t('citizen.landing.howItWorks.step3.title'),
      subtitle: t('citizen.landing.howItWorks.step3.subtitle'),
      icon: Truck,
      badgeColor: 'bg-red-600 text-white',
      badgeBorder: 'border-red-500',
      textColor: 'text-red-500',
      description: t('citizen.landing.howItWorks.step3.desc'),
      bulletPoints: [
        t('citizen.landing.howItWorks.step3.b1'),
        t('citizen.landing.howItWorks.step3.b2'),
        t('citizen.landing.howItWorks.step3.b3'),
        t('citizen.landing.howItWorks.step3.b4'),
      ],
      mockMetric: t('citizen.landing.howItWorks.step3.metric'),
      logs: [
        { color: 'text-slate-300 font-bold', text: t('citizen.landing.howItWorks.step3.log1') },
        { color: 'text-emerald-400 font-bold', text: t('citizen.landing.howItWorks.step3.log2') },
        { color: 'text-red-400 font-bold', text: t('citizen.landing.howItWorks.step3.log3') },
      ],
    },
    {
      step: 4,
      id: 'step-4',
      title: t('citizen.landing.howItWorks.step4.title'),
      subtitle: t('citizen.landing.howItWorks.step4.subtitle'),
      icon: Navigation,
      badgeColor: 'bg-red-600 text-white',
      badgeBorder: 'border-red-500',
      textColor: 'text-red-500',
      description: t('citizen.landing.howItWorks.step4.desc'),
      bulletPoints: [
        t('citizen.landing.howItWorks.step4.b1'),
        t('citizen.landing.howItWorks.step4.b2'),
        t('citizen.landing.howItWorks.step4.b3'),
        t('citizen.landing.howItWorks.step4.b4'),
      ],
      mockMetric: t('citizen.landing.howItWorks.step4.metric'),
      logs: [
        { color: 'text-emerald-400 font-bold', text: t('citizen.landing.howItWorks.step4.log1') },
        { color: 'text-slate-300 font-bold', text: t('citizen.landing.howItWorks.step4.log2') },
        { color: 'text-blue-400 font-bold', text: t('citizen.landing.howItWorks.step4.log3') },
      ],
    }
  ];

  return (
    <section id="workflow" className="py-20 bg-white border-t border-slate-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 shadow-sm whitespace-nowrap">
            <Layers className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs font-mono uppercase tracking-widest text-red-600 font-bold">
              {t('citizen.landing.howItWorks.tag')}
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {t('citizen.landing.howItWorks.title')}{' '}
            <span className="text-red-600">
              {t('citizen.landing.howItWorks.titleHighlight')}
            </span>
          </h2>

          <p className="text-base text-slate-600 leading-relaxed">
            {t('citizen.landing.howItWorks.desc')}
          </p>
        </div>

        {/* 4-Step Stepper Header */}
        <div className="relative mb-10">
          {/* Connecting Track Line */}
          <div className="hidden md:block absolute top-7 left-[10%] right-[10%] h-0.5 bg-slate-200 z-0">
            <div 
              className="h-full bg-red-600 transition-all duration-500"
              style={{ width: `${((activeStep - 1) / 3) * 100}%` }}
            ></div>
          </div>

          {/* Stepper Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10 items-stretch">
            {steps.map((item) => {
              const Icon = item.icon;
              const isActive = activeStep === item.step;
              const isPast = activeStep > item.step;

              return (
                <button
                  key={item.step}
                  onClick={() => setActiveStep(item.step)}
                  className={`text-left p-4 rounded-xl transition-all duration-200 border flex flex-col justify-between h-full cursor-pointer ${
                    isActive 
                      ? 'bg-red-50/60 border-red-500 shadow-sm' 
                      : isPast
                        ? 'bg-white border-slate-300 hover:border-red-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-transform duration-200 shrink-0 ${
                      isActive 
                        ? 'bg-red-600 text-white' 
                        : isPast 
                          ? 'bg-red-100 text-red-600 border border-red-200' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`font-mono text-xs font-bold ${isActive ? 'text-red-600' : 'text-slate-400'}`}>
                      0{item.step}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1 font-semibold">
                      {item.subtitle}
                    </span>
                    <h3 className={`text-sm font-bold leading-snug transition-colors ${
                      isActive ? 'text-slate-900' : 'text-slate-700'
                    }`}>
                      {item.title}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Step Detailed Deep-Dive Card */}
        {steps.map((item) => {
          if (item.step !== activeStep) return null;

          return (
            <div 
              key={item.step}
              className="rounded-2xl bg-white p-6 sm:p-8 border border-slate-200 shadow-md transition-all duration-300"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* Left Step Overview */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-md text-xs font-mono font-bold bg-red-600 text-white shadow-sm">
                      {t('citizen.landing.howItWorks.stepBadge', { step: item.step })}
                    </div>
                    <span className="text-xs font-mono text-slate-500 font-semibold">
                      {item.mockMetric}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="text-base text-slate-600 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {item.bulletPoints.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                        <span className="text-xs text-slate-700 font-medium leading-tight">
                          {point}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                    {item.step < 4 ? (
                      <button
                        onClick={() => setActiveStep(item.step + 1)}
                        className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                      >
                        <span>{t('citizen.landing.howItWorks.continueStep', { step: item.step + 1 })}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveStep(1)}
                        className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                      >
                        <span>{t('citizen.landing.howItWorks.restartStep')}</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Step CAD Console Graphic */}
                <div className="lg:col-span-5">
                  <div className="rounded-xl bg-slate-900 p-6 border border-slate-800 shadow-md relative overflow-hidden font-mono">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-[11px]">
                      <span className="text-slate-400">{t('citizen.landing.howItWorks.cadLogTitle')}</span>
                      <span className="font-bold text-red-400">{t('citizen.landing.howItWorks.cadLogOnline')}</span>
                    </div>

                    <div className="space-y-3 text-xs text-slate-300">
                      {item.logs.map((log, idx) => (
                        <div key={idx} className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                          {log.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })}

      </div>
    </section>
  );
};
