import React, { useState } from 'react';
import { Info, RotateCcw, Undo2 } from 'lucide-react';
import { ConfirmModal, Notice, type NoticeState } from '../common/ui';
import { inputClass, labelClass } from '../common/styles';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

interface SettingsFormProps {
  /** Ghi chú phạm vi áp dụng, hiện đầu form. */
  scopeNote: React.ReactNode;
  updatedAt: string | null;
  updatedByName: string | null;
  notice: NoticeState;
  onCloseNotice: () => void;
  dirty: boolean;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onRestoreDefaults: () => void;
  children: React.ReactNode;
}

/** Khung chung cho các màn cấu hình tham số: ghi chú, người cập nhật gần nhất, thanh nút Lưu / Hủy / Mặc định. */
export const SettingsForm: React.FC<SettingsFormProps> = ({
  scopeNote,
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
  const [confirmRestore, setConfirmRestore] = useState(false);

  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-4">
      <div className="flex gap-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>{scopeNote}</div>
      </div>

      <Notice notice={notice} onClose={onCloseNotice} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) onSave();
        }}
        className="rounded-xl border border-slate-200 bg-white shadow-xs"
      >
        <div className="p-4 sm:p-5 space-y-5">{children}</div>

        <div className="p-4 sm:px-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmRestore(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục mặc định
          </button>
          <div className="sm:ml-auto grid grid-cols-2 sm:flex gap-3">
            <button
              type="button"
              onClick={onDiscard}
              disabled={!dirty || saving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Hủy thay đổi
            </button>
            <button
              type="submit"
              disabled={!canSave || saving}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>
      </form>

      <p className="text-[11px] text-slate-500">
        {updatedAt
          ? `Cập nhật gần nhất: ${formatDateTime(updatedAt)} bởi ${updatedByName ?? '—'}.`
          : 'Chưa có ai cập nhật — đang dùng giá trị mặc định.'}
      </p>

      {confirmRestore && (
        <ConfirmModal
          title="Khôi phục giá trị mặc định?"
          confirmLabel="Khôi phục"
          onCancel={() => setConfirmRestore(false)}
          onConfirm={() => {
            setConfirmRestore(false);
            onRestoreDefaults();
          }}
        >
          <p>Form sẽ được điền lại bằng giá trị mặc định. Cấu hình chỉ thay đổi khi bạn bấm “Lưu cấu hình”.</p>
        </ConfirmModal>
      )}
    </div>
  );
};

/** Ô nhập số kèm đơn vị và lỗi theo trường. Giữ giá trị dạng chuỗi để gõ dở (VD "2.") không bị nhảy. */
export const NumberSettingField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  step?: number;
  hint?: string;
  error?: string;
}> = ({ label, value, onChange, unit, step = 0.5, hint, error }) => (
  <div className="space-y-1.5">
    <label className={labelClass}>{label}</label>
    <div className="flex items-stretch max-w-[220px]">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={`${inputClass} rounded-r-none font-mono-data ${error ? 'border-red-400' : ''}`}
      />
      <span className="px-3 flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 text-xs text-slate-500 whitespace-nowrap">
        {unit}
      </span>
    </div>
    {error ? <p className="text-[11px] text-red-600">{error}</p> : hint && <p className="text-[11px] text-slate-500">{hint}</p>}
  </div>
);
