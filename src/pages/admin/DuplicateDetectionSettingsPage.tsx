import React, { useState } from 'react';
import { NumberSettingField, SettingsForm } from '../../components/admin/settings/SettingsForm';
import { sameSettings, toNumber } from '../../components/admin/settings/settingsDraft';
import { ConfirmModal, Notice, type NoticeState } from '../../components/admin/common/ui';
import { useServiceQuery, useUnsavedChangesGuard } from '../../components/admin/common/hooks';
import {
  DUPLICATE_DETECTION_LIMITS,
  adminSettingsService,
  validateDuplicateDetection,
  type DuplicateDetectionSettings,
  type SettingsRecord,
} from '../../services/admin/adminSettingsService';
import { getApiErrorMessage } from '../../services/apiClient';
import { dateLocale, useTranslation } from '../../i18n';

/**
 * BR-07 — cấu hình tự gộp SOS trùng của người dân (GET/PUT /api/settings/duplicate-detection).
 * Backend ghi nhật ký hệ thống và phát ReceiveSettingsChanged khi lưu.
 */
const DuplicateDetectionSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const query = useServiceQuery(() => adminSettingsService.getDuplicateDetection(), 'duplicate-detection-settings');
  // Thông báo "đã lưu" giữ ở cấp trang vì form được dựng lại sau khi lưu.
  const [flash, setFlash] = useState<NoticeState>(null);

  if (query.error && !query.data) {
    return (
      <div className="p-4 sm:p-6">
        <Notice notice={{ kind: 'error', message: query.error }} />
      </div>
    );
  }
  if (!query.data) return <div className="p-4 sm:p-6 text-sm text-slate-400">{t('admin.common.settings.loading')}</div>;

  return (
    <DuplicateDetectionForm
      key={query.data.updatedAt ?? 'default'}
      record={query.data}
      initialNotice={flash}
      onSaved={(message) => {
        setFlash({ kind: 'success', message });
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
  initialNotice: NoticeState;
  onSaved: (message: string) => void;
}> = ({ record, initialNotice, onSaved }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<DuplicateDetectionDraft>(() => toDraft(record.values));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(initialNotice);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const values = toSettings(draft);
  const errors = validateDuplicateDetection(values);
  // So với bản đã qua draft (cùng thứ tự key, bỏ field thừa từ API).
  const dirty = !sameSettings(values, toSettings(toDraft(record.values)));
  const canSave = dirty && Object.keys(errors).length === 0;
  useUnsavedChangesGuard(dirty);

  const { radiusMeters: radiusLimit, windowMinutes: windowLimit } = DUPLICATE_DETECTION_LIMITS;
  const formatNumber = (n: number) => n.toLocaleString(dateLocale());

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
      setNotice({ kind: 'success', message: t('admin.common.settings.defaultsFilled') });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    }
  };

  return (
    <>
      <SettingsForm
        scopeNote={t('admin.settings.duplicateDetection.scopeNote')}
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
        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
            className="w-4 h-4 mt-0.5 accent-red-600"
          />
          <span>
            <span className="block text-sm font-bold text-slate-900">{t('admin.settings.duplicateDetection.enable')}</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">{t('admin.settings.duplicateDetection.enableHint')}</span>
          </span>
        </label>

        {/* Tắt → làm mờ nhưng vẫn giữ / sửa được giá trị (backend lưu cả khi tắt). */}
        <div className={`space-y-4 transition-opacity ${draft.enabled ? '' : 'opacity-50'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberSettingField
              label={t('admin.settings.duplicateDetection.radius')}
              unit="m"
              step={10}
              value={draft.radiusMeters}
              onChange={(v) => setDraft((d) => ({ ...d, radiusMeters: v }))}
              error={errors.radiusMeters}
              hint={t('admin.settings.duplicateDetection.radiusHint', radiusLimit)}
            />
            <NumberSettingField
              label={t('admin.settings.duplicateDetection.window')}
              unit={t('admin.settings.duplicateDetection.minutesUnit')}
              step={1}
              value={draft.windowMinutes}
              onChange={(v) => setDraft((d) => ({ ...d, windowMinutes: v }))}
              error={errors.windowMinutes}
              hint={t('admin.settings.duplicateDetection.windowHint', windowLimit)}
            />
          </div>

          {draft.enabled && !errors.radiusMeters && !errors.windowMinutes && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 space-y-1.5 text-xs text-slate-600">
              <p className="font-bold text-slate-800">{t('admin.settings.duplicateDetection.summaryTitle')}</p>
              <p>
                {t('admin.settings.duplicateDetection.summaryRule', {
                  meters: formatNumber(values.radiusMeters),
                  minutes: formatNumber(values.windowMinutes),
                })}
              </p>
              <p>{t('admin.settings.duplicateDetection.summaryOutlier')}</p>
              <p>{t('admin.settings.duplicateDetection.summaryOperator')}</p>
            </div>
          )}
        </div>
      </SettingsForm>

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

export default DuplicateDetectionSettingsPage;
