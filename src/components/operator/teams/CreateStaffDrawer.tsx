import React, { useState } from 'react';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../../admin/common/ui';
import { validatedInputClass as fieldClass } from '../../admin/common/styles';
import { EMAIL_PATTERN, PASSWORD_MIN_LENGTH, PHONE_PATTERN } from '../../../services/admin/validation';
import { getApiErrorMessage } from '../../../services/apiClient';
import { stationTeamService } from '../../../services/stationTeamService';
import type { UserResponseDto } from '../../../types/auth';
import { useTranslation } from '../../../i18n';

interface CreateStaffDrawerProps {
  stationName: string;
  onClose: () => void;
  onCreated: (staff: UserResponseDto) => void;
}

// Backend (CreateUserDto) giới hạn họ tên 100 ký tự.
const FULL_NAME_MAX_LENGTH = 100;

type Field = 'fullName' | 'email' | 'password' | 'phone';

/**
 * Operator tạo tài khoản lực lượng cứu hộ cho trạm mình. Vai trò luôn là RescueStaff và trạm do backend tự gán
 * nên form không có hai ô này. Tạo xong, xếp người đó vào tổ ở cột "Tổ làm việc".
 */
export const CreateStaffDrawer: React.FC<CreateStaffDrawerProps> = ({ stationName, onClose, onCreated }) => {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [touched, setTouched] = useState<Set<Field>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phone = phoneNumber.replace(/[\s.-]/g, '');
  const errors: Record<Field, string | null> = {
    fullName: !fullName.trim() ? t('teams.createStaff.nameRequired') : null,
    email: !email.trim()
      ? t('teams.createStaff.emailRequired')
      : !EMAIL_PATTERN.test(email.trim())
        ? t('teams.createStaff.emailInvalid')
        : null,
    password: !password
      ? t('teams.createStaff.passwordRequired')
      : password.length < PASSWORD_MIN_LENGTH
        ? t('teams.createStaff.passwordTooShort', { min: PASSWORD_MIN_LENGTH, length: password.length })
        : null,
    phone: phone && !PHONE_PATTERN.test(phone) ? t('teams.createStaff.phoneInvalid') : null,
  };
  const shownError = (field: Field) => (touched.has(field) ? errors[field] : null);
  const touch = (field: Field) => setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(errors).some(Boolean)) {
      setTouched(new Set(['fullName', 'email', 'password', 'phone']));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await stationTeamService.createStaff({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phoneNumber: phone,
      });
      onCreated(created);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      title={t('teams.createStaff.title')}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <DrawerFooter onCancel={onClose} submitLabel={t('teams.createStaff.submit')} submitting={submitting} canSubmit />
      }
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />

      <FormField label={t('teams.createStaff.fullName')} required error={shownError('fullName')}>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onBlur={() => touch('fullName')}
          maxLength={FULL_NAME_MAX_LENGTH}
          aria-invalid={!!shownError('fullName')}
          className={fieldClass(!!shownError('fullName'))}
        />
      </FormField>

      <FormField
        label={t('teams.createStaff.email')}
        required
        hint={t('teams.createStaff.emailHint')}
        error={shownError('email')}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => touch('email')}
          placeholder={t('teams.createStaff.emailPlaceholder')}
          autoComplete="off"
          aria-invalid={!!shownError('email')}
          className={fieldClass(!!shownError('email'))}
        />
      </FormField>

      <FormField
        label={t('teams.createStaff.password')}
        required
        hint={t('teams.createStaff.passwordHint', { min: PASSWORD_MIN_LENGTH })}
        error={shownError('password')}
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => touch('password')}
          autoComplete="new-password"
          aria-invalid={!!shownError('password')}
          className={fieldClass(!!shownError('password'))}
        />
      </FormField>

      <FormField label={t('teams.createStaff.phone')} error={shownError('phone')}>
        <input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          onBlur={() => touch('phone')}
          inputMode="tel"
          placeholder={t('teams.createStaff.phonePlaceholder')}
          aria-invalid={!!shownError('phone')}
          className={`${fieldClass(!!shownError('phone'))} font-mono-data`}
        />
      </FormField>

      <p className="text-xs text-slate-500">{t('teams.createStaff.scope', { station: stationName })}</p>
    </DrawerShell>
  );
};
