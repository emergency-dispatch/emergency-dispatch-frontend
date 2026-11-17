import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Info, Plus, X } from 'lucide-react';
import { DrawerFooter, DrawerShell, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { useUnsavedChangesGuard } from '../common/hooks';
import {
  MAX_UNITS_PER_LEVEL,
  PLAN_LEVELS,
  catalogName,
  draftToPlan,
  fallbackLevel,
  levelNumber,
  levelTotal,
  newPlanRowKey,
  planToDraft,
  validatePlanDraft,
  type PlanDraft,
  type PlanRowDraft,
} from './catalogMeta';
import { typeCatalogService } from '../../../services/typeCatalogService';
import { getApiErrorMessage } from '../../../services/apiClient';
import type { DispatchPlanSeverity, IncidentTypeDto, RescueUnitTypeDto } from '../../../types/typeCatalog';
import { useTranslation } from '../../../i18n';

interface DispatchPlanDrawerProps {
  incidentType: IncidentTypeDto;
  /** Danh mục loại xe (kể cả loại đã ẩn); null = chưa tải được. */
  unitTypes: RescueUnitTypeDto[] | null;
  unitTypesError?: string | null;
  onClose: () => void;
  onSaved: (entry: IncidentTypeDto) => void;
}

/** Mã loại sự cố "Khác" chung — loại chi tiết nhóm Khác chưa có kế hoạch riêng dùng kế hoạch của loại này. */
const GENERIC_OTHER_CODE = 'Other';

/**
 * Kế hoạch điều xe theo mức của một loại sự cố (PUT /api/incident-types/{id}/dispatch-plan, §32):
 * mỗi cấp gồm các dòng "loại xe × số lượng", thứ tự dòng = ưu tiên khi thiếu xe, tổng mỗi cấp ≤ 5.
 */
export const DispatchPlanDrawer: React.FC<DispatchPlanDrawerProps> = ({
  incidentType,
  unitTypes,
  unitTypesError,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const [initialDraft] = useState<PlanDraft>(() => planToDraft(incidentType.dispatchPlan));
  const [draft, setDraft] = useState<PlanDraft>(initialDraft);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = validatePlanDraft(draft);
  // So theo nội dung gửi đi (bỏ khóa React của từng dòng).
  const dirty = JSON.stringify(draftToPlan(draft)) !== JSON.stringify(draftToPlan(initialDraft));
  const canSubmit = dirty && Object.keys(errors).length === 0;
  useUnsavedChangesGuard(dirty);

  const nameByCode = useMemo(() => new Map((unitTypes ?? []).map((u) => [u.code, u])), [unitTypes]);
  const activeCodes = useMemo(() => (unitTypes ?? []).filter((u) => u.isActive).map((u) => u.code), [unitTypes]);
  const unitLabel = (code: string) => {
    const entry = nameByCode.get(code);
    return entry ? catalogName(entry) : code;
  };

  const updateLevel = (level: DispatchPlanSeverity, rows: (prev: PlanRowDraft[]) => PlanRowDraft[]) =>
    setDraft((d) => ({ ...d, [level]: rows(d[level]) }));
  const updateRow = (level: DispatchPlanSeverity, key: string, patch: Partial<PlanRowDraft>) =>
    updateLevel(level, (rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const moveRow = (level: DispatchPlanSeverity, index: number, delta: -1 | 1) =>
    updateLevel(level, (rows) => {
      const next = [...rows];
      const [row] = next.splice(index, 1);
      next.splice(index + delta, 0, row);
      return next;
    });
  const addRow = (level: DispatchPlanSeverity) =>
    updateLevel(level, (rows) => {
      const used = new Set(rows.map((r) => r.unitTypeCode));
      const code = activeCodes.find((c) => !used.has(c)) ?? '';
      return [...rows, { key: newPlanRowKey(), unitTypeCode: code, quantity: 1 }];
    });

  const noPlanAtAll = PLAN_LEVELS.every((l) => draft[l].length === 0);
  const usesGenericOther =
    noPlanAtAll && incidentType.category === 'Other' && incidentType.code !== GENERIC_OTHER_CODE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      onSaved(await typeCatalogService.updateDispatchPlan(incidentType.id, { levels: draftToPlan(draft) }));
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      title={t('admin.catalog.plan.title', { name: catalogName(incidentType) })}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <DrawerFooter
          onCancel={onClose}
          submitLabel={t('admin.catalog.plan.save')}
          submitting={submitting}
          canSubmit={canSubmit}
        />
      }
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />
      {unitTypesError && <Notice notice={{ kind: 'error', message: t('admin.catalog.plan.unitTypesFailed') }} />}

      <div className="space-y-1.5 text-[11px] text-slate-500">
        <p>{t('admin.catalog.plan.intro', { max: MAX_UNITS_PER_LEVEL })}</p>
        <p>{t('admin.catalog.plan.priorityHint')}</p>
      </div>

      {(noPlanAtAll || usesGenericOther) && (
        <p className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {usesGenericOther ? t('admin.catalog.plan.otherFallback') : t('admin.catalog.plan.noPlanAtAll')}
        </p>
      )}

      {PLAN_LEVELS.map((level) => {
        const rows = draft[level];
        const total = levelTotal(rows);
        const levelError = errors[level];
        const fallback = rows.length === 0 ? fallbackLevel(draft, level) : null;
        const used = new Set(rows.map((r) => r.unitTypeCode));
        const canAdd = total < MAX_UNITS_PER_LEVEL && activeCodes.some((c) => !used.has(c));
        return (
          <section
            key={level}
            className={`rounded-xl border p-3 space-y-2.5 ${levelError ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">{t('admin.catalog.plan.level', { n: levelNumber(level) })}</h3>
              <span
                className={`text-xs font-mono-data font-bold ${
                  total > MAX_UNITS_PER_LEVEL ? 'text-red-600' : total > 0 ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {t('admin.catalog.plan.total', { total, max: MAX_UNITS_PER_LEVEL })}
              </span>
            </div>

            {rows.length === 0 && (
              <p className="text-[11px] text-slate-400">
                {fallback
                  ? t('admin.catalog.plan.emptyFallback', { n: levelNumber(fallback) })
                  : t('admin.catalog.plan.emptyNoPlan')}
              </p>
            )}

            {rows.map((row, index) => {
              const hiddenOrUnknown = !!row.unitTypeCode && !activeCodes.includes(row.unitTypeCode);
              return (
                <div key={row.key} className="flex items-center gap-1.5">
                  <span className="w-5 shrink-0 text-center text-[11px] font-mono-data text-slate-400">{index + 1}</span>
                  {/* inputClass có sẵn w-full → bọc khung để chia độ rộng (ô chọn co giãn, ô số lượng cố định). */}
                  <div className="flex-1 min-w-0">
                    <select
                      value={row.unitTypeCode}
                      onChange={(e) => updateRow(level, row.key, { unitTypeCode: e.target.value })}
                      aria-label={t('admin.catalog.plan.selectType')}
                      className={`${inputClass} py-2`}
                    >
                      {!row.unitTypeCode && <option value="">{t('admin.catalog.plan.selectType')}</option>}
                      {/* Loại đã ẩn / không còn trong danh mục vẫn hiện để không mất giá trị đang có. */}
                      {hiddenOrUnknown && (
                        <option value={row.unitTypeCode}>
                          {unitLabel(row.unitTypeCode)} {t('admin.catalog.plan.hiddenType')}
                        </option>
                      )}
                      {activeCodes.map((code) => (
                        <option key={code} value={code} disabled={code !== row.unitTypeCode && used.has(code)}>
                          {unitLabel(code)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-16 shrink-0">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_UNITS_PER_LEVEL}
                      step={1}
                      value={Number.isFinite(row.quantity) ? row.quantity : ''}
                      onChange={(e) => updateRow(level, row.key, { quantity: e.target.value === '' ? NaN : Number(e.target.value) })}
                      aria-label={t('admin.catalog.plan.quantity')}
                      title={t('admin.catalog.plan.quantity')}
                      className={`${inputClass} py-2 text-center font-mono-data`}
                    />
                  </div>
                  {/* §34: số lượng = số tổ (mỗi tổ mang 1 xe). */}
                  <span className="text-xs text-slate-500 shrink-0">{t('admin.catalog.plan.quantityUnit')}</span>
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      onClick={() => moveRow(level, index, -1)}
                      disabled={index === 0}
                      title={t('admin.catalog.plan.moveUp')}
                      aria-label={t('admin.catalog.plan.moveUp')}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(level, index, 1)}
                      disabled={index === rows.length - 1}
                      title={t('admin.catalog.plan.moveDown')}
                      aria-label={t('admin.catalog.plan.moveDown')}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateLevel(level, (prev) => prev.filter((r) => r.key !== row.key))}
                      title={t('admin.catalog.plan.remove')}
                      aria-label={t('admin.catalog.plan.remove')}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {levelError && <p className="text-[11px] font-medium text-red-600">{levelError}</p>}

            <button
              type="button"
              onClick={() => addRow(level)}
              disabled={!canAdd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:border-red-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-300 disabled:hover:text-slate-600"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('admin.catalog.plan.addUnit')}
            </button>
          </section>
        );
      })}
    </DrawerShell>
  );
};
