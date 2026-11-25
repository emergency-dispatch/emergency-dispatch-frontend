import React, { useState } from 'react';
import { SettingSwitch } from './SettingSwitch';
import { ConfirmModal, Notice, type NoticeState } from '../common/ui';
import { dateLocale, useTranslation } from '../../../i18n';

interface CompactSettingsFormProps {
  title: string;
  description: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  updatedAt: string | null;
  updatedByName: string | null;
  notice: NoticeState;
  onCloseNotice: () => void;
  dirty: boolean;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onRestoreDefaults?: () => void;
  children: React.ReactNode;
}

/** Form cài đặt gọn trong một tab: công tắc ở đầu, nút Lưu / Hủy chỉ hiện khi có thay đổi. */
export const CompactSettingsForm: React.FC<CompactSettingsFormProps> = ({
  title,
  description,
  enabled,
  onEnabledChange,
  updatedAt,
  updatedByName,
  notice,
  onCloseNotice,
  dirty,
  canSave,
  saving,
  onSave,
  onDiscard,
  onRestoreDefaults,
  children,
}) => {
  const { t } = useTranslation();
  const [confirmRestore, setConfirmRestore] = useState(false);

  return (
    <>
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave && !saving) onSave();
      }}
      className="flex h-full flex-col gap-4 p-5"
    >
      <SettingSwitch title={title} description={description} checked={enabled} onChange={onEnabledChange} />
      <Notice notice={notice} onClose={onCloseNotice} />
      {children}

      <div className="mt-auto flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-3">
        <p className="mr-auto min-w-0 text-[11px] text-slate-500">
          {updatedAt
            ? t('admin.common.settings.lastUpdated', {
                time: new Date(updatedAt).toLocaleString(dateLocale(), {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }),
                name: updatedByName ?? '—',
              })
            : t('admin.common.settings.neverUpdated')}
        </p>
        {onRestoreDefaults && !dirty && (
          <button
            type="button"
            onClick={() => setConfirmRestore(true)}
            className="text-[11px] font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900"
          >
            {t('admin.common.settings.restoreDefaults')}
          </button>
        )}
        {dirty && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDiscard}
              disabled={saving}
              className="rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {t('admin.common.settings.discard')}
            </button>
            <button
              type="submit"
              disabled={!canSave || saving}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('admin.common.settings.save')}
            </button>
          </div>
        )}
      </div>
    </form>

    {/* Ngoài <form>: nút trong hộp thoại không được kích hoạt gửi form. */}
      {confirmRestore && onRestoreDefaults && (
        <ConfirmModal
          title={t('admin.common.settings.restoreTitle')}
          confirmLabel={t('admin.common.settings.restoreConfirm')}
          onCancel={() => setConfirmRestore(false)}
          onConfirm={() => {
            setConfirmRestore(false);
            onRestoreDefaults();
          }}
        >
          <p>{t('admin.common.settings.restoreBody')}</p>
        </ConfirmModal>
      )}
    </>
  );
};
