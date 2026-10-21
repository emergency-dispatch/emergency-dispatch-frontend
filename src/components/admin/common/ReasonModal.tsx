import React, { useState } from 'react';
import { ConfirmModal, Notice } from './ui';
import { inputClass } from './styles';
import { REASON_MIN_LENGTH } from '../../../services/admin/validation';
import { getApiErrorMessage } from '../../../services/apiClient';

interface ReasonModalProps {
  title: string;
  confirmLabel: string;
  reasonLabel: string;
  placeholder?: string;
  /** Nội dung phía trên ô lý do (ghi chú, cảnh báo, trường chọn thêm…). */
  children?: React.ReactNode;
  /** Điều kiện khác ngoài lý do (VD đã chọn thời hạn hợp lệ). */
  extraValid?: boolean;
  onCancel: () => void;
  /** Gọi service; lỗi ném ra được hiện trong hộp thoại. */
  onConfirm: (reason: string) => Promise<void>;
}

/** Hộp thoại xác nhận bắt buộc lý do ≥ 5 ký tự (ghi vào Audit Trail). */
export const ReasonModal: React.FC<ReasonModalProps> = ({
  title,
  confirmLabel,
  reasonLabel,
  placeholder,
  children,
  extraValid = true,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonLength = reason.trim().length;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <ConfirmModal
      title={title}
      confirmLabel={confirmLabel}
      confirmDisabled={!extraValid || reasonLength < REASON_MIN_LENGTH}
      submitting={submitting}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />
      {children}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">{reasonLabel} *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          autoFocus
          placeholder={placeholder}
          className={`${inputClass} resize-none`}
        />
        <p
          className={`text-[11px] font-mono-data ${
            reasonLength >= REASON_MIN_LENGTH ? 'text-slate-400' : 'text-amber-600'
          }`}
        >
          {reasonLength}/{REASON_MIN_LENGTH} ký tự tối thiểu · được ghi vào Audit Trail
        </p>
      </div>
    </ConfirmModal>
  );
};
