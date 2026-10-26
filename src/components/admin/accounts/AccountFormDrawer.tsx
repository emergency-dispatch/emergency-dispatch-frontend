import React, { useState } from 'react';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { INTERNAL_ROLES } from './accountMeta';
import { accountAdminService } from '../../../services/admin/accountAdminService';
import { EMAIL_PATTERN, PASSWORD_MIN_LENGTH, PHONE_PATTERN } from '../../../services/admin/validation';
import { getApiErrorMessage } from '../../../services/apiClient';
import { UserRole, type UserResponseDto } from '../../../types/auth';
import type { InternalRole } from '../../../types/internalAccount';
import { useTranslation } from '../../../i18n';

interface AccountFormDrawerProps {
  initialAccount: UserResponseDto | null;
  onClose: () => void;
  onSaved: (account: UserResponseDto) => void;
}

const FULL_NAME_MAX_LENGTH = 100;

export const AccountFormDrawer: React.FC<AccountFormDrawerProps> = ({ initialAccount, onClose, onSaved }) => {
  const { t } = useTranslation();
  const isEdit = !!initialAccount;

  const [fullName, setFullName] = useState(initialAccount?.fullName ?? '');
  const [email, setEmail] = useState(initialAccount?.email ?? '');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(initialAccount?.phoneNumber ?? '');
  const [role, setRole] = useState<InternalRole>(
    initialAccount?.role === UserRole.RescueStaff ? UserRole.RescueStaff : UserRole.Operator
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phone = phoneNumber.replace(/[\s.-]/g, '');
  const emailValid = EMAIL_PATTERN.test(email.trim());
  const phoneValid = !phone || PHONE_PATTERN.test(phone);
  const passwordValid = isEdit || password.length >= PASSWORD_MIN_LENGTH;
  const nameValid = fullName.trim().length > 0 && fullName.trim().length <= FULL_NAME_MAX_LENGTH;
  const canSubmit = nameValid && emailValid && phoneValid && passwordValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const input = { fullName: fullName.trim(), phoneNumber: phone, role };
    try {
      const saved = initialAccount
        ? await accountAdminService.update(initialAccount.id, input)
        : await accountAdminService.create({ ...input, email: email.trim().toLowerCase(), password });
      onSaved(saved);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      title={
        initialAccount
          ? t('admin.users.form.editTitle', { name: initialAccount.fullName })
          : t('admin.users.form.addTitle')
      }
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <DrawerFooter
          onCancel={onClose}
          submitLabel={initialAccount ? t('admin.users.form.saveChanges') : t('admin.users.form.create')}
          submitting={submitting}
          canSubmit={canSubmit}
        />
      }
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />

      <FormField label={t('admin.users.form.fullName')} required>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={FULL_NAME_MAX_LENGTH}
          required
          className={inputClass}
        />
      </FormField>

      <FormField
        label={t('admin.users.form.email')}
        required
        hint={
          isEdit
            ? t('admin.users.form.emailLocked')
            : email && !emailValid
              ? t('admin.users.form.emailInvalid')
              : undefined
        }
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('admin.users.form.emailPlaceholder')}
          disabled={isEdit}
          required
          className={inputClass}
        />
      </FormField>

      {!isEdit && (
        <FormField
          label={t('admin.users.form.password')}
          required
          hint={t('admin.users.form.passwordHint', { min: PASSWORD_MIN_LENGTH })}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            className={inputClass}
          />
        </FormField>
      )}

      <FormField
        label={t('admin.users.form.phone')}
        hint={!phoneValid ? t('admin.users.form.phoneInvalid') : undefined}
      >
        <input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          inputMode="tel"
          placeholder={t('admin.users.form.phonePlaceholder')}
          className={`${inputClass} font-mono-data`}
        />
      </FormField>

      <FormField label={t('admin.users.form.role')} required>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INTERNAL_ROLES.map((r) => {
            const active = role === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  active ? 'bg-red-50 border-red-500' : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <span className={`block text-sm font-bold ${active ? 'text-red-700' : 'text-slate-800'}`}>{t(`admin.users.roles.${r}.label`)}</span>
                <span className="block mt-1 text-[11px] text-slate-500">{t(`admin.users.roles.${r}.description`)}</span>
              </button>
            );
          })}
        </div>
      </FormField>

      <p className="text-xs text-slate-500">
        {initialAccount?.stationName
          ? t('admin.users.form.currentStation', { station: initialAccount.stationName })
          : ''}
        {t('admin.users.form.stationNote')}
      </p>
    </DrawerShell>
  );
};
