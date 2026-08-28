import React, { useState } from 'react';
import { 
  Smartphone, 
  MonitorCheck, 
  Truck, 
  ShieldCheck, 
  MapPin, 
  CheckCircle, 
  ArrowRight, 
  Radio, 
  Activity, 
  HeartHandshake, 
  Layers, 
  Eye,
  FileText,
  UserCheck
} from 'lucide-react';

interface RoleSolutionsSectionProps {
  onOpenSos: () => void;
}

export const RoleSolutionsSection: React.FC<RoleSolutionsSectionProps> = ({ onOpenSos }) => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const roles = [
    {
      id: 1,
      name: 'Citizen Portal',
      subtitle: 'Mobile SOS & Real-Time Tracking',
      icon: Smartphone,
      accentColor: 'from-red-600 to-rose-600',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40',
      borderColor: 'group-hover:border-red-500/80',
      glowColor: 'group-hover:shadow-glow-red',
      description: 'Zero-barrier instant emergency submission for citizens with real-time GPS telemetry, live rescue vehicle maps, and emergency first-aid advice.',
      features: [
        '1-Tap panic button with instant GPS triangulation',
        'Direct photo & audio evidence upload',
        'Live tracking map showing approaching ambulance / fire units',
        'Emergency medical profile & guardian alert sync',
        'Interactive CPR & hemorrhage first-aid guide while waiting'
      ],
      actionLabel: 'Launch Web SOS Demo',
      actionType: 'sos'
    },
    {
      id: 2,
      name: 'Command Center CAD',
      subtitle: 'Live Map & Automated Incident Queue',
      icon: MonitorCheck,
      accentColor: 'from-blue-600 to-indigo-600',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      borderColor: 'group-hover:border-blue-500/80',
      glowColor: 'group-hover:shadow-glow-blue',
      description: 'Comprehensive Computer-Aided Dispatch (CAD) console for dispatchers. Automated AI triaging, multi-agency vehicle coordination, and live incident heatmaps.',
      features: [
        'Global real-time GIS map with vehicle & incident overlays',
        'AI automated priority queue & risk severity indexing',
        'Multi-agency dispatch (Police 113, Fire 114, EMS 115)',
        'Live traffic congestion & hospital bed capacity telemetry',
        'Instant broadcast to all nearby field mobile terminals'
      ],
      actionLabel: 'Open Operator Console',
      actionType: 'link',
      actionHref: '#operator-login'
    },
    {
      id: 3,
      name: 'Rescue Staff HUD',
      subtitle: 'Turn-by-turn Navigation & Closure Logs',
      icon: Truck,
      accentColor: 'from-amber-600 to-orange-600',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      borderColor: 'group-hover:border-amber-500/80',
      glowColor: 'group-hover:shadow-orange-500/20',
      description: 'Ruggedized tactical interface for field responders. Real-time emergency vehicle routing, incident hazard briefings, casualty tagging, and rapid closure reports.',
      features: [
        'Turn-by-turn tactical GPS routing with siren corridor priority',
        'On-scene casualty tagging & triage status updates',
        'Pre-arrival AI hazard briefing (hazmat, fire flashpoints, weapons)',
        'Direct hospital trauma team pre-arrival telemetry link',
        '1-tap voice-assisted digital incident closure report'
      ],
      actionLabel: 'Responder App Preview',
      actionType: 'link',
      actionHref: '#responder-portal'
    }
  ];

  return (
    <section id="roles" className="py-24 bg-[#0B0F19] relative overflow-hidden border-t border-slate-800">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-800/60 shadow-md whitespace-nowrap">
            <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-xs font-mono-data uppercase tracking-widest text-blue-300 font-bold">
              Ecosystem Architecture
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight text-balance">
            Role-Based Solutions for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-red-500">
              Every Emergency Stakeholder
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed text-balance">
            A unified, interconnected ecosystem connecting citizens in peril, command center dispatchers, and front-line first responders seamlessly.
          </p>
        </div>

        {/* 3 Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {roles.map((role) => {
            const Icon = role.icon;

            return (
              <div
                key={role.id}
                onMouseEnter={() => setHoveredCard(role.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`group relative rounded-2xl cad-glass p-7 border border-slate-700/80 transition-all duration-300 flex flex-col justify-between h-full hover:-translate-y-2 ${role.borderColor} ${role.glowColor}`}
              >
                
                {/* Top Corner Decor */}
                <div className="hud-corner-tl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="hud-corner-tr opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div>
                  {/* Card Header Icon & Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${role.accentColor} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono-data font-bold border whitespace-nowrap ${role.badgeColor}`}>
                      ROLE 0{role.id}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="mb-4">
                    <h3 className="text-2xl font-black text-white group-hover:text-blue-300 transition-colors leading-snug text-balance">
                      {role.name}
                    </h3>
                    <p className="text-xs font-mono-data uppercase tracking-wider text-slate-400 font-semibold mt-1 whitespace-nowrap">
                      {role.subtitle}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-300 leading-relaxed mb-6 text-balance">
                    {role.description}
                  </p>

                  {/* Feature Checklist */}
                  <div className="space-y-3 pt-4 border-t border-slate-800 mb-6">
                    {role.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-300 font-medium leading-tight">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-4 border-t border-slate-800">
                  {role.actionType === 'sos' ? (
                    <button
                      onClick={onOpenSos}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm font-mono-data shadow-glow-red flex items-center justify-center gap-2 transition-all whitespace-nowrap"
                    >
                      <span>{role.actionLabel}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  ) : (
                    <a
                      href={role.actionHref}
                      className="w-full py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-sm font-mono-data border border-slate-700 hover:border-blue-500 flex items-center justify-center gap-2 transition-all whitespace-nowrap"
                    >
                      <span>{role.actionLabel}</span>
                      <ArrowRight className="w-4 h-4 text-blue-400 shrink-0" />
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
