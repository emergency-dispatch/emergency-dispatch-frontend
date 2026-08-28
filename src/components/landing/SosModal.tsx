import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  PhoneCall, 
  MapPin, 
  Camera, 
  Mic, 
  Send, 
  CheckCircle2, 
  Flame, 
  Car, 
  HeartPulse, 
  ShieldAlert, 
  Compass, 
  Radio, 
  Sparkles,
  Truck,
  ArrowRight
} from 'lucide-react';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SosModal: React.FC<SosModalProps> = ({ isOpen, onClose }) => {
  const [selectedHazard, setSelectedHazard] = useState<string>('traffic');
  const [submittingState, setSubmittingState] = useState<'idle' | 'analyzing' | 'dispatched'>('idle');
  const [locationLocked, setLocationLocked] = useState<boolean>(true);
  const [hasPhoto, setHasPhoto] = useState<boolean>(true);

  if (!isOpen) return null;

  const hazardOptions = [
    { id: 'traffic', label: 'Traffic Collision', icon: Car, color: 'border-orange-500 text-orange-400 bg-orange-500/10' },
    { id: 'fire', label: 'Fire & Smoke', icon: Flame, color: 'border-red-500 text-red-400 bg-red-500/10' },
    { id: 'medical', label: 'Medical Emergency', icon: HeartPulse, color: 'border-rose-500 text-rose-400 bg-rose-500/10' },
    { id: 'security', label: 'Violence / Police', icon: ShieldAlert, color: 'border-blue-500 text-blue-400 bg-blue-500/10' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingState('analyzing');
    setTimeout(() => {
      setSubmittingState('dispatched');
    }, 2000);
  };

  const handleReset = () => {
    setSubmittingState('idle');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl overflow-y-auto animate-fadeIn">
      
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl rounded-2xl cad-glass p-6 sm:p-8 border-2 border-red-500/70 shadow-glow-red bg-[#0F172A] text-white my-8">
        
        {/* HUD decorative corners */}
        <div className="hud-corner-tl"></div>
        <div className="hud-corner-tr"></div>
        <div className="hud-corner-bl"></div>
        <div className="hud-corner-br"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {submittingState === 'idle' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-600 shadow-glow-red flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Emergency SOS Dispatch</span>
                  <span className="text-[10px] font-mono-data px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40">
                    PRIORITY 1
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono-data">
                  Direct AI-Assisted CAD Ingestion System
                </p>
              </div>
            </div>

            {/* Emergency Direct Hotlines Box */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono-data text-slate-300">
                <PhoneCall className="w-4 h-4 text-red-500 animate-bounce" />
                <span>Immediate Danger? Direct Call:</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="tel:113"
                  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono-data text-xs font-bold transition-colors"
                >
                  113 (Police)
                </a>
                <a
                  href="tel:114"
                  className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-mono-data text-xs font-bold transition-colors"
                >
                  114 (Fire)
                </a>
                <a
                  href="tel:115"
                  className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono-data text-xs font-bold transition-colors"
                >
                  115 (EMS)
                </a>
              </div>
            </div>

            {/* Incident Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                Select Incident Nature:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {hazardOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedHazard === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setSelectedHazard(opt.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all ${
                        isSelected 
                          ? `${opt.color} border-2 scale-105 shadow-md` 
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-bold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GPS Telemetry Pill */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 animate-pulse" />
                <div className="text-xs font-mono-data">
                  <span className="text-slate-400 block text-[10px]">GPS LOCATION LOCKED</span>
                  <span className="text-white font-bold">21.0285° N, 105.8542° E (±2.4m)</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono-data font-bold border border-emerald-500/30">
                ACTIVE
              </span>
            </div>

            {/* Media Upload Simulation */}
            <div className="space-y-2">
              <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                Attach Visual / Voice Evidence (Optional):
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setHasPhoto(!hasPhoto)}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-colors ${
                    hasPhoto ? 'bg-blue-950/40 border-blue-500/50 text-blue-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Camera className="w-4 h-4 text-blue-400" />
                  <div className="text-xs font-mono-data">
                    <span className="font-bold block">{hasPhoto ? 'photo_accident.jpg' : 'Attach Photo'}</span>
                    <span className="text-[10px] text-slate-400">{hasPhoto ? 'Ready for VLM Triage' : 'Tap to upload'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-2.5">
                  <Mic className="w-4 h-4 text-red-400 animate-pulse" />
                  <div className="text-xs font-mono-data">
                    <span className="font-bold block text-slate-300">Voice Note</span>
                    <span className="text-[10px] text-slate-500">Auto-transcribing</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-base uppercase tracking-wider font-mono-data shadow-glow-red hover:shadow-glow-red-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 border border-red-500"
            >
              <AlertTriangle className="w-5 h-5 text-white animate-bounce" />
              <span>Broadcast Emergency SOS to CAD</span>
              <Send className="w-4 h-4 text-red-200" />
            </button>

          </form>
        )}

        {/* State 2: AI Analyzing Simulation */}
        {submittingState === 'analyzing' && (
          <div className="py-12 text-center space-y-6">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin"></div>
              <Sparkles className="w-8 h-8 text-cyan-400 absolute animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">
                VLM AI Analyzing Incident Telemetry...
              </h3>
              <p className="text-sm text-slate-300 font-mono-data">
                Evaluating hazard vectors, collision severity, and querying nearby emergency stations.
              </p>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left font-mono-data text-xs space-y-1.5 text-slate-400">
              <div className="text-emerald-400 font-bold">✔ High-Precision GPS Fixed: (21.0285, 105.8542)</div>
              <div className="text-cyan-400 font-bold">✔ Vision Model Extracting Hazard Tags...</div>
              <div className="text-blue-400 font-bold">✔ Querying 14 Rescue Units in 3.5km radius...</div>
            </div>
          </div>
        )}

        {/* State 3: Dispatched Confirmation */}
        {submittingState === 'dispatched' && (
          <div className="py-8 text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-600/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono-data text-emerald-400 font-bold tracking-widest uppercase">
                SOS TRANSMISSION CONFIRMED
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Rescue Units Dispatched
              </h3>
              <p className="text-sm text-slate-300">
                Incident <strong className="text-red-400 font-mono-data">#VN-8942</strong> triaged as <strong className="text-white font-mono-data">Level 4 (Severe)</strong>. Responders en-route.
              </p>
            </div>

            {/* Units Card */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left space-y-3 font-mono-data">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <span className="text-slate-400">ASSIGNED UNITS:</span>
                <span className="text-emerald-400 font-bold">ETA: 3m 40s</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-bold">Ambulance AM-04 (EMS)</span>
                </div>
                <span className="text-slate-400">2.1 km away</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400" />
                  <span className="text-white font-bold">Rescue Engine FE-09 (Fire)</span>
                </div>
                <span className="text-slate-400">1.4 km away</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleReset}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm font-mono-data shadow-glow-blue transition-all"
              >
                Open Live Tracking HUD Map
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
