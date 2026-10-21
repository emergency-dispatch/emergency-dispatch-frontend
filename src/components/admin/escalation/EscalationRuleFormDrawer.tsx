import React, { useState } from 'react';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { NOTIFY_ROLE_LABEL, escalationSeverityMeta } from './escalationMeta';
import {
  DESCRIPTION_MAX_LENGTH,
  EXPAND_RADIUS_PERCENT_RANGE,
  TIMEOUT_MINUTES_RANGE,
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

// Ô số giữ dạng chuỗi để gõ dở không bị nhảy; ô trống → NaN → báo lỗi.
const toNumber = (s: string) => (s.trim() === '' ? NaN : Number(s));

export const EscalationRuleFormDrawer: React.FC<EscalationRuleFormDrawerProps> = ({ initialRule, onClose, onSaved }) => {
  const [minSeverityLevel, setMinSeverityLevel] = useState<EscalationSeverity>(initialRule?.minSeverityLevel ?? 'Level3');
  const [timeoutMinutes, setTimeoutMinutes] = useState(String(initialRule?.timeoutMinutes ?? 5));
  const [expandRadiusPercent, setExpandRadiusPercent] = useState(String(initialRule?.expandRadiusPercent ?? 100));
  const [notifyRoles, setNotifyRoles] = useState<EscalationNotifyRole[]>(
    initialRule ? parseNotifyRoles(initialRule.notifyRoles) : ['Operator', 'Admin']
  );
  const [isActive, setIsActive] = useState(initialRule?.isActive ?? true);
  const [description, setDescription] = useState(initialRule?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input = {
    minSeverityLevel,
    timeoutMinutes: toNumber(timeoutMinutes),
    expandRadiusPercent: toNumber(expandRadiusPercent),
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

      <FormField label="Áp dụng cho sự cố từ" required hint="Quy tắc áp dụng cho sự cố có cấp bằng hoặc cao hơn cấp này.">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Ngưỡng chờ (phút)"
          required
          hint={errors.timeoutMinutes ?? 'Chưa có đội nhận quá số phút này thì leo thang.'}
        >
          <input
            type="number"
            inputMode="numeric"
            min={TIMEOUT_MINUTES_RANGE.min}
            max={TIMEOUT_MINUTES_RANGE.max}
            step={1}
            value={timeoutMinutes}
            onChange={(e) => setTimeoutMinutes(e.target.value)}
            className={`${inputClass} font-mono-data ${errors.timeoutMinutes ? 'border-red-400' : ''}`}
          />
        </FormField>
        <FormField
          label="Mở rộng bán kính (%)"
          required
          hint={errors.expandRadiusPercent ?? 'VD 100% = bán kính tìm xe gấp đôi.'}
        >
          <input
            type="number"
            inputMode="numeric"
            min={EXPAND_RADIUS_PERCENT_RANGE.min}
            max={EXPAND_RADIUS_PERCENT_RANGE.max}
            step={10}
            value={expandRadiusPercent}
            onChange={(e) => setExpandRadiusPercent(e.target.value)}
            className={`${inputClass} font-mono-data ${errors.expandRadiusPercent ? 'border-red-400' : ''}`}
          />
        </FormField>
      </div>

      <FormField label="Vai trò nhận cảnh báo" required hint={errors.notifyRoles}>
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
          placeholder="VD: Leo thang sự cố Cấp 3 chưa có đội nhận quá 5 phút"
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
