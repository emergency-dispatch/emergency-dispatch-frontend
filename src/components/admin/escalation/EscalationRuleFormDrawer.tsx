import React, { useState } from 'react';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { NOTIFY_ROLE_LABEL, escalationSeverityMeta } from './escalationMeta';
import {
  DESCRIPTION_MAX_LENGTH,
  escalationService,
  validateEscalationRule,
} from '../../../services/admin/escalationService';
import { getApiErrorMessage } from '../../../services/apiClient';
import {
  ESCALATION_NOTIFY_ROLES,
  ESCALATION_SEVERITIES,
  parseNotifyRoles,
  type EscalationNotifyRole,
  type EscalationRuleDto,
  type EscalationSeverity,
} from '../../../types/escalation';

interface EscalationRuleFormDrawerProps {
  initialRule: EscalationRuleDto | null;
  onClose: () => void;
  onSaved: (rule: EscalationRuleDto) => void;
}

export const EscalationRuleFormDrawer: React.FC<EscalationRuleFormDrawerProps> = ({ initialRule, onClose, onSaved }) => {
  const [minSeverityLevel, setMinSeverityLevel] = useState<EscalationSeverity>(initialRule?.minSeverityLevel ?? 'Level3');
  const [notifyRoles, setNotifyRoles] = useState<EscalationNotifyRole[]>(
    initialRule ? parseNotifyRoles(initialRule.notifyRoles) : ['Operator', 'Admin']
  );
  const [isActive, setIsActive] = useState(initialRule?.isActive ?? true);
  const [description, setDescription] = useState(initialRule?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input = {
    minSeverityLevel,
    notifyRoles,
    isActive,
    description,
  };
  const errors = validateEscalationRule(input);
  const canSubmit = Object.keys(errors).length === 0;

  const toggleRole = (role: EscalationNotifyRole) =>
    setNotifyRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const saved = initialRule
        ? await escalationService.updateRule(initialRule.id, input)
        : await escalationService.createRule(input);
      onSaved(saved);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      title={initialRule ? 'Sửa quy tắc leo thang' : 'Thêm quy tắc leo thang'}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={<DrawerFooter onCancel={onClose} submitLabel="Lưu quy tắc" submitting={submitting} canSubmit={canSubmit} />}
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />

      <FormField
        label="Áp dụng cho sự cố từ"
        required
        hint="Sự cố có cấp bằng hoặc cao hơn cấp này (và sự cố AI chưa phân loại) sẽ bị leo thang khi quá ngưỡng chờ."
      >
        <div className="grid grid-cols-3 gap-2">
          {ESCALATION_SEVERITIES.map((level) => {
            const meta = escalationSeverityMeta(level);
            const active = minSeverityLevel === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setMinSeverityLevel(level)}
                className={`py-2.5 rounded-lg border text-xs font-bold font-mono-data transition-colors ${
                  active ? meta.badgeClass : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
                }`}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </FormField>

      <p className="text-[11px] text-slate-500">
        Ngưỡng chờ (ngày/đêm) và mức mở rộng bán kính dùng chung cho mọi quy tắc — chỉnh ở phần Cấu hình leo thang phía
        trên.
      </p>

      <FormField
        label="Vai trò ghi nhận trong nhật ký"
        required
        hint={errors.notifyRoles ?? 'Cảnh báo realtime luôn gửi tới Điều phối viên và Quản trị viên.'}
      >
        <div className="space-y-2">
          {ESCALATION_NOTIFY_ROLES.map((role) => (
            <label key={role} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifyRoles.includes(role)}
                onChange={() => toggleRole(role)}
                className="w-4 h-4 accent-red-600"
              />
              {NOTIFY_ROLE_LABEL[role]}
            </label>
          ))}
        </div>
      </FormField>

      <FormField label="Mô tả" hint={errors.description}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={DESCRIPTION_MAX_LENGTH}
          rows={3}
          placeholder="VD: Leo thang sự cố Cấp 3 chưa có đội nhận"
          className={`${inputClass} resize-none`}
        />
      </FormField>

      <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 accent-red-600"
        />
        Bật quy tắc ngay sau khi lưu
      </label>
    </DrawerShell>
  );
};
