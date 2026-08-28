import React, { useState } from 'react';
import { 
  AlertCircle, 
  BrainCircuit, 
  Send, 
  MapPin, 
  Truck, 
  Navigation, 
  ShieldCheck, 
  Camera, 
  Radio, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Layers,
  Clock
} from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      step: 1,
      id: 'step-1',
      title: 'One-Touch SOS & Media Capture',
      subtitle: 'Citizen Instant Trigger',
      icon: Camera,
      badgeColor: 'from-red-600 to-rose-600',
      badgeBorder: 'border-red-500',
      textColor: 'text-red-400',
      description: 'Citizens report emergencies with 1 tap. High-precision GPS coordinates, photos, and voice notes are captured and streamed instantly without requiring app installation.',
      bulletPoints: [
        'Automatic sub-5m GPS triangulation',
        'Direct multi-photo & audio streaming',
        'Silent panic mode for high-risk situations',
        'Zero registration barrier for critical speed'
      ],
      mockMetric: 'Report Time: < 3.2s'
    },
    {
      step: 2,
      id: 'step-2',
      title: 'AI Hazard Scoring & Verification',
      subtitle: 'Vision-Language Triaging',
      icon: BrainCircuit,
      badgeColor: 'from-blue-600 to-indigo-600',
      badgeBorder: 'border-blue-500',
      textColor: 'text-blue-400',
      description: 'Our proprietary Vision-Language Model inspects live images, classifies hazard categories (Fire, Hazmat, Collision), detects entrapment risks, and assigns a calibrated 1-5 severity index.',
      bulletPoints: [
        'VLM-powered multi-modal perception',
        'Automated false-alarm & spam filtering',
        'Instant casualty count estimation',
        'Risk vector extraction in under 200ms'
      ],
      mockMetric: 'AI Inference: 142ms'
    },
    {
      step: 3,
      id: 'step-3',
      title: 'Nearest-Unit Automated Dispatch',
      subtitle: 'Algorithmic Resource Routing',
      icon: Truck,
      badgeColor: 'from-amber-600 to-orange-600',
      badgeBorder: 'border-amber-500',
      textColor: 'text-amber-400',
      description: 'The CAD engine instantly calculates the fastest response units across Fire, Police, and EMS bases, matching available on-board equipment and live traffic conditions.',
      bulletPoints: [
        'Multi-agency resource clustering',
        'Traffic-aware dynamic routing',
        'Automated station siren & mobile paging',
        'Equipment-to-hazard capability matching'
      ],
      mockMetric: 'Dispatch Latency: < 15s'
    },
    {
      step: 4,
      id: 'step-4',
      title: 'Live Map Tracking & Synchronized ETA',
      subtitle: 'Bilateral Coordination HUD',
      icon: Navigation,
      badgeColor: 'from-emerald-600 to-teal-600',
      badgeBorder: 'border-emerald-500',
      textColor: 'text-emerald-400',
      description: 'Citizens and dispatchers track approaching responders in real time with synchronized ETAs, direct emergency VoIP channels, and interactive first-aid guidance.',
      bulletPoints: [
        'Live sub-second telemetry tracking',
        'Dynamic real-time ETA recalculation',
        'Encrypted first-responder voice link',
        'Instant digital incident closure log'
      ],
      mockMetric: 'Sync Latency: < 50ms'
    }
  ];

  return (
    <section id="workflow" className="py-24 bg-[#0F172A] relative overflow-hidden cad-grid-bg">
      
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-red-600/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 shadow-md whitespace-nowrap">
            <Layers className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-xs font-mono-data uppercase tracking-widest text-slate-300 font-bold">
              Autonomous Dispatch Workflow
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight text-balance">
            How ResQ-AI Operates in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-blue-500">
              4 Critical Steps
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed text-balance">
            From the instant a citizen taps SOS to the moment responders arrive on scene, every millisecond is orchestrated with computational precision.
          </p>
        </div>

        {/* 4-Step Horizontal Stepper Header (Desktop & Mobile) */}
        <div className="relative mb-12">
          
          {/* Connecting Track Line behind steps (Hidden on small mobile) */}
          <div className="hidden md:block absolute top-7 left-[8%] right-[8%] h-0.5 bg-slate-800 z-0">
            <div 
              className="h-full bg-gradient-to-r from-red-500 via-blue-500 to-emerald-500 transition-all duration-500"
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
                  className={`text-left p-4 rounded-xl transition-all duration-300 border flex flex-col justify-between h-full ${
                    isActive 
                      ? 'bg-slate-900/90 border-blue-500 shadow-glow-blue scale-[1.02]' 
                      : isPast
                        ? 'bg-slate-900/60 border-slate-700 hover:border-slate-600'
                        : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black font-mono-data text-sm shadow-md transition-transform duration-300 shrink-0 ${
                      isActive 
                        ? 'bg-gradient-to-br ' + item.badgeColor + ' text-white scale-110' 
                        : isPast 
                          ? 'bg-slate-800 text-blue-400 border border-slate-700' 
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono-data text-xs font-bold text-slate-500 whitespace-nowrap">
                      0{item.step}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono-data uppercase tracking-wider text-slate-400 block mb-0.5 whitespace-nowrap font-semibold">
                      {item.subtitle}
                    </span>
                    <h3 className={`text-sm font-bold leading-snug transition-colors text-balance ${
                      isActive ? 'text-white' : 'text-slate-300'
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
          const Icon = item.icon;

          return (
            <div 
              key={item.step}
              className="rounded-2xl cad-glass p-6 sm:p-8 border border-slate-700 shadow-2xl transition-all duration-500 animate-fadeIn"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* Left Step Overview */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-md text-xs font-mono-data font-black bg-gradient-to-r ${item.badgeColor} text-white shadow-md`}>
                      PHASE 0{item.step} OF 04
                    </div>
                    <span className="text-xs font-mono-data text-slate-400 font-semibold">
                      {item.mockMetric}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    {item.title}
                  </h3>

                  <p className="text-base text-slate-300 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {item.bulletPoints.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                        <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${item.textColor}`} />
                        <span className="text-xs text-slate-200 font-medium leading-tight">
                          {point}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
                    {item.step < 4 ? (
                      <button
                        onClick={() => setActiveStep(item.step + 1)}
                        className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wider uppercase font-mono-data flex items-center gap-2 transition-all shadow-glow-blue"
                      >
                        <span>Advance to Step 0{item.step + 1}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveStep(1)}
                        className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wider uppercase font-mono-data flex items-center gap-2 transition-all"
                      >
                        <span>Restart Workflow Demo</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Step Visual CAD Graphic */}
                <div className="lg:col-span-5">
                  <div className="rounded-xl bg-slate-950 p-6 border border-slate-800 shadow-inner relative overflow-hidden font-mono-data">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-[11px]">
                      <span className="text-slate-400">TELEMETRY SIMULATOR</span>
                      <span className={`font-bold ${item.textColor}`}>ACTIVE LOG</span>
                    </div>

                    <div className="space-y-3 text-xs text-slate-300">
                      {item.step === 1 && (
                        <>
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                            <span className="text-red-400 font-bold">[14:32:01.04]</span> SOS Packet Received from Citizen Client #8942
                          </div>
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                            <span className="text-blue-400 font-bold">[14:32:01.12]</span> GPS coordinates locked: 21.0285, 105.8542 (±2.8m)
                          </div>
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                            <span className="text-emerald-400 font-bold">[14:32:01.45]</span> 2 High-Res Images &amp; 1 Voice Memo Uploaded
                          </div>
                        </>
                      )}

                      {item.step === 2 && (
                        <>
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                            <span className="text-cyan-400 font-bold">[14:32:01.62]</span> VLM Engine dispatched inference job #VLM-9021
                          </div>
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                            <span className="text-amber-400 font-bold">[14:32:01.76]</span> Classified: Vehicle Rollover (0.99), Fire Hazard (0.96)
                          </div>
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                            <span className="text-red-400 font-bold">[14:32:01.80]</span> Final Score: Level 4 (Severe) -&gt; Broadcasted to CAD
                          </div>
                        </>
                      )}

                      {item.step === 3 && (
                        <>
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                            <span className="text-blue-400 font-bold">[14:32:01.95]</span> Geo-Spatial KD-Tree query executed across 32 stations
                          </div>
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                            <span className="text-emerald-400 font-bold">[14:32:02.10]</span> Unit AM-04 (EMS) Assigned -&gt; Alert Acknowledged
                          </div>
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                            <span className="text-red-400 font-bold">[14:32:02.25]</span> Unit FE-09 (Rescue) Assigned -&gt; Route Optimized
                          </div>
                        </>
                      )}

                      {item.step === 4 && (
                        <>
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                            <span className="text-emerald-400 font-bold">[14:32:03.00]</span> WebSocket HUD stream connected to Citizen
                          </div>
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                            <span className="text-blue-400 font-bold">[14:32:05.40]</span> AM-04 Speed: 68 km/h | ETA updated to 3m 40s
                          </div>
                          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                            <span className="text-cyan-400 font-bold">[14:32:08.10]</span> Two-way tactical voice channel standby ready
                          </div>
                        </>
                      )}
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
