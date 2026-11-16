import React, { useState } from 'react';
import { Ban, Check } from 'lucide-react';
import { DrawerFooter, DrawerShell, FormField, Notice } from '../common/ui';
import { validatedInputClass } from '../common/styles';
import {
  CATALOG_ICON_KEYS,
  CATALOG_LIMITS,
  INCIDENT_TYPE_CATEGORIES,
  catalogColor,
  catalogIcon,
  catalogName,
  catalogToDraft,
  draftToUpsert,
  validateCatalogDraft,
  type CatalogFormDraft,
} from './catalogMeta';
import { typeCatalogService } from '../../../services/typeCatalogService';
import { getApiErrorMessage } from '../../../services/apiClient';
import type { IncidentTypeDto, RescueUnitTypeDto } from '../../../types/typeCatalog';
import { getLanguage, useTranslation } from '../../../i18n';

type Props =
  | {
      kind: 'unit';
      initial: RescueUnitTypeDto | null;
      nextOrder: number;
      onClose: () => void;
      onSaved: (entry: RescueUnitTypeDto) => void;
    }
  | {
      kind: 'incident';
      initial: IncidentTypeDto | null;
      nextOrder: number;
      onClose: () => void;
      onSaved: (entry: IncidentTypeDto) => void;
    };

/** Thêm / sửa một loại xe hoặc loại sự cố (POST / PUT /api/rescue-unit-types | /api/incident-types). */
export const CatalogTypeFormDrawer: React.FC<Props> = (props) => {
  const { kind, initial, nextOrder, onClose } = props;
  const { t } = useTranslation();
  const isNew = !initial;
  const [draft, setDraft] = useState<CatalogFormDraft>(() => catalogToDraft(initial, nextOrder));
  // Chỉ báo lỗi sau khi rời ô hoặc bấm lưu (đang gõ không đỏ).
  const [touched, setTouched] = useState<Partial<Record<keyof CatalogFormDraft, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = validateCatalogDraft(draft, isNew);
  const showError = (key: keyof typeof errors) => ((submitted || touched[key]) && errors[key]) || undefined;
  const set = <K extends keyof CatalogFormDraft>(key: K, value: CatalogFormDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const blur = (key: keyof CatalogFormDraft) => () => setTouched((x) => ({ ...x, [key]: true }));

  const categoryLocked = kind === 'incident' && !!initial?.isSystem;
  const previewColor = catalogColor(draft.color.trim());
  const previewName = (getLanguage() === 'en' ? draft.nameEn : draft.nameVi).trim() || draft.code.trim() || '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    setError(null);
    const body = draftToUpsert(draft);
    try {
      if (props.kind === 'unit') {
        props.onSaved(
          props.initial
            ? await typeCatalogService.updateUnitType(props.initial.id, body)
            : await typeCatalogService.createUnitType(body)
        );
      } else {
        props.onSaved(
          props.initial
            ? await typeCatalogService.updateIncidentType(props.initial.id, body)
            : await typeCatalogService.createIncidentType(body)
        );
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  const group = kind === 'unit' ? 'unitTypes' : 'incidentTypes';

  return (
    <DrawerShell
      title={
        initial
          ? t(`admin.catalog.${group}.editTitle`, { name: catalogName(initial) })
          : t(`admin.catalog.${group}.addTitle`)
      }
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <DrawerFooter
          onCancel={onClose}
          submitLabel={t('admin.catalog.form.save')}
          submitting={submitting}
          canSubmit={!submitted || Object.keys(errors).length === 0}
        />
      }
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />

      {/* Xem trước: icon + màu + tên như sẽ hiện ở các danh sách. */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
        <span
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${previewColor}1A`, color: previewColor }}
        >
          {/* createElement: icon đổi theo lựa chọn, không khai báo component mới trong lúc render. */}
          {React.createElement(catalogIcon(draft.icon), { className: 'w-5 h-5' })}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-mono-data uppercase tracking-wider text-slate-400">{t('admin.catalog.form.preview')}</p>
          <p className="text-sm font-bold text-slate-900 truncate">{previewName}</p>
        </div>
      </div>

      <FormField
        label={t('admin.catalog.form.code')}
        required={isNew}
        hint={isNew ? t('admin.catalog.form.codeHint') : t('admin.catalog.form.codeLocked')}
        error={showError('code')}
      >
        <input
          value={draft.code}
          onChange={(e) => set('code', e.target.value)}
          onBlur={blur('code')}
          disabled={!isNew}
          maxLength={50}
          placeholder={t('admin.catalog.form.codePlaceholder')}
          className={`${validatedInputClass(!!showError('code'))} font-mono-data`}
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={t('admin.catalog.form.nameVi')} required error={showError('nameVi')}>
          <input
            value={draft.nameVi}
            onChange={(e) => set('nameVi', e.target.value)}
            onBlur={blur('nameVi')}
            maxLength={CATALOG_LIMITS.name}
            className={validatedInputClass(!!showError('nameVi'))}
          />
        </FormField>
        <FormField label={t('admin.catalog.form.nameEn')} required error={showError('nameEn')}>
          <input
            value={draft.nameEn}
            onChange={(e) => set('nameEn', e.target.value)}
            onBlur={blur('nameEn')}
            maxLength={CATALOG_LIMITS.name}
            className={validatedInputClass(!!showError('nameEn'))}
          />
        </FormField>
      </div>

      {kind === 'incident' && (
        <FormField
          label={t('admin.catalog.form.category')}
          required
          hint={
            categoryLocked
              ? t('admin.catalog.form.categoryLocked')
              : t(`admin.catalog.form.categoryHint.${draft.category}`)
          }
        >
          <div className="grid grid-cols-3 gap-2">
            {INCIDENT_TYPE_CATEGORIES.map((c) => {
              const active = draft.category === c;
              return (
                <button
                  key={c}
                  type="button"
                  disabled={categoryLocked}
                  onClick={() => set('category', c)}
                  className={`py-2.5 px-2 rounded-lg border text-xs font-bold transition-colors disabled:cursor-not-allowed ${
                    active
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'border-slate-300 text-slate-500 hover:text-slate-900 disabled:opacity-50 disabled:hover:text-slate-500'
                  }`}
                >
                  {t(`admin.catalog.category.${c}`)}
                </button>
              );
            })}
          </div>
        </FormField>
      )}

      <FormField label={t('admin.catalog.form.description')} error={showError('description')}>
        <textarea
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          onBlur={blur('description')}
          rows={2}
          maxLength={CATALOG_LIMITS.description}
          className={`${validatedInputClass(!!showError('description'))} resize-y`}
        />
      </FormField>

      <FormField label={t('admin.catalog.form.icon')}>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
          <button
            type="button"
            onClick={() => set('icon', '')}
            title={t('admin.catalog.form.noIcon')}
            aria-label={t('admin.catalog.form.noIcon')}
            aria-pressed={!draft.icon}
            className={`aspect-square rounded-lg border flex items-center justify-center transition-colors ${
              !draft.icon ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-200 text-slate-400 hover:text-slate-900'
            }`}
          >
            <Ban className="w-4 h-4" />
          </button>
          {/* Mã icon lạ (VD do mobile đặt) vẫn hiện để không mất giá trị. */}
          {[...CATALOG_ICON_KEYS, ...(draft.icon && !CATALOG_ICON_KEYS.includes(draft.icon) ? [draft.icon] : [])].map(
            (key) => {
              const Icon = catalogIcon(key);
              const active = draft.icon === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('icon', key)}
                  title={key}
                  aria-label={key}
                  aria-pressed={active}
                  className={`aspect-square rounded-lg border flex items-center justify-center transition-colors ${
                    active ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-200 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            }
          )}
        </div>
      </FormField>

      {/* Không cho chọn màu: backend chỉ lưu, chưa dùng. Màu đang có (VD màu seed của loại hệ thống) vẫn được giữ
          trong bản nháp và gửi lại khi lưu, vì PUT ghi đè cả bản ghi. */}
      <FormField
        label={t('admin.catalog.form.displayOrder')}
        hint={t('admin.catalog.form.displayOrderHint')}
        error={showError('displayOrder')}
      >
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={draft.displayOrder}
          onChange={(e) => set('displayOrder', e.target.value)}
          onBlur={blur('displayOrder')}
          className={`${validatedInputClass(!!showError('displayOrder'))} font-mono-data sm:max-w-[12rem]`}
        />
      </FormField>

      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-red-600"
        />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
            {draft.isActive && <Check className="w-3.5 h-3.5 text-emerald-600" />}
            {t('admin.catalog.form.isActive')}
          </span>
          <span className="block text-[11px] text-slate-500 mt-0.5">{t('admin.catalog.form.isActiveHint')}</span>
        </span>
      </label>
    </DrawerShell>
  );
};
