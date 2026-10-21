import React, { useState } from 'react';
import { ConfirmModal, Notice } from '../common/ui';
import { accountAdminService } from '../../../services/admin/accountAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { UserStatus, type UserResponseDto } from '../../../types/auth';

interface AccountActionDialogProps {
  account: UserResponseDto;
  /** lock = đặt Bị khóa (Suspended); unlock = đặt Hoạt động (mở khóa hoặc kích hoạt); delete = xóa mềm. */
  mode: 'lock' | 'unlock' | 'delete';
  onCancel: () => void;
  onDone: () => void;
}

const COPY = {
  lock: {
    title: (name: string) => `Khóa tài khoản ${name}?`,
    confirm: 'Khóa tài khoản',
    body: 'Người này sẽ không đăng nhập được cho tới khi được mở khóa. Phiên đăng nhập đang mở hết hiệu lực khi token hết hạn.',
  },
  unlock: {
    title: (name: string) => `Mở khóa tài khoản ${name}?`,
    confirm: 'Mở khóa',
    body: 'Tài khoản chuyển về trạng thái Hoạt động và đăng nhập lại được.',
  },
  delete: {
    title: (name: string) => `Xóa tài khoản ${name}?`,
    confirm: 'Xóa tài khoản',
    body: 'Xóa mềm: tài khoản bị ẩn khỏi hệ thống và không đăng nhập được nữa. Không khôi phục được từ giao diện.',
  },
};

export const AccountActionDialog: React.FC<AccountActionDialogProps> = ({ account, mode, onCancel, onDone }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[mode];
  const unlockLabel = mode === 'unlock' && account.status === UserStatus.Inactive ? 'Kích hoạt' : copy.confirm;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'lock') await accountAdminService.lock(account.id);
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
      confirmLabel={unlockLabel}
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
    </ConfirmModal>
  );
};
