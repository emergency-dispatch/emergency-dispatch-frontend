import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { CompactSettingsForm } from './CompactSettingsForm';
import { ConfirmModal, Notice, type NoticeState } from '../common/ui';
import { showToast } from '../common/toastStore';
import { useServiceQuery, useUnsavedChangesGuard } from '../common/hooks';
import {
  REPORT_COOLDOWN_MINUTES,
  adminSettingsService,
  type CitizenIncidentAlertSettings,
  type SettingsRecord,
} from '../../../services/admin/adminSettingsService';
import { setCachedReportCooldownMinutes } from '../../../hooks/useSosCooldown';
import { toNumber } from './settingsDraft';
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
  const initialCooldown = record.values.reportCooldownMinutes ?? 3;
  const [enabled, setEnabled] = useState(record.values.enabled);
  const [cooldownMinutes, setCooldownMinutes] = useState(String(initialCooldown));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [confirming, setConfirming] = useState(false);

  const parsedCooldown = toNumber(cooldownMinutes);
  const cooldownError =
    !Number.isInteger(parsedCooldown) ||
    parsedCooldown < REPORT_COOLDOWN_MINUTES.min ||
    parsedCooldown > REPORT_COOLDOWN_MINUTES.max
      ? t('admin.settings.citizenAlerts.cooldownRange', REPORT_COOLDOWN_MINUTES)
      : undefined;

  const dirty = enabled !== record.values.enabled || cooldownMinutes !== String(initialCooldown);
  const canSave = dirty && !cooldownError;
  useUnsavedChangesGuard(dirty);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const save = async () => {
    if (cooldownError) return;
    setSaving(true);
    setNotice(null);
    try {
      await adminSettingsService.updateCitizenIncidentAlerts({ enabled, reportCooldownMinutes: parsedCooldown });
      setCachedReportCooldownMinutes(parsedCooldown);
      const key =
        enabled !== record.values.enabled
          ? enabled
            ? 'admin.settings.citizenAlerts.savedEnabled'
            : 'admin.settings.citizenAlerts.savedDisabled'
          : 'admin.settings.citizenAlerts.saved';
      onSaved(t(key));
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
        canSave={canSave}
        saving={saving}
        // Chỉ hỏi xác nhận khi chuyển từ tắt -> bật gửi thông báo khu vực.
        onSave={() => (enabled && !record.values.enabled ? setConfirming(true) : save())}
        onDiscard={() => {
          setEnabled(record.values.enabled);
          setCooldownMinutes(String(initialCooldown));
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

        <div className="space-y-2 border-t border-slate-100 pt-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <label htmlFor="citizen-report-cooldown-input" className="block text-xs font-bold text-slate-900">
                {t('admin.settings.citizenAlerts.cooldownTitle')}
              </label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {t('admin.settings.citizenAlerts.cooldownHint', REPORT_COOLDOWN_MINUTES)}
              </p>
            </div>
            <div className="flex w-28 shrink-0 items-stretch">
              <input
                id="citizen-report-cooldown-input"
                type="number"
                inputMode="numeric"
                min={REPORT_COOLDOWN_MINUTES.min}
                max={REPORT_COOLDOWN_MINUTES.max}
                step={1}
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(e.target.value)}
                aria-invalid={!!cooldownError}
                className={`w-full rounded-l-lg border bg-white px-2 py-1.5 text-center text-sm font-bold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                  cooldownError ? 'border-red-500 bg-red-50/40' : 'border-slate-300'
                }`}
              />
              <span className="flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-2.5 text-xs text-slate-500">
                {t('admin.settings.citizenAlerts.cooldownUnit')}
              </span>
            </div>
          </div>
          {cooldownError && (
            <p role="alert" className="text-[11px] font-medium text-red-600">
              {cooldownError}
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
