import type { TooltipContentProps } from 'recharts';

export function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-700 bg-[#131D33] px-3 py-2 shadow-xl">
      {label && <p className="text-[10px] font-mono-data text-slate-400 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-xs font-semibold" style={{ color: entry.color ?? '#F8FAFC' }}>
          {entry.value} sự cố
        </p>
      ))}
    </div>
  );
}
