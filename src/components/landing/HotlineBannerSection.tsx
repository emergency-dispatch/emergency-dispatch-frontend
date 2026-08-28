import React from 'react';
import { 
  PhoneCall, 
  ShieldAlert, 
  Flame, 
  HeartPulse, 
  Radio, 
  AlertOctagon,
  ArrowUpRight
} from 'lucide-react';

interface HotlineBannerSectionProps {
  onOpenSos: () => void;
}

export const HotlineBannerSection: React.FC<HotlineBannerSectionProps> = ({ onOpenSos }) => {
  const hotlines = [
    {
      number: '113',
      name: 'Police & Public Security',
      vietnameseName: 'Cảnh Sát 113',
      icon: ShieldAlert,
      color: 'from-blue-600 to-indigo-600',
      border: 'border-blue-500/60',
      glow: 'hover:shadow-glow-blue',
      badge: 'Security & Crime',
      tel: 'tel:113'
    },
    {
      number: '114',
      name: 'Fire Fighting & Rescue',
      vietnameseName: 'Cứu Hỏa & Cứu Nạn 114',
      icon: Flame,
      color: 'from-red-600 to-orange-600',
      border: 'border-red-500/60',
      glow: 'hover:shadow-glow-red',
      badge: 'Fire & Extrication',
      tel: 'tel:114'
    },
    {
      number: '115',
      name: 'Emergency Medical Service',
      vietnameseName: 'Cấp Cứu Y Tế 115',
      icon: HeartPulse,
      color: 'from-emerald-600 to-teal-600',
      border: 'border-emerald-500/60',
      glow: 'hover:shadow-emerald-500/20',
      badge: 'Trauma & Cardiac',
      tel: 'tel:115'
    }
  ];

  return (
    <section id="hotlines" className="py-20 bg-[#0B0F19] relative overflow-hidden border-t border-slate-800">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/60 whitespace-nowrap">
              <PhoneCall className="w-3.5 h-3.5 text-red-400 animate-bounce shrink-0" />
              <span className="text-xs font-mono-data text-red-300 font-bold uppercase tracking-wider">
                Direct Emergency Contact
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight text-balance">
              Vietnam National Emergency Hotlines
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed text-balance">
              In extreme life-threatening situations, dial the direct national emergency services or use ResQ-AI Web SOS for synchronized multi-agency dispatch.
            </p>
          </div>

          <button
            onClick={onOpenSos}
            className="self-start md:self-auto px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm font-mono-data shadow-glow-red flex items-center gap-2 border border-red-500 whitespace-nowrap transition-all shrink-0"
          >
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>Launch Web SOS Portal</span>
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
                className={`group rounded-2xl cad-glass p-6 border ${hotline.border} transition-all duration-300 flex flex-col justify-between h-full hover:-translate-y-1.5 ${hotline.glow} relative overflow-hidden`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${hotline.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono-data text-slate-400 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 whitespace-nowrap">
                      {hotline.badge}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-black font-mono-data text-white group-hover:text-red-400 transition-colors whitespace-nowrap">
                        {hotline.number}
                      </span>
                      <span className="text-xs font-mono-data text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">
                        TOLL-FREE 24/7
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-2 leading-snug text-balance">
                      {hotline.name}
                    </h3>
                    <p className="text-xs font-mono-data text-slate-400 whitespace-nowrap">
                      {hotline.vietnameseName}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono-data text-blue-400 font-bold group-hover:text-white transition-colors">
                  <span className="whitespace-nowrap">TAP TO DIAL INSTANTLY</span>
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
                </div>
              </a>
            );
          })}
        </div>

      </div>
    </section>
  );
};
