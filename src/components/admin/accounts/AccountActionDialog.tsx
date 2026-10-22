import React, { useState } from 'react';
import { ConfirmModal, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { tempLockoutEnd } from './accountMeta';
import { accountAdminService } from '../../../services/admin/accountAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { REASON_MIN_LENGTH } from '../../../services/admin/validation';
import { UserStatus, type UserResponseDto } from '../../../types/auth';

interface AccountActionDialogProps {
  account: UserResponseDto;
  /** lock = khóa kèm lý do; unlock = mở khóa / kích hoạt / gỡ khóa tạm; delete = xóa mềm. */
  mode: 'lock' | 'unlock' | 'delete';
  onCancel: () => void;
  onDone: () => void;
}

const COPY = {
  lock: {
    title: (name: string) => `Khóa tài khoản ${name}?`,
    confirm: 'Khóa tài khoản',
    body: 'Người này bị đăng xuất khỏi mọi thiết bị ngay và không đăng nhập được cho tới khi được mở khóa.',
  },
  unlock: {
    title: (name: string) => `Mở khóa tài khoản ${name}?`,
    confirm: 'Mở khóa',
    body: 'Tài khoản chuyển về trạng thái Hoạt động và đăng nhập lại được. Khóa tạm do đăng nhập sai (nếu có) cũng được gỡ.',
  },
  delete: {
    title: (name: string) => `Xóa tài khoản ${name}?`,
    confirm: 'Xóa tài khoản',
    body: 'Xóa mềm: tài khoản bị ẩn khỏi hệ thống và không đăng nhập được nữa. Không khôi phục được từ giao diện.',
  },
};

export const AccountActionDialog: React.FC<AccountActionDialogProps> = ({ account, mode, onCancel, onDone }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[mode];
  const isLock = mode === 'lock';
  const reasonLength = reason.trim().length;
  const confirmLabel =
    mode !== 'unlock'
      ? copy.confirm
      : account.status === UserStatus.Inactive
        ? 'Kích hoạt'
        : account.status === UserStatus.Active && tempLockoutEnd(account)
          ? 'Gỡ khóa tạm'
          : copy.confirm;

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
      title={copy.title(account.fullName)}
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
      <p>{copy.body}</p>
      {isLock && (
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">Lý do khóa *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            autoFocus
            placeholder="VD: Tạm đình chỉ chờ xác minh vi phạm quy trình..."
            className={`${inputClass} resize-none`}
          />
          <p
            className={`text-[11px] font-mono-data ${reasonLength >= REASON_MIN_LENGTH ? 'text-slate-400' : 'text-amber-600'}`}
          >
            {reasonLength}/{REASON_MIN_LENGTH} ký tự tối thiểu · hiển thị cạnh trạng thái tài khoản
          </p>
        </div>
      )}
    </ConfirmModal>
  );
};
