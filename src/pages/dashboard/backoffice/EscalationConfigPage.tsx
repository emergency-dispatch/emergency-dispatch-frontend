import React, { useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import { ConfirmDialog } from '../../../components/dashboard/common/ConfirmDialog';
import { EscalationRuleCard } from '../../../components/dashboard/escalation/EscalationRuleCard';
import { EscalationRuleFormDrawer } from '../../../components/dashboard/escalation/EscalationRuleFormDrawer';
import { escalationRulesSeed } from '../../../data/escalationMock';
import type { EscalationRule } from '../../../types/escalation';

export const EscalationConfigPage: React.FC = () => {
  const [rules, setRules] = useState<EscalationRule[]>(escalationRulesSeed);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingRule, setDeletingRule] = useState<EscalationRule | null>(null);

  const handleToggle = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const handleSave = (rule: EscalationRule) => {
    setRules((prev) => {
      const exists = prev.some((r) => r.id === rule.id);
      return exists ? prev.map((r) => (r.id === rule.id ? rule : r)) : [...prev, rule];
    });
    setEditingRule(null);
    setIsCreating(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingRule) return;
    setRules((prev) => prev.filter((r) => r.id !== deletingRule.id));
    setDeletingRule(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
            <Settings2 className="w-5 h-5 text-red-600" />
            Escalation Logic Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1 ml-[30px]">
            Cấu hình leo thang tự động — chạy ngầm dạng Node-cron ở backend
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/25"
        >
          <Plus className="w-4 h-4" />
          Thêm quy tắc
        </button>
      </div>

      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Chưa có quy tắc leo thang nào
          </div>
        ) : (
          rules.map((rule) => (
            <EscalationRuleCard
              key={rule.id}
              rule={rule}
              onToggle={() => handleToggle(rule.id)}
              onEdit={() => setEditingRule(rule)}
              onDelete={() => setDeletingRule(rule)}
            />
          ))
        )}
      </div>

      {(isCreating || editingRule) && (
        <EscalationRuleFormDrawer
          initialRule={editingRule}
          onClose={() => {
            setIsCreating(false);
            setEditingRule(null);
          }}
          onSave={handleSave}
        />
      )}

      {deletingRule && (
        <ConfirmDialog
          title="Xóa quy tắc leo thang?"
          description="Hành động này không thể hoàn tác."
          itemLabel={deletingRule.name}
          onCancel={() => setDeletingRule(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};
