import React from 'react';
import { 
  Sparkles, 
  BrainCircuit, 
  Navigation, 
  AlertTriangle, 
  Radio, 
  ShieldCheck, 
  Clock, 
  Zap, 
  Layers,
  Database,
  Smartphone,
  Gauge
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: BrainCircuit,
      title: 'Vision-Language AI Triage',
      description: 'Zero-shot multi-modal deep learning models analyze incident images in under 150ms to detect fires, entrapment, weapons, and structural damage.',
      badge: 'Perception Engine',
      color: 'from-red-600 to-rose-600',
      border: 'hover:border-red-500/60',
      glow: 'hover:shadow-glow-red'
    },
    {
      icon: Navigation,
      title: 'Dynamic Traffic-Aware Routing',
      description: 'Algorithmic routing calculates real-time fastest trajectories for emergency fleets, avoiding urban congestion and optimizing siren corridors.',
      badge: 'KD-Tree Geo Router',
      color: 'from-blue-600 to-cyan-600',
      border: 'hover:border-blue-500/60',
      glow: 'hover:shadow-glow-blue'
    },
    {
      icon: Gauge,
      title: 'Automated 5-Level Severity Matrix',
      description: 'Standardized GovTech risk calculation ranking incidents from Level 1 (Minor) to Level 5 (Catastrophic) for automated queue prioritization.',
      badge: 'Auto Triaging',
      color: 'from-amber-600 to-orange-600',
      border: 'hover:border-amber-500/60',
      glow: 'hover:shadow-orange-500/20'
    },
    {
      icon: Radio,
      title: 'Sub-Second Bilateral Telemetry',
      description: 'High-frequency WebSocket synchronization streams live GPS coordinates, vehicle velocities, and ETA counts simultaneously to citizens and responders.',
      badge: 'Real-Time Sync',
      color: 'from-emerald-600 to-teal-600',
      border: 'hover:border-emerald-500/60',
      glow: 'hover:shadow-emerald-500/20'
    },
    {
      icon: Layers,
      title: 'Multi-Agency Dispatch Sync',
      description: 'Synchronous dispatch orchestration across Police (113), Fire & Rescue (114), and EMS (115) with automated hospital emergency bed reserves.',
      badge: 'Unified CAD',
      color: 'from-purple-600 to-indigo-600',
      border: 'hover:border-purple-500/60',
      glow: 'hover:shadow-purple-500/20'
    },
    {
      icon: Smartphone,
      title: 'Zero-Install Web SOS Portal',
      description: 'High-speed progressive web interface accessible via QR code, SMS link, or browser, loading in under 1 second with offline data caching.',
      badge: 'Instant Access',
      color: 'from-pink-600 to-rose-600',
      border: 'hover:border-pink-500/60',
      glow: 'hover:shadow-pink-500/20'
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-100 shadow-xs whitespace-nowrap">
            <Zap className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs font-mono-data uppercase tracking-widest text-red-600 font-bold">
              TÍNH NĂNG NỀN TẢNG CAD
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight text-balance">
            Tối Ưu Hóa Tác Chiến{' '}
            <span className="text-red-600">
              Tốc Độ &amp; Chuẩn Xác
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
            Bộ công cụ điều phối thông minh kết hợp thị giác AI giúp rút ngắn thời gian xử lý sự cố khẩn cấp và bảo vệ tính mạng người dân.
          </p>
        </div>

        {/* 6 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {features.map((feature, idx) => {
            const Icon = feature.icon;

            return (
              <div
                key={idx}
                className="group relative rounded-2xl bg-white p-6 sm:p-7 border border-slate-200 shadow-sm hover:shadow-lg hover:border-red-500 transition-all duration-300 flex flex-col justify-between h-full hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform duration-300 shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono-data text-slate-700 font-bold px-2.5 py-1 rounded bg-slate-100 border border-slate-200 whitespace-nowrap">
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-red-600 transition-colors text-balance leading-snug">
                    {feature.title}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed text-balance">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono-data text-slate-500">
                  <span className="text-red-600 font-semibold whitespace-nowrap">CAD TIÊU CHUẨN</span>
                  <span className="group-hover:text-slate-900 transition-colors whitespace-nowrap">PHÂN HỆ 0{idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
