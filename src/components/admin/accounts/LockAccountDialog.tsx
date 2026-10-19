import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ConfirmModal, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { LOCK_REASON_MIN_LENGTH, accountAdminService } from '../../../services/admin/accountAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { UserRole } from '../../../types/auth';
import type { InternalAccountListItem } from '../../../types/internalAccount';

interface LockAccountDialogProps {
  account: InternalAccountListItem;
  /** lock = Admin khóa; unlock = mở tài khoản bị Admin khóa (cả hai bắt buộc lý do). */
  mode: 'lock' | 'unlock';
  onCancel: () => void;
  onDone: () => void;
}

export const LockAccountDialog: React.FC<LockAccountDialogProps> = ({ account, mode, onCancel, onDone }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLock = mode === 'lock';
  const reasonLength = reason.trim().length;
  const vehicle = account.assignedVehicle;
  // RescueStaff có xe đang làm nhiệm vụ / hồi sức → không cho khóa.
  const blockedReason = !isLock
    ? null
    : account.currentShiftBusyVehiclePlate
      ? `${account.fullName} đang trong kíp ca hiện tại của xe ${account.currentShiftBusyVehiclePlate} (đang làm nhiệm vụ). Chờ xe hoàn thành nhiệm vụ rồi mới khóa tài khoản.`
      : vehicle?.busy
        ? `Xe ${vehicle.plate} của ${account.fullName} đang làm nhiệm vụ. Chờ xe hoàn thành nhiệm vụ rồi mới khóa tài khoản.`
        : null;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isLock) await accountAdminService.lock(account.id, reason);
      else await accountAdminService.unlock(account.id, reason);
      onDone();
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <ConfirmModal
      title={isLock ? `Khóa tài khoản ${account.fullName}?` : `Mở khóa tài khoản ${account.fullName}?`}
      confirmLabel={isLock ? 'Khóa tài khoản' : 'Mở khóa'}
      confirmDisabled={!!blockedReason || reasonLength < LOCK_REASON_MIN_LENGTH}
      submitting={submitting}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />

      {blockedReason ? (
        <Notice notice={{ kind: 'error', message: blockedReason }} />
      ) : (
        <>
          {isLock && (account.headOfStation || vehicle) && (
            <div className="flex gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                {account.headOfStation && (
                  <p>
                    Đang là trưởng trạm <span className="font-bold">{account.headOfStation.name}</span>. Khóa tài khoản sẽ
                    gỡ khỏi vị trí trưởng trạm; trạm sẽ không có trưởng trạm cho tới khi gán người khác.
                  </p>
                )}
                {vehicle && (
                  <p>
                    Đang phụ trách xe <span className="font-bold font-mono-data">{vehicle.plate}</span>. Khóa tài khoản sẽ
                    gỡ khỏi xe.
                  </p>
                )}
                <p className="text-amber-700">Mở khóa sau này không tự gán lại các vị trí trên.</p>
              </div>
            </div>
          )}
          {isLock && account.role === UserRole.RescueStaff && (
            <p className="text-xs text-slate-500">
              Các ca trực đã xếp của người này không tự gỡ; màn Lịch ca trực sẽ đánh dấu cảnh báo để xếp người khác.
            </p>
          )}
          {!isLock && account.lock.kind === 'admin' && (
            <p className="text-xs">
              Lý do khóa trước đó: <span className="italic">{account.lock.reason}</span>
            </p>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Lý do {isLock ? 'khóa' : 'mở khóa'} *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder={isLock ? 'VD: Nghỉ việc, vi phạm quy trình...' : 'VD: Đã xác minh, cho phép làm việc trở lại...'}
              className={`${inputClass} resize-none`}
            />
            <p
              className={`text-[11px] font-mono-data ${
                reasonLength >= LOCK_REASON_MIN_LENGTH ? 'text-slate-400' : 'text-amber-600'
              }`}
            >
              {reasonLength}/{LOCK_REASON_MIN_LENGTH} ký tự tối thiểu · được ghi vào Audit Trail
            </p>
          </div>
        </>
      )}
    </ConfirmModal>
  );
};
