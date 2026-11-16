import React from 'react';
import { useDispatchStore } from '../../../context/DispatchContext';
import type { IncidentCategory } from '../../../types/incident';
import { getLanguage, useTranslation } from '../../../i18n';

interface IncidentTypePickerProps {
  /** Nhóm đang chọn; null = chưa chọn nhóm → không hiện. */
  category: Exclude<IncidentCategory, 'unknown'> | null;
  /** Mã loại đang chọn (mã danh mục). */
  value: string | null;
  onChange: (code: string) => void;
  disabled?: boolean;
  /** Nhãn kiểu dock thẩm định (chữ hoa nhỏ) hoặc mặc định. */
  labelClassName?: string;
}

/**
 * §31: chọn loại sự cố chi tiết trong nhóm (VD nhóm Khác: "Sự cố khác", "Đuối nước / ngập", "Tràn dầu"). Loại quyết
 * định kế hoạch điều xe (§32). Nhóm chỉ có một loại (loại chung) → không hiện gì.
 */
export const IncidentTypePicker: React.FC<IncidentTypePickerProps> = ({
  category,
  value,
  onChange,
  disabled,
  labelClassName = 'text-xs font-semibold text-slate-600 mb-1.5',
}) => {
  const { t } = useTranslation();
  const { incidentTypesOf } = useDispatchStore();
  if (!category) return null;
  const types = incidentTypesOf(category);
  if (types.length <= 1) return null;
  const en = getLanguage() === 'en';

  return (
    <div>
      <p className={labelClassName}>{t('incidents.typePicker.label')}</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('incidents.typePicker.label')}>
        {types.map((type) => {
          const active = value === type.code;
          return (
            <button
              key={type.code}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(type.code)}
              disabled={disabled}
              title={type.description ?? undefined}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                active
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {(en ? type.nameEn : type.nameVi) || type.name || type.code}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{t('incidents.typePicker.hint')}</p>
    </div>
  );
};
