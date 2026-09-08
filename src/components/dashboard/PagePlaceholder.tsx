import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PagePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const PagePlaceholder: React.FC<PagePlaceholderProps> = ({ icon: Icon, title, description }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-slate-800 shrink-0">
        <h1 className="text-lg font-bold text-white flex items-center gap-2.5">
          <Icon className="w-5 h-5 text-blue-400" />
          {title}
        </h1>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-3 p-8 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40">
          <Icon className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-400">{description}</p>
          <p className="text-[11px] font-mono-data text-slate-600 uppercase tracking-wider">Sắp triển khai</p>
        </div>
      </div>
    </div>
  );
};
