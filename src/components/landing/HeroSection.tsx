import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Radio,
  Compass,
  Flame,
  ShieldCheck,
  Truck,
  Clock,
  ArrowRight,
  MapPin,
  Zap
} from 'lucide-react';

interface HeroSectionProps {
  onOpenSos: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenSos }) => {
  const [etaTime, setEtaTime] = useState(135); // seconds

  // ETA countdown simulator
  useEffect(() => {
    const timer = setInterval(() => {
      setEtaTime((prev) => (prev > 45 ? prev - 1 : 135));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatEta = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <section className="relative h-screen min-h-[620px] max-h-[1080px] pt-16 pb-4 sm:pt-20 sm:pb-5 overflow-hidden bg-slate-50 cad-grid-bg flex flex-col justify-between">
      {/* Subtle Warm Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-red-100/50 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full flex-1 flex flex-col justify-between py-1">
        
        {/* 1. Headline */}
        <div className="text-center pt-1 pb-1 shrink-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-5xl mx-auto">
            <span className="text-red-600">AI Emergency</span> Dispatch &amp; Real-Time{' '}
            <span className="text-slate-900">Rescue Coordination</span>
          </h1>
        </div>

        {/* 2. Full-Width Tactical Map Card */}
        <div className="w-full relative flex-1 flex flex-col my-1 min-h-[220px] max-h-[58vh]">
          <div className="relative rounded-2xl bg-white p-3 sm:p-4 shadow-xl border border-slate-200 overflow-hidden group flex-1 flex flex-col justify-between">
            {/* Top HUD Header Bar */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs font-mono-data shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                <span className="text-red-600 font-bold tracking-wider">LIVE CAD INCIDENT RADAR</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-[11px] sm:text-xs">
                <span className="flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  <span>FREQ: 148.25 MHz</span>
                </span>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <span className="text-slate-700 font-semibold hidden sm:inline">GRID: VN-HN-04</span>
              </div>
            </div>

            {/* Interactive Tactical Map Screen Mockup */}
            <div className="relative flex-1 min-h-[160px] rounded-xl bg-slate-900 border border-slate-800 overflow-hidden cad-radar-grid">
              {/* Rotating Radar Sweep Line */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                <div className="w-[550px] h-[550px] rounded-full border border-red-500/20 flex items-center justify-center">
                  <div className="w-[380px] h-[380px] rounded-full border border-red-500/30 flex items-center justify-center">
                    <div className="w-[200px] h-[200px] rounded-full border border-red-500/40"></div>
                  </div>
                </div>
                <div className="absolute w-[550px] h-[550px] rounded-full animate-radar-sweep bg-gradient-to-tr from-red-500/10 via-transparent to-transparent origin-center"></div>
              </div>

              {/* Simulated Street Grid Vectors */}
              <svg className="absolute inset-0 w-full h-full stroke-slate-700/80 stroke-[1.5] fill-none pointer-events-none" viewBox="0 0 1200 500" preserveAspectRatio="none">
                <path d="M 0,120 Q 300,160 640,110 T 1200,180" stroke="rgba(100, 116, 139, 0.4)" strokeWidth="3" />
                <path d="M 240,0 L 280,500" />
                <path d="M 760,0 L 720,500" />
                <path d="M 960,0 L 930,500" />
                <path d="M 0,330 L 1200,300" stroke="rgba(100, 116, 139, 0.4)" strokeWidth="3" />
                {/* Active Rescue Path */}
                <path
                  d="M 120,420 Q 360,340 560,240 T 720,180"
                  stroke="#3B82F6"
                  strokeWidth="3.5"
                  strokeDasharray="8,8"
                  className="animate-pulse"
                />
                {/* Fire Truck Path (Red Dash) */}
                <path
                  d="M 1040,450 Q 900,330 720,180"
                  stroke="#DC2626"
                  strokeWidth="3"
                  strokeDasharray="6,6"
                />
              </svg>

              {/* Incident Epicenter Marker */}
              <div className="absolute top-[36%] left-[60%] -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-red-500 opacity-60"></span>
                  <span className="animate-pulse absolute inline-flex h-10 w-10 rounded-full bg-red-600/40"></span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-600 border-2 border-white shadow-lg shadow-red-500/50 flex items-center justify-center text-white cursor-pointer hover:scale-125 transition-transform">
                    <Flame className="w-4 h-4 animate-bounce" />
                  </div>
                </div>
              </div>

              {/* Rescue Vehicle Marker 1: Ambulance AM-04 */}
              <div className="absolute top-[55%] left-[32%] -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-2 group/unit cursor-pointer">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 border border-emerald-400 text-white flex items-center justify-center shadow-md">
                  <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="bg-slate-900/95 border border-emerald-500/50 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono-data text-emerald-300 font-bold whitespace-nowrap shadow-md">
                  EMS AM-04 <span className="text-white">({formatEta(etaTime)})</span>
                </div>
              </div>

              {/* Rescue Vehicle Marker 2: Fire Engine FE-09 */}
              <div className="absolute top-[68%] left-[78%] -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-2 group/unit cursor-pointer">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-600 border border-red-400 text-white flex items-center justify-center shadow-md">
                  <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="bg-slate-900/95 border border-red-500/50 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono-data text-red-300 font-bold whitespace-nowrap shadow-md">
                  FIRE FE-09 <span className="text-white">(1.4 km)</span>
                </div>
              </div>

              {/* Rescue Vehicle Marker 3: Police PC-02 */}
              <div className="absolute top-[20%] left-[52%] -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-blue-600 border border-blue-400 text-white flex items-center justify-center shadow-md">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="bg-slate-900/95 border border-blue-500/50 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono-data text-blue-300 font-semibold whitespace-nowrap">
                  PC-02 ON SCENE
                </div>
              </div>

              {/* Floating AI Hazard Classification Badge */}
              <div className="absolute top-2.5 left-2.5 z-30 animate-float-slow">
                <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-xl max-w-[200px] sm:max-w-[240px] text-left">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] sm:text-[11px] font-mono-data font-bold text-red-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                      AI INCIDENT #8942
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] sm:text-[10px] font-extrabold font-mono-data">
                      SEVERITY 4/5
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-800 leading-tight truncate">
                    Multi-Vehicle Crash w/ Fire Hazard
                  </p>
                  <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[10px] font-mono-data text-slate-500">
                    <span>VLM Confidence</span>
                    <span className="text-red-600 font-bold">98.4%</span>
                  </div>
                </div>
              </div>

              {/* Floating GPS Telemetry Pill */}
              <div className="absolute bottom-2.5 right-2.5 z-30">
                <div className="bg-white/95 backdrop-blur-md border border-slate-200 px-2 py-1 sm:px-3 sm:py-1 rounded-lg text-[9px] sm:text-[11px] font-mono-data text-slate-700 flex items-center gap-1.5 shadow-md">
                  <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600 animate-spin" />
                  <span>21.0285° N, 105.8542° E</span>
                </div>
              </div>
            </div>

            {/* Bottom Telemetry Strip */}
            <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono-data text-slate-600 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">DISPATCH STATUS:</span>
                <span className="text-red-600 font-bold">3 UNITS ASSIGNED</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600" />
                <span>ETA TO IMPACT: <strong className="text-slate-900">{formatEta(etaTime)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Action Area: Left Guide Note + Center SOS Button + Right Guide Note */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 pt-1.5 pb-1 shrink-0">
          
          {/* Left Guide Note: How to Report */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-left w-full md:w-auto md:flex-1 max-w-md shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-red-600">
              <MapPin className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Báo nạn 1-Chạm</span>
                <span className="text-[9px] font-mono-data px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 font-bold">Không cần đăng nhập</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Bấm nút SOS để gửi định vị GPS &amp; ảnh hiện trường tức thì
              </p>
            </div>
          </div>

          {/* Center Main Action: Emergency SOS Button */}
          <button
            onClick={onOpenSos}
            className="group relative px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm sm:text-base tracking-wide shadow-lg shadow-red-500/30 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 border border-red-600 flex items-center justify-center gap-2.5 overflow-hidden whitespace-nowrap shrink-0 w-full sm:w-auto min-w-[220px]"
            id="hero-submit-sos-btn"
          >
            <AlertOctagon className="w-5 h-5 text-white animate-bounce shrink-0" />
            <span>Gửi Báo Cứu Nạn SOS</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {/* Right Guide Note: AI Coordination */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-left w-full md:w-auto md:flex-1 max-w-md shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-red-600">
              <Zap className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">AI Phân loại &lt; 45s</span>
                <span className="text-[9px] font-mono-data px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">Tự động</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                AI phân tích mức độ ưu tiên &amp; đề xuất điều phối xe gần nhất
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
