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
      className={`rounded-xl border p-4 space-y-3 transition-colors bg-white shadow-xs ${
        rule.enabled ? 'border-slate-200' : 'border-slate-100 opacity-70'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              rule.enabled ? 'bg-red-50 border-red-200' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <Timer className={`w-4 h-4 ${rule.enabled ? 'text-red-600' : 'text-slate-400'}`} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 truncate">{rule.name}</h3>
        </div>
        <ToggleSwitch checked={rule.enabled} onChange={onToggle} label={`Bật/tắt quy tắc ${rule.name}`} />
      </div>

      <div className="flex items-center flex-wrap gap-2 text-sm text-slate-600">
        <span>Nếu sự cố</span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold font-mono-data whitespace-nowrap ${severityMeta.badgeClass}`}
        >
          Cấp ≥ {rule.minSeverity}
        </span>
        <span>không có đội tiếp nhận sau</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-bold font-mono-data text-slate-900 whitespace-nowrap">
          {rule.waitMinutes} phút
        </span>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        <span className="text-xs text-slate-500 shrink-0">Thông báo tới:</span>
        {rule.notifyRoles.map((role) => (
          <RoleBadge key={role} role={role} />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1.5 text-[11px] font-mono-data">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${rule.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className={rule.enabled ? 'text-emerald-600' : 'text-slate-400'}>
            {rule.enabled ? 'Đang giám sát nền' : 'Đã tắt'}
          </span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label="Sửa quy tắc"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label="Xóa quy tắc"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
