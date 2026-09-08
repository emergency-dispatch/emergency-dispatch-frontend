import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ icon: Icon, label, value, accent }) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-center gap-3.5">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accent}1A` }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-white font-mono-data truncate">{value}</p>
        <p className="text-[11px] text-slate-500 truncate">{label}</p>
      </div>
    </div>
  );
};
