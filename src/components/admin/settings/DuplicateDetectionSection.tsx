import React, { useState } from 'react';
import { CompactSettingsForm } from './CompactSettingsForm';
import { sameSettings, toNumber } from './settingsDraft';
import { ConfirmModal, Notice, type NoticeState } from '../common/ui';
import { showToast } from '../common/toastStore';
import { useServiceQuery, useUnsavedChangesGuard } from '../common/hooks';
import {
  DUPLICATE_DETECTION_LIMITS,
  adminSettingsService,
  validateDuplicateDetection,
  type DuplicateDetectionSettings,
  type SettingsRecord,
} from '../../../services/admin/adminSettingsService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { useTranslation } from '../../../i18n';

/**
 * BR-07 — cấu hình tự gộp SOS trùng của người dân (GET/PUT /api/settings/duplicate-detection).
 * Backend ghi nhật ký hệ thống và phát ReceiveSettingsChanged khi lưu.
 */
export const DuplicateDetectionSection: React.FC = () => {
  const { t } = useTranslation();
  const query = useServiceQuery(() => adminSettingsService.getDuplicateDetection(), 'duplicate-detection-settings');

  if (query.error && !query.data) {
    return (
      <div className="p-5">
        <Notice notice={{ kind: 'error', message: query.error }} />
      </div>
    );
  }
  if (!query.data) return <div className="p-5 text-sm text-slate-400">{t('admin.common.settings.loading')}</div>;

  return (
    <DuplicateDetectionForm
      key={query.data.updatedAt ?? 'default'}
      record={query.data}
      onSaved={(message) => {
        showToast(message);
        query.reload();
      }}
    />
  );
};

interface DuplicateDetectionDraft {
  enabled: boolean;
  // Ô số giữ dạng chuỗi để gõ dở không bị nhảy.
  radiusMeters: string;
  windowMinutes: string;
}

const toDraft = (s: DuplicateDetectionSettings): DuplicateDetectionDraft => ({
  enabled: s.enabled,
  radiusMeters: String(s.radiusMeters),
  windowMinutes: String(s.windowMinutes),
});

const toSettings = (d: DuplicateDetectionDraft): DuplicateDetectionSettings => ({
  enabled: d.enabled,
  radiusMeters: toNumber(d.radiusMeters),
  windowMinutes: toNumber(d.windowMinutes),
});

const DuplicateDetectionForm: React.FC<{
  record: SettingsRecord<DuplicateDetectionSettings>;
  onSaved: (message: string) => void;
}> = ({ record, onSaved }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<DuplicateDetectionDraft>(() => toDraft(record.values));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const values = toSettings(draft);
  const errors = validateDuplicateDetection(values);
  // So với bản đã qua draft (cùng thứ tự key, bỏ field thừa từ API).
  const dirty = !sameSettings(values, toSettings(toDraft(record.values)));
  const canSave = dirty && Object.keys(errors).length === 0;
  useUnsavedChangesGuard(dirty);

  const { radiusMeters: radiusLimit, windowMinutes: windowLimit } = DUPLICATE_DETECTION_LIMITS;

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await adminSettingsService.updateDuplicateDetection(values);
      onSaved(
        values.enabled ? t('admin.settings.duplicateDetection.savedEnabled') : t('admin.settings.duplicateDetection.savedDisabled')
      );
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
      setSaving(false);
    }
  };

  // Tắt ảnh hưởng mọi trạm (Operator sẽ thấy nhiều ca trùng) → hỏi lại trước khi lưu.
  const handleSave = () => {
    if (!values.enabled && record.values.enabled) setConfirmDisable(true);
    else save();
  };

  const handleRestoreDefaults = async () => {
    try {
      const defaults = await adminSettingsService.getDefaults();
      setDraft(toDraft(defaults.duplicateDetection));
      setNotice(null);
      showToast(t('admin.common.settings.defaultsFilled'), { kind: 'info' });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    }
  };

  return (
    <>
      <CompactSettingsForm
        title={t('admin.settings.duplicateDetection.enable')}
        description={t('admin.settings.duplicateDetection.scopeNote')}
        enabled={draft.enabled}
        onEnabledChange={(next) => setDraft((d) => ({ ...d, enabled: next }))}
        updatedAt={record.updatedAt}
        updatedByName={record.updatedByName}
        notice={notice}
        onCloseNotice={() => setNotice(null)}
        dirty={dirty}
        canSave={canSave}
        saving={saving}
        onSave={handleSave}
        onDiscard={() => {
          setDraft(toDraft(record.values));
          setNotice(null);
        }}
        onRestoreDefaults={handleRestoreDefaults}
      >
        {/* Tắt → làm mờ nhưng vẫn giữ / sửa được giá trị (backend lưu cả khi tắt). */}
        <div className={`space-y-2 transition-opacity motion-reduce:transition-none ${draft.enabled ? '' : 'opacity-50'}`}>
          <p className="text-sm leading-[2.6] text-slate-800">
            {t('admin.settings.duplicateDetection.sentenceBefore')}{' '}
            <SentenceNumber
              label={t('admin.settings.duplicateDetection.radius')}
              value={draft.radiusMeters}
              step={10}
              limit={radiusLimit}
              invalid={!!errors.radiusMeters}
              onChange={(v) => setDraft((d) => ({ ...d, radiusMeters: v }))}
            />{' '}
            {t('admin.settings.duplicateDetection.sentenceMiddle')}{' '}
            <SentenceNumber
              label={t('admin.settings.duplicateDetection.window')}
              value={draft.windowMinutes}
              step={1}
              limit={windowLimit}
              invalid={!!errors.windowMinutes}
              onChange={(v) => setDraft((d) => ({ ...d, windowMinutes: v }))}
            />{' '}
            {t('admin.settings.duplicateDetection.sentenceAfter')}
          </p>
          {[errors.radiusMeters, errors.windowMinutes].map(
            (message) =>
              message && (
                <p key={message} role="alert" className="text-[11px] font-medium text-red-600">
                  {message}
                </p>
              )
          )}
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          {t(draft.enabled ? 'admin.settings.duplicateDetection.summaryOperator' : 'admin.settings.duplicateDetection.enableHint')}
        </p>
      </CompactSettingsForm>

      {confirmDisable && (
        <ConfirmModal
          title={t('admin.settings.duplicateDetection.disableTitle')}
          confirmLabel={t('admin.settings.duplicateDetection.disableConfirm')}
          onCancel={() => setConfirmDisable(false)}
          onConfirm={() => {
            setConfirmDisable(false);
            save();
          }}
        >
          <p>{t('admin.settings.duplicateDetection.disableBody')}</p>
        </ConfirmModal>
      )}
    </>
  );
};

/** Ô số nằm trong câu. */
const SentenceNumber: React.FC<{
  label: string;
  value: string;
  step: number;
  limit: { min: number; max: number };
  invalid: boolean;
  onChange: (value: string) => void;
}> = ({ label, value, step, limit, invalid, onChange }) => (
  <input
    type="number"
    inputMode="numeric"
    aria-label={label}
    aria-invalid={invalid}
    min={limit.min}
    max={limit.max}
    step={step}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`w-20 rounded-lg border bg-white px-2 py-1.5 text-center text-base font-bold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
      invalid ? 'border-red-500 bg-red-50/40' : 'border-slate-300'
    }`}
  />
);
