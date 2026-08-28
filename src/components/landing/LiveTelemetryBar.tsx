import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  Radio, 
  ShieldCheck, 
  Zap, 
  Clock, 
  Server, 
  AlertCircle,
  Truck
} from 'lucide-react';

export const LiveTelemetryBar: React.FC = () => {
  const [activeIncidents, setActiveIncidents] = useState(14);
  const [dispatchedVehicles, setDispatchedVehicles] = useState(38);
  const [avgLatency, setAvgLatency] = useState(138);

  // Periodic subtle fluctuation simulator for live feeling
  useEffect(() => {
    const interval = setInterval(() => {
      setAvgLatency(135 + Math.floor(Math.random() * 12));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#080C14] border-y border-slate-800/80 py-3.5 px-4 sm:px-6 lg:px-8 font-mono-data text-xs overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Left Status Marker */}
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-slate-200 font-bold tracking-wider">
            CAD CLUSTER STATUS: <span className="text-emerald-400">OPTIMAL</span>
          </span>
          <span className="hidden sm:inline-block text-slate-600">|</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span>NODE: AP-SOUTHEAST-VN</span>
          </span>
        </div>

        {/* Real-Time Metrics Ticker */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-400">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Inference: <strong className="text-white">{avgLatency}ms</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Units: <strong className="text-white">{dispatchedVehicles} Dispatched</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>Active CAD Queue: <strong className="text-red-400">{activeIncidents} Cases</strong></span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-Trust Encryption: <strong className="text-emerald-400">AES-256 GCM</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
};
