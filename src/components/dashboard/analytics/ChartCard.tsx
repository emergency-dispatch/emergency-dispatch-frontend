import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ChartCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, icon: Icon, children }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-red-600 shrink-0" />
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
};
