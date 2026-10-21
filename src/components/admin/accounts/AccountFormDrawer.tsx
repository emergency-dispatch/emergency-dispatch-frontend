import React, { useState } from 'react';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { INTERNAL_ROLES, ROLE_META } from './accountMeta';
import { EMAIL_PATTERN, PHONE_PATTERN, accountAdminService } from '../../../services/admin/accountAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { UserRole } from '../../../types/auth';
import type { InternalAccount, InternalAccountInput, InternalAccountListItem } from '../../../types/internalAccount';

interface AccountFormDrawerProps {
  initialAccount: InternalAccountListItem | null;
  onClose: () => void;
  onSaved: (account: InternalAccount) => void;
}

export const AccountFormDrawer: React.FC<AccountFormDrawerProps> = ({ initialAccount, onClose, onSaved }) => {
  const [form, setForm] = useState<InternalAccountInput>({
    fullName: initialAccount?.fullName ?? '',
    email: initialAccount?.email ?? '',
    phoneNumber: initialAccount?.phoneNumber ?? '',
    role: initialAccount?.role ?? UserRole.Operator,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Đổi vai trò bị chặn khi tài khoản còn giữ vị trí gắn với vai trò hiện tại.
  const roleLockedReason = initialAccount?.headOfStation
    ? `Đang là trưởng trạm "${initialAccount.headOfStation.name}". Gỡ khỏi vị trí trưởng trạm (màn Trạm cứu hộ) trước khi đổi vai trò.`
    : null;

  const set = <K extends keyof InternalAccountInput>(key: K, value: InternalAccountInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const emailValid = EMAIL_PATTERN.test(form.email.trim());
  const phoneValid = PHONE_PATTERN.test(form.phoneNumber.replace(/[\s.-]/g, ''));
  const canSubmit = form.fullName.trim().length > 0 && emailValid && phoneValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const saved = initialAccount
        ? await accountAdminService.update(initialAccount.id, form)
        : await accountAdminService.create(form);
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
        <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required className={inputClass} />
      </FormField>

      <FormField label="Email" required hint={form.email && !emailValid ? 'Email không hợp lệ.' : undefined}>
        <input
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="ten.ho@resq-ai.vn"
          required
          className={inputClass}
        />
      </FormField>

      <FormField
        label="Số điện thoại"
        required
        hint={form.phoneNumber && !phoneValid ? 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.' : undefined}
      >
        <input
          value={form.phoneNumber}
          onChange={(e) => set('phoneNumber', e.target.value)}
          inputMode="tel"
          placeholder="VD: 0981234567"
          required
          className={`${inputClass} font-mono-data`}
        />
      </FormField>

      <FormField label="Vai trò" required hint={roleLockedReason ?? undefined}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INTERNAL_ROLES.map((role) => {
            const meta = ROLE_META[role];
            const active = form.role === role;
            const disabled = !!roleLockedReason && !active;
            return (
              <button
                key={role}
                type="button"
                onClick={() => set('role', role)}
                disabled={disabled}
                className={`text-left p-3 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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

      {!initialAccount && (
        <p className="text-xs text-slate-500">
          Không cần nhập mật khẩu. Hệ thống sẽ gửi email đặt mật khẩu tới địa chỉ email trên.
        </p>
      )}
    </DrawerShell>
  );
};
