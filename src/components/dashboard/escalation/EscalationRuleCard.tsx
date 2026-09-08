import React from 'react';
import { Pencil, Timer, Trash2 } from 'lucide-react';
import { ToggleSwitch } from '../common/ToggleSwitch';
import { RoleBadge } from '../accounts/RoleBadge';
import { SEVERITY_META } from '../../../data/incidentMock';
import type { EscalationRule } from '../../../types/escalation';

interface EscalationRuleCardProps {
  rule: EscalationRule;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const EscalationRuleCard: React.FC<EscalationRuleCardProps> = ({ rule, onToggle, onEdit, onDelete }) => {
  const severityMeta = SEVERITY_META[rule.minSeverity];

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 transition-colors ${
        rule.enabled ? 'border-slate-800 bg-slate-900/50' : 'border-slate-800/60 bg-slate-900/20 opacity-70'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              rule.enabled ? 'bg-blue-600/15 border-blue-800/60' : 'bg-slate-800 border-slate-700'
            }`}
          >
            <Timer className={`w-4 h-4 ${rule.enabled ? 'text-blue-400' : 'text-slate-500'}`} />
          </div>
          <h3 className="text-sm font-bold text-white truncate">{rule.name}</h3>
        </div>
        <ToggleSwitch checked={rule.enabled} onChange={onToggle} label={`Bật/tắt quy tắc ${rule.name}`} />
      </div>

      <div className="flex items-center flex-wrap gap-2 text-sm text-slate-300">
        <span>Nếu sự cố</span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold font-mono-data whitespace-nowrap ${severityMeta.badgeClass}`}
        >
          Cấp ≥ {rule.minSeverity}
        </span>
        <span>không có đội tiếp nhận sau</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-700 bg-slate-800/60 text-[11px] font-bold font-mono-data text-white whitespace-nowrap">
          {rule.waitMinutes} phút
        </span>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        <span className="text-xs text-slate-500 shrink-0">Thông báo tới:</span>
        {rule.notifyRoles.map((role) => (
          <RoleBadge key={role} role={role} />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <span className="flex items-center gap-1.5 text-[11px] font-mono-data">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${rule.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className={rule.enabled ? 'text-emerald-400' : 'text-slate-500'}>
            {rule.enabled ? 'Đang giám sát nền' : 'Đã tắt'}
          </span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md text-slate-400 hover:text-blue-400 hover:bg-blue-950/40 transition-colors"
            aria-label="Sửa quy tắc"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
            aria-label="Xóa quy tắc"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
