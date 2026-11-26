import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { CompactSettingsForm } from './CompactSettingsForm';
import { ConfirmModal, Notice, type NoticeState } from '../common/ui';
import { showToast } from '../common/toastStore';
import { useServiceQuery, useUnsavedChangesGuard } from '../common/hooks';
import { adminSettingsService, type CitizenIncidentAlertSettings, type SettingsRecord } from '../../../services/admin/adminSettingsService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { dateLocale, useTranslation } from '../../../i18n';

/**
 * §49 — bật / tắt thông báo "Có sự cố tại …" cho mọi người dân (GET/PUT /api/settings/citizen-incident-alerts).
 * Mốc bắt đầu do server đặt khi bật: sự cố xác nhận trước đó không bị phát lại.
 */
export const CitizenAlertsSection: React.FC<{ onDirtyChange: (dirty: boolean) => void }> = ({ onDirtyChange }) => {
  const { t } = useTranslation();
  const query = useServiceQuery(() => adminSettingsService.getCitizenIncidentAlerts(), 'citizen-incident-alerts-settings');

  if (query.error && !query.data) {
    return (
      <div className="p-5">
        <Notice notice={{ kind: 'error', message: query.error }} />
      </div>
    );
  }
  if (!query.data) return <div className="p-5 text-sm text-slate-400">{t('admin.common.settings.loading')}</div>;

  return (
    <CitizenAlertsForm
      key={query.data.updatedAt ?? 'default'}
      record={query.data}
      onDirtyChange={onDirtyChange}
      onSaved={(message) => {
        showToast(message);
        query.reload();
      }}
    />
  );
};

/** Thông báo mẫu: đúng câu chữ backend gửi (CitizenIncidentAlertMessages), chỉ địa chỉ là ví dụ. */
const AlertPreview: React.FC<{ active: boolean }> = ({ active }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 transition-opacity motion-reduce:transition-none ${
        active ? '' : 'opacity-50'
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2 text-[11px] text-slate-500">
          <span>{t('admin.settings.citizenAlerts.previewTitle')}</span>
          <span>{t('admin.settings.citizenAlerts.previewTime')}</span>
        </p>
        <p className="text-sm font-bold text-slate-900">{t('admin.settings.citizenAlerts.previewHeading')}</p>
        <p className="text-sm text-slate-700">{t('admin.settings.citizenAlerts.previewBody')}</p>
      </div>
    </div>
  );
};

const CitizenAlertsForm: React.FC<{
  record: SettingsRecord<CitizenIncidentAlertSettings>;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (message: string) => void;
}> = ({ record, onDirtyChange, onSaved }) => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(record.values.enabled);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [confirming, setConfirming] = useState(false);

  const dirty = enabled !== record.values.enabled;
  useUnsavedChangesGuard(dirty);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await adminSettingsService.updateCitizenIncidentAlerts(enabled);
      onSaved(t(enabled ? 'admin.settings.citizenAlerts.savedEnabled' : 'admin.settings.citizenAlerts.savedDisabled'));
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
      setSaving(false);
    }
  };

  return (
    <>
      <CompactSettingsForm
        title={t('admin.settings.citizenAlerts.title')}
        description={t('admin.settings.citizenAlerts.enableHint')}
        enabled={enabled}
        onEnabledChange={setEnabled}
        updatedAt={record.updatedAt}
        updatedByName={record.updatedByName}
        notice={notice}
        onCloseNotice={() => setNotice(null)}
        dirty={dirty}
        canSave={dirty}
        saving={saving}
        // Bật = gửi tới mọi tài khoản người dân đang hoạt động → hỏi lại trước khi lưu.
        onSave={() => (enabled ? setConfirming(true) : save())}
        onDiscard={() => {
          setEnabled(record.values.enabled);
          setNotice(null);
        }}
      >
        <AlertPreview active={enabled} />

        <div className="space-y-1.5 text-xs leading-relaxed text-slate-600">
          <p className="font-semibold text-slate-700">{t('admin.settings.citizenAlerts.whenTitle')}</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>{t('admin.settings.citizenAlerts.whenVerified')}</li>
            <li>{t('admin.settings.citizenAlerts.whenAccepted')}</li>
          </ul>
          <p className="pt-1">{t('admin.settings.citizenAlerts.summaryOnce')}</p>
          <p>{t('admin.settings.citizenAlerts.summaryContent')}</p>
          {record.values.enabled && record.values.enabledFromUtc && (
            <p className="pt-1 font-semibold text-emerald-700">
              {t('admin.settings.citizenAlerts.enabledFrom', {
                time: new Date(record.values.enabledFromUtc).toLocaleString(dateLocale()),
              })}
            </p>
          )}
        </div>
      </CompactSettingsForm>

      {confirming && (
        <ConfirmModal
          title={t('admin.settings.citizenAlerts.enableTitle')}
          confirmLabel={t('admin.settings.citizenAlerts.enableConfirm')}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            save();
          }}
        >
          <p>{t('admin.settings.citizenAlerts.enableBody')}</p>
        </ConfirmModal>
      )}
    </>
  );
};
