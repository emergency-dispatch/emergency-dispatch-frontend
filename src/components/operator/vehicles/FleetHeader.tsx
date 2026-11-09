import React from 'react';
import { Building2, Plus, ShieldCheck } from 'lucide-react';

export interface FleetStat {
  key: string;
  label: string;
  value: number;
  /** Dòng phụ dưới số (VD "187 cái"). */
  sub?: string;
  /** Tô amber khi > 0 (cần chú ý). */
  warn?: boolean;
  /** Có → thẻ bấm được (lọc nhanh). */
  onClick?: () => void;
  active?: boolean;
}

interface FleetHeaderProps {
  kicker: string;
  title: string;
  description: string;
  /** Thanh chuyển tab Xe | Thiết bị. */
  tabs: React.ReactNode;
  addLabel: string;
  onAdd: () => void;
  stats: FleetStat[];
}

/** Đầu trang Đội xe — dùng chung cho tab Xe và tab Thiết bị. */
export const FleetHeader: React.FC<FleetHeaderProps> = ({ kicker, title, description, tabs, addLabel, onAdd, stats }) => (
  <header className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 lg:p-5 flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0 flex-1 basis-80">
      <p className="text-[11px] font-mono-data uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
        {kicker}
      </p>
      <h1 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-red-600 shrink-0" />
        {title}
      </h1>
      <p className="text-xs text-slate-500 mt-1 max-w-2xl">{description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tabs}
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {addLabel}
        </button>
      </div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
      {stats.map((stat) => {
        const tone = stat.warn && stat.value > 0 ? 'text-amber-600' : 'text-slate-900';
        const body = (
          <>
            <span className="block text-[10px] font-mono-data uppercase tracking-wider text-slate-500">{stat.label}</span>
            <span className={`block text-xl font-black ${tone}`}>{stat.value}</span>
            {stat.sub && <span className="block text-[10px] font-mono-data text-slate-400 -mt-0.5">{stat.sub}</span>}
          </>
        );
        const box = 'px-3 py-2 rounded-xl border min-w-[88px] block w-full';
        return stat.onClick ? (
          <button
            key={stat.key}
            type="button"
            onClick={stat.onClick}
            aria-pressed={!!stat.active}
            className={`${box} transition-colors ${
              stat.active ? 'bg-red-50 border-red-300 ring-1 ring-red-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
            }`}
          >
            {body}
          </button>
        ) : (
          <div key={stat.key} className={`${box} bg-slate-50 border-slate-200`}>
            {body}
          </div>
        );
      })}
    </div>
  </header>
);
