import React, { useState } from 'react';
import { NumberSettingField, SettingsForm } from '../settings/SettingsForm';
import { draftToEscalation, escalationToDraft, sameSettings, type EscalationDraft } from '../settings/settingsDraft';
import { Notice, type NoticeState } from '../common/ui';
import { inputClass, labelClass } from '../common/styles';
import { useServiceQuery, useUnsavedChangesGuard } from '../common/hooks';
import {
  adminSettingsService,
  validateEscalationSettings,
  type EscalationSettings,
  type SettingsRecord,
} from '../../../services/admin/adminSettingsService';
import { getApiErrorMessage } from '../../../services/apiClient';
import i18n, { useTranslation } from '../../../i18n';

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Mô tả khung giờ đêm, nhận biết khung qua nửa đêm. */
function describeNightWindow(start: string, end: string): string | null {
  if (!start || !end || start === end) return null;
  return toMinutes(start) > toMinutes(end)
    ? i18n.t('admin.settings.escalation.nightOvernight', { start, end })
    : i18n.t('admin.settings.escalation.nightSameDay', { start, end });
}

/**
 * Ngưỡng chờ + mở rộng bán kính khi leo thang (GET/PUT /api/settings/escalation).
 * reloadKey đổi (khung tham số điều phối vừa lưu) → tải lại để kiểm tra theo nấc bán kính mới; bản nháp được giữ.
 */
export const EscalationSettingsSection: React.FC<{ reloadKey?: number; onSaved?: () => void }> = ({
  reloadKey = 0,
  onSaved,
}) => {
  const { t } = useTranslation();
  // Bán kính tối đa không được nhỏ hơn nấc cuối của tham số điều phối → tải cả hai.
  const query = useServiceQuery(async () => {
    const [escalation, dispatch] = await Promise.all([
      adminSettingsService.getEscalationSettings(),
      adminSettingsService.getDispatchSettings(),
    ]);
    return { escalation, dispatch };
  }, `escalation-settings|${reloadKey}`);
  // Thông báo "đã lưu" giữ ở đây vì form được dựng lại sau khi lưu.
  const [flash, setFlash] = useState<NoticeState>(null);

  if (query.error && !query.data) return <Notice notice={{ kind: 'error', message: query.error }} />;
  if (!query.data) return <div className="text-sm text-slate-400">{t('admin.common.settings.loading')}</div>;

  return (
    <EscalationForm
      key={query.data.escalation.updatedAt ?? 'default'}
      record={query.data.escalation}
      dispatchStepsKm={query.data.dispatch.values.radiusStepsKm}
      initialNotice={flash}
      onSaved={(message) => {
        setFlash({ kind: 'success', message });
        query.reload();
        onSaved?.();
      }}
    />
  );
};

