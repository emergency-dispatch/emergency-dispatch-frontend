import React, { useState } from 'react';
import { 
  Eye, 
  BrainCircuit, 
  AlertTriangle, 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle, 
  Cpu, 
  Layers, 
  Scan, 
  Zap, 
  ChevronRight,
  Sliders,
  Car,
  Users,
  Activity
} from 'lucide-react';

export const AiHighlightSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vlm' | 'risk' | 'resources'>('vlm');
  const [scanActive, setScanActive] = useState<boolean>(true);

  const tags = [
    { label: '#Vehicle_Rollover', confidence: '99.2%', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
    { label: '#Fire_Hazard', confidence: '96.8%', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
    { label: '#Extrication_Needed', confidence: '94.5%', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
    { label: '#Road_Obstruction', confidence: '98.1%', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
    { label: '#Multi_Casualty_Risk', confidence: '91.7%', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
    { label: '#VLM_Vision_Analysis', confidence: '99.8%', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
  ];

  return (
    <section id="ai-technology" className="py-24 bg-[#0B0F19] relative overflow-hidden border-t border-b border-slate-800/80">
      
      {/* Background Neon Aura */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/70 border border-blue-800/60 shadow-lg shadow-blue-950/50 whitespace-nowrap">
            <BrainCircuit className="w-4 h-4 text-blue-400 animate-pulse shrink-0" />
            <span className="text-xs font-mono-data uppercase tracking-widest text-blue-300 font-bold">
              Vision-Language AI Technology
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight text-balance">
            Sub-Second Emergency Perception &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-400">
              Hazard Inference
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed text-balance">
            Our multi-modal VLM models analyze uploaded citizen photos, video streams, and audio transcripts in under 200ms—classifying critical hazards before the call even finishes ringing.
          </p>
        </div>

        {/* Main Interactive AI Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Visual AI Incident Demonstration Card */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="relative rounded-2xl cad-glass p-4 sm:p-5 border border-slate-700/80 shadow-2xl flex-1 flex flex-col justify-between overflow-hidden group">
              
              {/* Header Info */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-ping"></div>
                  <span className="text-xs font-mono-data font-bold text-white tracking-wider">
                    LIVE INFERENCE STREAM #VLM-9021
                  </span>
                </div>
                <button
                  onClick={() => setScanActive(!scanActive)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono-data text-blue-400 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>{scanActive ? 'AI Scan: ACTIVE' : 'AI Scan: PAUSED'}</span>
                </button>
              </div>

              {/* Photo Card with AI Bounding Boxes */}
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner aspect-[16/10] sm:aspect-[16/9]">
                
                {/* Incident Image */}
                <img 
                  src="/assets/mock_traffic_accident.jpg" 
                  alt="AI Emergency Traffic Incident"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Laser Scanning Effect */}
                {scanActive && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-glow-cyan animate-scanline opacity-75 pointer-events-none"></div>
                )}

                {/* Bounding Box 1: Primary Collision Area */}
                <div className="absolute top-[35%] left-[25%] w-[48%] h-[46%] border-2 border-red-500 bg-red-500/10 rounded-lg pointer-events-none animate-pulse">
                  <div className="absolute -top-6 left-0 bg-red-600 text-white font-mono-data text-[10px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                    <Car className="w-3 h-3" />
                    <span>#Vehicle_Collision (99.2%)</span>
                  </div>
                </div>

                {/* Bounding Box 2: Fire / Thermal Flare */}
                <div className="absolute top-[48%] left-[58%] w-[18%] h-[30%] border-2 border-orange-500 bg-orange-500/15 rounded-md pointer-events-none">
                  <div className="absolute -top-6 right-0 bg-orange-600 text-white font-mono-data text-[10px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    <span>#Fire_Flare (96.8%)</span>
                  </div>
                </div>

                {/* Bounding Box 3: Responders on Scene */}
                <div className="absolute top-[30%] right-[8%] w-[16%] h-[40%] border-2 border-blue-500 bg-blue-500/10 rounded-md pointer-events-none">
                  <div className="absolute -top-6 left-0 bg-blue-600 text-white font-mono-data text-[10px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>#Personnel (94.5%)</span>
                  </div>
                </div>

                {/* Corner HUD Overlay */}
                <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-3 py-1.5 rounded-lg font-mono-data text-[11px] text-slate-300 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>LATENCY: <strong className="text-white">142ms</strong></span>
                  <span className="text-slate-600">|</span>
                  <span>TOKENS: <strong className="text-white">1,280</strong></span>
                </div>

              </div>

              {/* Surrounding AI Inference Tags */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <p className="text-xs text-slate-400 font-mono-data uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Detected Hazard Vectors &amp; Semantic Entities:
                </p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span 
                      key={tag.label} 
                      className={`px-2.5 py-1 rounded-md text-xs font-mono-data font-bold border transition-all duration-200 hover:scale-105 cursor-default ${tag.color}`}
                    >
                      {tag.label} <span className="opacity-75 text-[10px]">[{tag.confidence}]</span>
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: AI Triage & Severity Score Panel */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            
            {/* Severity Level Banner Card */}
            <div className="rounded-2xl cad-glass p-6 border-2 border-red-500/70 shadow-glow-red relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-red-600 text-white shadow-md">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">AI Severity Assessment</h3>
                    <p className="text-xs font-mono-data text-red-400 font-semibold">AUTOMATED TRIAGE RESULT</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="px-3 py-1 rounded-lg bg-red-600 text-white font-black text-sm font-mono-data shadow-lg">
                    Level 4 / 5
                  </div>
                  <span className="text-[10px] font-mono-data text-slate-400">HIGH RISK ALERT</span>
                </div>
              </div>

              {/* 5-Step Severity Bar */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-[11px] font-mono-data text-slate-400">
                  <span>Level 1: Minor</span>
                  <span>Level 3: Moderate</span>
                  <span className="text-red-400 font-bold">Level 4: Severe</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 h-3">
                  <div className="bg-emerald-500 rounded-sm"></div>
                  <div className="bg-amber-500 rounded-sm"></div>
                  <div className="bg-orange-500 rounded-sm"></div>
                  <div className="bg-red-600 rounded-sm shadow-glow-red animate-pulse"></div>
                  <div className="bg-slate-800 rounded-sm border border-slate-700"></div>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                <strong className="text-white">AI Verdict:</strong> High-energy vehicular impact with fuel spillage risk and trapped occupants detected. Automated dispatch recommends simultaneous EMS and Heavy Rescue response.
              </p>
            </div>

            {/* Interactive Mode Tabs */}
            <div className="rounded-2xl cad-glass p-6 border border-slate-700 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                  <span className="text-xs font-mono-data uppercase tracking-wider text-slate-400 font-bold">
                    AI Decision Pipeline
                  </span>
                  <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setActiveTab('vlm')}
                      className={`px-3 py-1 text-xs font-mono-data rounded-md font-bold transition-all ${
                        activeTab === 'vlm' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Perception
                    </button>
                    <button
                      onClick={() => setActiveTab('risk')}
                      className={`px-3 py-1 text-xs font-mono-data rounded-md font-bold transition-all ${
                        activeTab === 'risk' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Risk Analysis
                    </button>
                    <button
                      onClick={() => setActiveTab('resources')}
                      className={`px-3 py-1 text-xs font-mono-data rounded-md font-bold transition-all ${
                        activeTab === 'resources' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Dispatch Auto-Plan
                    </button>
                  </div>
                </div>

                {/* Tab 1: Perception Content */}
                {activeTab === 'vlm' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-300 font-mono-data">
                        <span className="text-cyan-400 font-bold">● VLM Vision Token Extraction</span>
                        <span>Confidence: 99.1%</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed font-mono-data">
                        "Visual telemetry identifies two sedan vehicles in head-on configuration. Structural cabin intrusion on driver side exceeds 30cm. Active smoke flare at engine bay."
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono-data text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>Zero Hallucination Guard: PASSED (99.8% Reliability)</span>
                    </div>
                  </div>
                )}

                {/* Tab 2: Risk Content */}
                {activeTab === 'risk' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono-data">
                        <span className="text-slate-300">Entrapment Probability</span>
                        <span className="text-red-400 font-bold">94.5% (High)</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full w-[94.5%]"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono-data">
                        <span className="text-slate-300">Thermal Combustion Hazard</span>
                        <span className="text-orange-400 font-bold">88.2% (Moderate-High)</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full w-[88.2%]"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Resource Dispatch Content */}
                {activeTab === 'resources' && (
                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono-data">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-white font-bold">1x Advanced Life Support Ambulance</span>
                      </div>
                      <span className="text-emerald-400">ETA 3m 40s</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono-data">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        <span className="text-white font-bold">1x Heavy Extrication Fire Engine</span>
                      </div>
                      <span className="text-red-400">ETA 2m 15s</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono-data">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span className="text-white font-bold">2x Traffic Police Patrol Units</span>
                      </div>
                      <span className="text-blue-400">On Scene</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono-data text-slate-400">
                <span>Algorithmic Optimization</span>
                <span className="text-blue-400 font-bold">Dynamic Multi-Unit CAD Sync</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
