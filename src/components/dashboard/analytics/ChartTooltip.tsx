import type { TooltipContentProps } from 'recharts';

export function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      {label && <p className="text-[10px] font-mono-data text-slate-500 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-xs font-semibold" style={{ color: entry.color ?? '#0F172A' }}>
          {entry.value} sự cố
        </p>
      ))}
    </div>
  );
}