const EscalationForm: React.FC<{
  record: SettingsRecord<EscalationSettings>;
  dispatchStepsKm: number[];
  initialNotice: NoticeState;
  onSaved: (message: string) => void;
}> = ({ record, dispatchStepsKm, initialNotice, onSaved }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<EscalationDraft>(() => escalationToDraft(record.values));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(initialNotice);

  const values = draftToEscalation(draft);
  const errors = validateEscalationSettings(values, dispatchStepsKm);
  // So với bản đã qua draft (cùng thứ tự key, bỏ field thừa) — so thẳng record.values từ API luôn lệch.
  const dirty = !sameSettings(values, draftToEscalation(escalationToDraft(record.values)));
  const canSave = dirty && Object.keys(errors).length === 0;
  useUnsavedChangesGuard(dirty);

  const set = (key: keyof EscalationDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await adminSettingsService.updateEscalationSettings(values);
      onSaved(t('admin.settings.escalation.saved'));
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    try {
      const defaults = await adminSettingsService.getDefaults();
      setDraft(escalationToDraft(defaults.escalation));
      setNotice({ kind: 'success', message: t('admin.common.settings.defaultsFilled') });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    }
  };

  const nightWindow = describeNightWindow(draft.nightStart, draft.nightEnd);

  return (
    <SettingsForm
      title={t('admin.settings.escalation.sectionTitle')}
      embedded
      updatedAt={record.updatedAt}
      updatedByName={record.updatedByName}
      notice={notice}
      onCloseNotice={() => setNotice(null)}
      dirty={dirty}
      canSave={canSave}
      saving={saving}
      onSave={handleSave}
      onDiscard={() => {
        setDraft(escalationToDraft(record.values));
        setNotice(null);
      }}
      onRestoreDefaults={handleRestoreDefaults}
      wide
    >
      {/* ≥ xl: 3 nhóm thành 3 cột ngang (ngăn bằng đường kẻ dọc) để form thấp lại, bảng Quy tắc lên màn đầu. */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 xl:gap-0 xl:divide-x divide-slate-100">
        <section className="space-y-4 xl:pr-6">
          <h3 className="text-sm font-bold text-slate-900">{t('admin.settings.escalation.thresholdTitle')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberSettingField
              label={t('admin.settings.escalation.day')}
              unit={t('admin.settings.dispatch.minutesUnit')}
              value={draft.dayThresholdMinutes}
              onChange={set('dayThresholdMinutes')}
              error={errors.dayThresholdMinutes}
              hint={t('admin.settings.escalation.halfStepHint')}
            />
            <NumberSettingField
              label={t('admin.settings.escalation.night')}
              unit={t('admin.settings.dispatch.minutesUnit')}
              value={draft.nightThresholdMinutes}
              onChange={set('nightThresholdMinutes')}
              error={errors.nightThresholdMinutes}
              hint={t('admin.settings.escalation.halfStepHint')}
            />
          </div>

          <div className="space-y-1.5">
            <span className={labelClass}>{t('admin.settings.escalation.nightWindow')}</span>
            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="time"
                value={draft.nightStart}
                onChange={(e) => set('nightStart')(e.target.value)}
                aria-label={t('admin.settings.escalation.nightStart')}
                className={`${inputClass} font-mono-data ${errors.nightStart ? 'border-red-400' : ''}`}
              />
              <span className="text-slate-400">→</span>
              <input
                type="time"
                value={draft.nightEnd}
                onChange={(e) => set('nightEnd')(e.target.value)}
                aria-label={t('admin.settings.escalation.nightEnd')}
                className={`${inputClass} font-mono-data ${errors.nightEnd ? 'border-red-400' : ''}`}
              />
            </div>
            {errors.nightStart || errors.nightEnd ? (
              <p className="text-[11px] text-red-600">{errors.nightStart ?? errors.nightEnd}</p>
            ) : (
              nightWindow && <p className="text-[11px] text-slate-500">{nightWindow}</p>
            )}
          </div>
        </section>

        <section className="space-y-4 pt-5 border-t border-slate-100 xl:pt-0 xl:border-t-0 xl:px-6">
          <h3 className="text-sm font-bold text-slate-900">{t('admin.settings.escalation.radiusTitle')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberSettingField
              label={t('admin.settings.escalation.multiplier')}
              unit="×"
              step={0.1}
              value={draft.radiusMultiplier}
              onChange={set('radiusMultiplier')}
              error={errors.radiusMultiplier}
              hint={t('admin.settings.escalation.multiplierHint')}
            />
            <NumberSettingField
              label={t('admin.settings.escalation.maxRadius')}
              unit="km"
              value={draft.maxRadiusKm}
              onChange={set('maxRadiusKm')}
              error={errors.maxRadiusKm}
              hint={t('admin.settings.escalation.maxRadiusHint')}
            />
          </div>
        </section>

        {/* §21.2: yêu cầu chi viện / báo vấn đề từ hiện trường chưa được trung tâm xử lý */}
        <section className="space-y-4 pt-5 border-t border-slate-100 xl:pt-0 xl:border-t-0 xl:pl-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('admin.settings.escalation.fieldRequestTitle')}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{t('admin.settings.escalation.fieldRequestDescription')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberSettingField
              label={t('admin.settings.escalation.fieldRequestThreshold')}
              unit={t('admin.settings.dispatch.minutesUnit')}
              value={draft.fieldRequestThresholdMinutes}
              onChange={set('fieldRequestThresholdMinutes')}
              error={errors.fieldRequestThresholdMinutes}
              hint={t('admin.settings.escalation.halfStepHint')}
            />
          </div>
        </section>
      </div>
    </SettingsForm>
  );
};
