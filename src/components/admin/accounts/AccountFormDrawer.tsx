import React, { useState } from 'react';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { useServiceQuery } from '../common/hooks';
import { INTERNAL_ROLES, ROLE_META } from './accountMeta';
import { accountAdminService } from '../../../services/admin/accountAdminService';
import { stationAdminService } from '../../../services/admin/stationAdminService';
import { EMAIL_PATTERN, PASSWORD_MIN_LENGTH, PHONE_PATTERN } from '../../../services/admin/validation';
import { getApiErrorMessage } from '../../../services/apiClient';
import { UserRole, type UserResponseDto } from '../../../types/auth';
import type { InternalRole } from '../../../types/internalAccount';

interface AccountFormDrawerProps {
  initialAccount: UserResponseDto | null;
  onClose: () => void;
  onSaved: (account: UserResponseDto) => void;
}

const FULL_NAME_MAX_LENGTH = 100;

export const AccountFormDrawer: React.FC<AccountFormDrawerProps> = ({ initialAccount, onClose, onSaved }) => {
  const stations = useServiceQuery(() => stationAdminService.list({ pageIndex: 1, pageSize: 500 }), 'account-stations');
  const isEdit = !!initialAccount;

  const [fullName, setFullName] = useState(initialAccount?.fullName ?? '');
  const [email, setEmail] = useState(initialAccount?.email ?? '');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(initialAccount?.phoneNumber ?? '');
  const [role, setRole] = useState<InternalRole>(
    initialAccount?.role === UserRole.RescueStaff ? UserRole.RescueStaff : UserRole.Operator
  );
  const [stationId, setStationId] = useState(initialAccount?.stationId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stationItems = stations.data?.items ?? [];
  // Trạm cũ có thể đã bị xóa — vẫn hiện để không mất giá trị đang gán.
  const currentStationMissing =
    !!initialAccount?.stationId && !!stations.data && !stationItems.some((s) => s.id === initialAccount.stationId);

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
    const input = { fullName: fullName.trim(), phoneNumber: phone, role, stationId: stationId || null };
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
      title={initialAccount ? `Chỉnh sửa ${initialAccount.fullName}` : 'Tạo tài khoản nội bộ'}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <DrawerFooter
          onCancel={onClose}
          submitLabel={initialAccount ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          submitting={submitting}
          canSubmit={canSubmit}
        />
      }
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />

      <FormField label="Họ tên" required>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={FULL_NAME_MAX_LENGTH}
          required
          className={inputClass}
        />
      </FormField>

      <FormField
        label="Email"
        required
        hint={isEdit ? 'Email đăng nhập không đổi được.' : email && !emailValid ? 'Email không hợp lệ.' : undefined}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ten.ho@resq-ai.vn"
          disabled={isEdit}
          required
          className={inputClass}
        />
      </FormField>

      {!isEdit && (
        <FormField
          label="Mật khẩu ban đầu"
          required
          hint={`Tối thiểu ${PASSWORD_MIN_LENGTH} ký tự. Gửi mật khẩu cho nhân sự; họ tự đổi sau khi đăng nhập.`}
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
        label="Số điện thoại"
        hint={!phoneValid ? 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.' : undefined}
      >
        <input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          inputMode="tel"
          placeholder="VD: 0981234567"
          className={`${inputClass} font-mono-data`}
        />
      </FormField>

      <FormField label="Vai trò" required>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INTERNAL_ROLES.map((r) => {
            const meta = ROLE_META[r];
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
                <span className={`block text-sm font-bold ${active ? 'text-red-700' : 'text-slate-800'}`}>{meta.label}</span>
                <span className="block mt-1 text-[11px] text-slate-500">{meta.description}</span>
              </button>
            );
          })}
        </div>
      </FormField>

      <FormField label="Trạm công tác" hint="Bỏ trống nếu chưa phân công trạm.">
        <select
          value={stationId}
          onChange={(e) => setStationId(e.target.value)}
          disabled={stations.loading && !stations.data}
          className={inputClass}
        >
          <option value="">— Chưa gán trạm —</option>
          {initialAccount?.stationId && currentStationMissing && (
            <option value={initialAccount.stationId}>{initialAccount.stationName || 'Trạm không còn tồn tại'}</option>
          )}
          {stationItems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.isActive ? '' : ' (tạm ngưng)'}
            </option>
          ))}
        </select>
        {stations.error && <p className="text-[11px] text-red-600">{stations.error}</p>}
      </FormField>
    </DrawerShell>
  );
};
