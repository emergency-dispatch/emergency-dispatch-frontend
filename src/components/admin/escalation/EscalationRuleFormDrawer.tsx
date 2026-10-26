import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { useServiceQuery } from '../common/hooks';
import { escalationSeverityMeta } from './escalationMeta';
import {
  DESCRIPTION_MAX_LENGTH,
  escalationService,
  validateEscalationRule,
} from '../../../services/admin/escalationService';
import { adminSettingsService } from '../../../services/admin/adminSettingsService';
import { getApiErrorMessage } from '../../../services/apiClient';
import {
  ESCALATION_NOTIFY_ROLES,
  ESCALATION_SEVERITIES,
  parseNotifyRoles,
  type EscalationNotifyRole,
  type EscalationRuleDto,
  type EscalationSeverity,
} from '../../../types/escalation';
import { Trans, useTranslation } from '../../../i18n';

interface EscalationRuleFormDrawerProps {
  initialRule: EscalationRuleDto | null;
  onClose: () => void;
  onSaved: (rule: EscalationRuleDto) => void;
}

export const EscalationRuleFormDrawer: React.FC<EscalationRuleFormDrawerProps> = ({ initialRule, onClose, onSaved }) => {
  const { t } = useTranslation();
  // Ngưỡng chờ và bán kính không thuộc quy tắc mà là cấu hình chung (PUT /api/settings/escalation) — chỉ hiện để tham khảo.
  const settings = useServiceQuery(() => adminSettingsService.getEscalationSettings(), 'escalation-rule-effective');
  const effective = settings.data?.values;
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
      title={initialRule ? t('admin.settings.escalation.ruleForm.editTitle') : t('admin.settings.escalation.ruleForm.addTitle')}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={<DrawerFooter onCancel={onClose} submitLabel={t('admin.settings.escalation.ruleForm.save')} submitting={submitting} canSubmit={canSubmit} />}
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />

      <div className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
        <span>
          {effective ? (
            <>
              <strong className="text-slate-800">{t('admin.settings.escalation.ruleForm.effectiveLabel')}</strong>{' '}
              {t('admin.settings.escalation.ruleForm.effective', {
                day: effective.dayThresholdMinutes,
                night: effective.nightThresholdMinutes,
                start: effective.nightStart,
                end: effective.nightEnd,
                multiplier: effective.radiusMultiplier,
                maxKm: effective.maxRadiusKm,
              })}
            </>
          ) : settings.error ? (
            t('admin.settings.escalation.ruleForm.effectiveError')
          ) : (
            t('admin.settings.escalation.ruleForm.effectiveLoading')
          )}{' '}
          <Trans i18nKey="admin.settings.escalation.ruleForm.sharedNote" components={{ b: <strong /> }} />
        </span>
      </div>

      <FormField
        label={t('admin.settings.escalation.ruleForm.appliesFrom')}
        required
        hint={t('admin.settings.escalation.ruleForm.appliesFromHint')}
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
        {t('admin.settings.escalation.ruleForm.thresholdNote')}
      </p>

      <FormField
        label={t('admin.settings.escalation.ruleForm.notifyRoles')}
        required
        hint={errors.notifyRoles ?? t('admin.settings.escalation.ruleForm.notifyRolesHint')}
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
              {t(`admin.settings.escalation.notifyRole.${role}`)}
            </label>
          ))}
        </div>
      </FormField>

      <FormField label={t('admin.settings.escalation.ruleForm.description')} hint={errors.description}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={DESCRIPTION_MAX_LENGTH}
          rows={3}
          placeholder={t('admin.settings.escalation.ruleForm.descriptionPlaceholder')}
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
        {t('admin.settings.escalation.ruleForm.activateNow')}
      </label>
    </DrawerShell>
  );
};
