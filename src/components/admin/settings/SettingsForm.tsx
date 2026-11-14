import React, { useState } from 'react';
import { Info, RotateCcw, Undo2 } from 'lucide-react';
import { ConfirmModal, Notice, type NoticeState } from '../common/ui';
import { inputClass, labelClass } from '../common/styles';
import { dateLocale, useTranslation } from '../../../i18n';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(dateLocale(), { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

interface SettingsFormProps {
  /** Ghi chú phạm vi áp dụng, hiện đầu form. Không truyền → không hiện khung ghi chú. */
  scopeNote?: React.ReactNode;
  updatedAt: string | null;
  updatedByName: string | null;
  notice: NoticeState;
  onCloseNotice: () => void;
  dirty: boolean;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  /** Không truyền → ẩn nút "Khôi phục mặc định" (cấu hình không có giá trị mặc định ở backend). */
  onRestoreDefaults?: () => void;
  /**
   * Vùng trực quan (VD bản đồ) đặt cạnh form. Có truyền → bố cục hai cột lấp đầy chiều cao màn hình:
   * form là cột trái cố định độ rộng (cuộn riêng), vùng này chiếm phần còn lại. Màn < xl (1280px): xếp trên form.
   */
  aside?: React.ReactNode;
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
  aside,
  children,
}) => {
  const { t } = useTranslation();
  const [confirmRestore, setConfirmRestore] = useState(false);

  const header = (
    <>
      {scopeNote && (
        <div className="flex gap-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{scopeNote}</div>
        </div>
      )}
      <Notice notice={notice} onClose={onCloseNotice} />
    </>
  );

  // Thanh dưới form: người cập nhật gần nhất bên trái, các nút bên phải (tự xuống dòng khi cột hẹp).
  const footer = (
    <div className="px-4 py-3 sm:px-5 border-t border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-3">
      <p className="mr-auto min-w-0 text-[11px] text-slate-500">
        {updatedAt
          ? t('admin.common.settings.lastUpdated', { time: formatDateTime(updatedAt), name: updatedByName ?? '—' })
          : t('admin.common.settings.neverUpdated')}
      </p>
      <div className="w-full sm:w-auto sm:ml-auto grid grid-cols-2 sm:flex gap-2">
        {onRestoreDefaults && (
          <button
            type="button"
            onClick={() => setConfirmRestore(true)}
            className="col-span-2 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('admin.common.settings.restoreDefaults')}
          </button>
        )}
        <button
          type="button"
          onClick={onDiscard}
          disabled={!dirty || saving}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Undo2 className="w-3.5 h-3.5" />
          {t('admin.common.settings.discard')}
        </button>
        <button
          type="submit"
          disabled={!canSave || saving}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t('common.saving') : t('admin.common.settings.save')}
        </button>
      </div>
    </div>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSave) onSave();
  };

  return (
    <>
      {aside ? (
        // Hai cột trong một khung: cột form cố định độ rộng, thân form cuộn riêng; vùng aside lấp phần còn lại.
        <div className="p-4 sm:p-6 flex flex-col gap-4 xl:h-full xl:min-h-[600px]">
          {header}
          <div className="flex-1 min-h-0 flex flex-col xl:flex-row rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col min-h-0 xl:w-[440px] 2xl:w-[480px] shrink-0 xl:border-r border-slate-200"
            >
              <div className="flex-1 min-h-0 xl:overflow-y-auto p-4 sm:p-5 space-y-5">{children}</div>
              {footer}
            </form>
            <div className="order-first xl:order-none relative h-80 sm:h-96 xl:h-auto xl:flex-1 min-w-0 border-b xl:border-b-0 border-slate-200">
              {aside}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-6 max-w-3xl space-y-4">
          {header}
          <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="p-4 sm:p-5 space-y-5">{children}</div>
            {footer}
          </form>
        </div>
      )}

      {confirmRestore && onRestoreDefaults && (
        <ConfirmModal
          title={t('admin.common.settings.restoreTitle')}
          confirmLabel={t('admin.common.settings.restoreConfirm')}
          onCancel={() => setConfirmRestore(false)}
          onConfirm={() => {
            setConfirmRestore(false);
            onRestoreDefaults();
          }}
        >
          <p>{t('admin.common.settings.restoreBody')}</p>
        </ConfirmModal>
      )}
    </>
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
