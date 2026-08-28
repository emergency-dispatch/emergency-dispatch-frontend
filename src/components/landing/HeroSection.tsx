import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  Send,
  LogIn,
  Activity,
  Radio,
  MapPin,
  Compass,
  Navigation,
  Flame,
  ShieldCheck,
  Truck,
  Sparkles,
  Clock,
  CheckCircle2,
  Radar,
  Layers,
  ArrowRight,
  TrendingDown
} from 'lucide-react';

interface HeroSectionProps {
  onOpenSos: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenSos }) => {
  const [pulseCount, setPulseCount] = useState(0);
  const [etaTime, setEtaTime] = useState(135); // seconds

  // ETA countdown simulator
  useEffect(() => {
    const timer = setInterval(() => {
      setEtaTime((prev) => (prev > 45 ? prev - 1 : 135));
      setPulseCount((c) => (c + 1) % 100);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatEta = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden cad-grid-bg">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left Column: Hero Copy & CTA */}
          <div className="lg:col-span-6 space-y-6 text-left flex flex-col justify-center">

            {/* High-Tech Status Pill */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-lg shadow-black/40 backdrop-blur-md self-start whitespace-nowrap">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
              </span>
              <span className="text-xs font-mono-data text-slate-300 font-semibold tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                AUTONOMOUS CAD &amp; DISPATCH SYSTEM
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                LIVE
              </span>
            </div>

            {/* Bold Headline (Prevent Orphan Words with text-balance) */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] text-balance">
              Next-Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-red-600">AI Emergency</span> Dispatch &amp; Real-Time{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500">Rescue Coordination</span>
            </h1>

            {/* Subheadline (text-balance) */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-xl text-balance">
              Slashing critical response times through instant citizen media triage,
              <strong className="text-white font-semibold"> Vision-Language AI hazard assessment</strong>, and algorithmic multi-agency vehicle routing.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                onClick={onOpenSos}
                className="group relative px-7 py-4 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-red-700 text-white font-black text-base tracking-wide shadow-glow-red hover:shadow-glow-red-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border border-red-500 flex items-center justify-center gap-3 overflow-hidden whitespace-nowrap"
                id="hero-submit-sos-btn"
              >
                <div className="absolute inset-0 bg-white/15 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                <AlertOctagon className="w-5 h-5 text-white animate-bounce shrink-0" />
                <span>Submit Web SOS</span>
                <ArrowRight className="w-4 h-4 text-red-200 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              <Link
                to="/login"
                className="px-6 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-base border border-slate-700 hover:border-blue-500 hover:shadow-glow-blue transition-all duration-300 flex items-center justify-center gap-2.5 backdrop-blur-md whitespace-nowrap shadow-md"
              >
                <LogIn className="w-5 h-5 text-blue-400 shrink-0" />
                <span>Sign In</span>
              </Link>
            </div>

            {/* Key Performance Metrics Ticker */}
            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4 max-w-lg items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-red-400">
                  <TrendingDown className="w-4 h-4 shrink-0" />
                  <span className="text-2xl font-black font-mono-data text-white">&lt; 45s</span>
                </div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-mono-data font-medium whitespace-nowrap">Avg Dispatch</p>
              </div>

              <div className="space-y-1 border-l border-slate-800 pl-4">
                <div className="flex items-center gap-1.5 text-blue-400">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span className="text-2xl font-black font-mono-data text-white">98.4%</span>
                </div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-mono-data font-medium whitespace-nowrap">AI Accuracy</p>
              </div>

              <div className="space-y-1 border-l border-slate-800 pl-4">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Activity className="w-4 h-4 shrink-0" />
                  <span className="text-2xl font-black font-mono-data text-white">24/7</span>
                </div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-mono-data font-medium whitespace-nowrap">CAD Telemetry</p>
              </div>
            </div>

          </div>

          {/* Right Column: Dynamic 3D Glassmorphism Command Center Map Mockup */}
          <div className="lg:col-span-6 relative">

            {/* Glass Container Card with Tactical HUD Styling */}
            <div className="relative rounded-2xl cad-glass p-4 sm:p-5 shadow-2xl border border-slate-700/80 overflow-hidden group">

              {/* HUD Decorative Corners */}
              <div className="hud-corner-tl"></div>
              <div className="hud-corner-tr"></div>
              <div className="hud-corner-bl"></div>
              <div className="hud-corner-br"></div>

              {/* Top HUD Header Bar */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs font-mono-data">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                  <span className="text-red-400 font-bold tracking-wider">LIVE CAD INCIDENT RADAR</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <span className="flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                    <span>FREQ: 148.25 MHz</span>
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-blue-400 font-semibold">GRID: VN-HN-04</span>
                </div>
              </div>

              {/* Interactive Tactical Map Screen Mockup */}
              <div className="relative h-[340px] sm:h-[380px] rounded-xl bg-slate-950/90 border border-slate-800 overflow-hidden cad-radar-grid">

                {/* Rotating Radar Sweep Line */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                  <div className="w-[500px] h-[500px] rounded-full border border-blue-500/20 flex items-center justify-center">
                    <div className="w-[340px] h-[340px] rounded-full border border-blue-500/30 flex items-center justify-center">
                      <div className="w-[180px] h-[180px] rounded-full border border-blue-500/40"></div>
                    </div>
                  </div>
                  <div className="absolute w-[500px] h-[500px] rounded-full animate-radar-sweep bg-gradient-to-tr from-blue-500/10 via-transparent to-transparent origin-center"></div>
                </div>

                {/* Simulated Street Grid Vectors */}
                <svg className="absolute inset-0 w-full h-full stroke-slate-800/80 stroke-[1.5] fill-none pointer-events-none">
                  <path d="M 0,80 Q 150,110 320,70 T 600,120" stroke="rgba(75, 85, 99, 0.4)" strokeWidth="3" />
                  <path d="M 120,0 L 140,400" />
                  <path d="M 380,0 L 360,400" />
                  <path d="M 0,220 L 600,200" stroke="rgba(75, 85, 99, 0.4)" strokeWidth="3" />
                  {/* Active Rescue Path (Electric Blue Dash) */}
                  <path
                    d="M 60,300 Q 180,240 280,170 T 360,130"
                    stroke="#2563EB"
                    strokeWidth="3"
                    strokeDasharray="6,6"
                    className="animate-pulse"
                  />
                  {/* Fire Truck Path (Red Dash) */}
                  <path
                    d="M 520,320 Q 450,230 360,130"
                    stroke="#DC2626"
                    strokeWidth="2.5"
                    strokeDasharray="5,5"
                  />
                </svg>

                {/* Incident Epicenter Marker (Emergency Red Pulsing Ring) */}
                <div className="absolute top-[130px] left-[360px] -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-red-500 opacity-60"></span>
                    <span className="animate-pulse absolute inline-flex h-10 w-10 rounded-full bg-red-600/40"></span>
                    <div className="w-7 h-7 rounded-full bg-red-600 border-2 border-white shadow-glow-red flex items-center justify-center text-white cursor-pointer hover:scale-125 transition-transform">
                      <Flame className="w-4 h-4 animate-bounce" />
                    </div>
                  </div>
                </div>

                {/* Rescue Vehicle Marker 1: Ambulance AM-04 */}
                <div className="absolute top-[210px] left-[200px] -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-2 group/unit cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/90 border border-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-900/90 border border-emerald-500/50 px-2 py-0.5 rounded text-[10px] font-mono-data text-emerald-300 font-bold whitespace-nowrap shadow-md">
                    EMS AM-04 <span className="text-white">({formatEta(etaTime)})</span>
                  </div>
                </div>

                {/* Rescue Vehicle Marker 2: Fire Engine FE-09 */}
                <div className="absolute top-[240px] left-[460px] -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-2 group/unit cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-red-600/90 border border-red-400 text-white flex items-center justify-center shadow-lg shadow-red-500/30">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-900/90 border border-red-500/50 px-2 py-0.5 rounded text-[10px] font-mono-data text-red-300 font-bold whitespace-nowrap shadow-md">
                    FIRE FE-09 <span className="text-white">(1.4 km)</span>
                  </div>
                </div>

                {/* Rescue Vehicle Marker 3: Police PC-02 */}
                <div className="absolute top-[90px] left-[320px] -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-600 border border-blue-400 text-white flex items-center justify-center shadow-md">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-slate-900/90 border border-blue-500/50 px-1.5 py-0.5 rounded text-[9px] font-mono-data text-blue-300 font-semibold whitespace-nowrap">
                    PC-02 ON SCENE
                  </div>
                </div>

                {/* Floating AI Hazard Classification Badge */}
                <div className="absolute top-3 left-3 z-30 animate-float-slow">
                  <div className="bg-slate-900/95 backdrop-blur-md border border-red-500/70 rounded-xl p-3 shadow-xl max-w-[240px]">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono-data font-bold text-red-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        AI INCIDENT #8942
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-extrabold font-mono-data">
                        SEVERITY 4/5
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-100 leading-tight">
                      Multi-Vehicle Crash w/ Fire Hazard
                    </p>
                    <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono-data text-slate-400">
                      <span>VLM Confidence</span>
                      <span className="text-emerald-400 font-bold">98.4%</span>
                    </div>
                  </div>
                </div>

                {/* Floating GPS Telemetry Pill */}
                <div className="absolute bottom-3 right-3 z-30">
                  <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 px-3 py-1.5 rounded-lg text-[11px] font-mono-data text-slate-300 flex items-center gap-2 shadow-lg">
                    <Compass className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                    <span>21.0285° N, 105.8542° E</span>
                  </div>
                </div>

              </div>

              {/* Bottom Telemetry Strip */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-data text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-medium">DISPATCH STATUS:</span>
                  <span className="text-emerald-400 font-bold">3 UNITS ASSIGNED</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-red-400" />
                  <span>ETA TO IMPACT: <strong className="text-white">{formatEta(etaTime)}</strong></span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
