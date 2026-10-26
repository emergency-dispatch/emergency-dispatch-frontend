import React, { useState } from 'react';
import { ConfirmModal, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { tempLockoutEnd } from './accountMeta';
import { accountAdminService } from '../../../services/admin/accountAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { REASON_MIN_LENGTH } from '../../../services/admin/validation';
import { UserStatus, type UserResponseDto } from '../../../types/auth';
import { useTranslation } from '../../../i18n';

interface AccountActionDialogProps {
  account: UserResponseDto;
  /** lock = khóa kèm lý do; unlock = mở khóa / kích hoạt / gỡ khóa tạm; delete = xóa mềm. */
  mode: 'lock' | 'unlock' | 'delete';
  onCancel: () => void;
  onDone: () => void;
}

export const AccountActionDialog: React.FC<AccountActionDialogProps> = ({ account, mode, onCancel, onDone }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLock = mode === 'lock';
  const reasonLength = reason.trim().length;
  const confirmLabel =
    mode !== 'unlock'
      ? t(`admin.users.action.${mode}.confirm`)
      : account.status === UserStatus.Inactive
        ? t('admin.users.action.activate')
        : account.status === UserStatus.Active && tempLockoutEnd(account)
          ? t('admin.users.action.removeTempLock')
          : t('admin.users.action.unlock.confirm');

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isLock) await accountAdminService.lock(account.id, reason);
      else if (mode === 'unlock') await accountAdminService.unlock(account.id);
      else await accountAdminService.remove(account.id);
      onDone();
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <ConfirmModal
      title={t(`admin.users.action.${mode}.title`, { name: account.fullName })}
      confirmLabel={confirmLabel}
      confirmDisabled={isLock && reasonLength < REASON_MIN_LENGTH}
      submitting={submitting}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />
      <p>
        <span className="font-semibold text-slate-900">{account.email}</span>
        {account.stationName && ` · ${account.stationName}`}
      </p>
      <p>{t(`admin.users.action.${mode}.body`)}</p>
      {isLock && (
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">{t('admin.users.action.lockReason')}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            autoFocus
            placeholder={t('admin.users.action.lockPlaceholder')}
            className={`${inputClass} resize-none`}
          />
          <p
            className={`text-[11px] font-mono-data ${reasonLength >= REASON_MIN_LENGTH ? 'text-slate-400' : 'text-amber-600'}`}
          >
            {t('admin.users.action.lockCounter', { length: reasonLength, min: REASON_MIN_LENGTH })}
          </p>
        </div>
      )}
    </ConfirmModal>
  );
};
