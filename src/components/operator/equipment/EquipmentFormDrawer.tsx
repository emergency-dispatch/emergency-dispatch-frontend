import React, { useRef, useState } from 'react';
import { Minus, Plus, Warehouse } from 'lucide-react';
import { DrawerShell, FormField, Notice, VehicleStatusBadge, type NoticeState } from '../../admin/common/ui';
import { inputClass, validatedInputClass } from '../../admin/common/styles';
import { useUnsavedChangesGuard } from '../../admin/common/hooks';
import { EQUIPMENT_CATEGORY_META, STOCK_KEY, isNotFoundError } from './equipmentMeta';
import { VEHICLE_STATUS_META, VEHICLE_TYPE_META } from '../../../data/liveMapMeta';
import { equipmentService } from '../../../services/equipmentService';
import { getApiErrorMessage } from '../../../services/apiClient';
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_NAME_MAX,
  EQUIPMENT_NOTES_MAX,
  EQUIPMENT_QUANTITY_MAX,
  EQUIPMENT_QUANTITY_MIN,
  type EquipmentCategory,
  type EquipmentDto,
} from '../../../types/equipment';
import type { Vehicle } from '../../../types/vehicle';
import { useTranslation } from '../../../i18n';

interface EquipmentFormDrawerProps {
  /** null → thêm mới. */
  equipment: EquipmentDto | null;
  stationId: string;
  /** Xe của trạm (chọn vị trí đặt). */
  vehicles: Vehicle[];
  /** Giá trị điền sẵn khi thêm mới (theo bộ lọc / thẻ xe đang xem). */
  defaults: { category: EquipmentCategory | ''; unit: string };
  onClose: () => void;
  /** `keepOpen`: người dùng chọn "Lưu & thêm tiếp" — drawer vẫn mở. */
  onSaved: (saved: EquipmentDto, created: boolean, keepOpen: boolean) => void;
  onGone: () => void;
}

const parseQuantity = (raw: string) => (/^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN);

/** Thêm / sửa thiết bị của trạm Operator. Trạm cố định; trạng thái đổi ở danh sách. */
export const EquipmentFormDrawer: React.FC<EquipmentFormDrawerProps> = ({
  equipment,
  stationId,
  vehicles,
  defaults,
  onClose,
  onSaved,
  onGone,
}) => {
  const { t } = useTranslation();
  const initial = {
    name: equipment?.name ?? '',
    category: equipment?.category ?? (defaults.category || 'Other'),
    quantity: String(equipment?.quantity ?? 1),
    unit: equipment ? equipment.rescueUnitId ?? STOCK_KEY : defaults.unit || STOCK_KEY,
    notes: equipment?.notes ?? '',
  };
  const [name, setName] = useState(initial.name);
  const [category, setCategory] = useState<EquipmentCategory>(initial.category);
  const [quantity, setQuantity] = useState(initial.quantity);
  const [unit, setUnit] = useState(initial.unit);
  const [notes, setNotes] = useState(initial.notes);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  // Mốc so sánh "đã sửa gì chưa" — đổi sau mỗi lần "Lưu & thêm tiếp".
  const [baseline, setBaseline] = useState(initial);
  const nameRef = useRef<HTMLInputElement>(null);

  const dirty =
    name !== baseline.name ||
    category !== baseline.category ||
    quantity !== baseline.quantity ||
    unit !== baseline.unit ||
    notes !== baseline.notes;
  useUnsavedChangesGuard(dirty, t('vehicles.equipment.form.discardConfirm'));

  const qty = parseQuantity(quantity);
  const nameError = !name.trim() ? t('vehicles.equipment.form.nameRequired') : null;
  const quantityError =
    Number.isNaN(qty) || qty < EQUIPMENT_QUANTITY_MIN || qty > EQUIPMENT_QUANTITY_MAX
      ? t('vehicles.equipment.form.quantityInvalid')
      : null;
  const canSubmit = !nameError && !quantityError;

  // Xe đang giữ thiết bị nhưng không còn trong danh sách xe trạm (VD xe bị ẩn khỏi Live Map) → vẫn hiện để không mất lựa chọn.
  const orphanUnit =
    equipment?.rescueUnitId && !vehicles.some((v) => v.id === equipment.rescueUnitId)
      ? { id: equipment.rescueUnitId, plate: equipment.rescueUnitPlate ?? '—' }
      : null;

  const close = () => {
    if (dirty && !window.confirm(t('vehicles.equipment.form.discardConfirm'))) return;
    onClose();
  };

  const save = async (keepOpen: boolean) => {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    setNotice(null);
    const input = {
      name: name.trim(),
      category,
      quantity: qty,
      // Backend bắt buộc stationId cả khi tạo lẫn sửa; Operator không đổi được trạm.
      stationId: equipment?.stationId ?? stationId,
      rescueUnitId: unit === STOCK_KEY ? null : unit,
      notes: notes.trim() || null,
    };
    try {
      const saved = equipment ? await equipmentService.update(equipment.id, input) : await equipmentService.create(input);
      onSaved(saved, !equipment, keepOpen);
      if (!keepOpen) return;
      // Nhập kho liên tục: giữ nhóm + vị trí, xóa phần còn lại.
      const next = { ...initial, category, unit, name: '', quantity: '1', notes: '' };
      setName('');
      setQuantity('1');
      setNotes('');
      setTouched(false);
      setBaseline(next);
      setNotice({ kind: 'success', message: t('vehicles.equipment.form.addedInline', { name: saved.name }) });
      nameRef.current?.focus();
    } catch (err) {
      if (isNotFoundError(err) && equipment) {
        onGone();
        return;
      }
      setNotice({ kind: 'error', message: getApiErrorMessage(err, t('vehicles.equipment.form.saveFailed')) });
    } finally {
      setSubmitting(false);
    }
  };

  const shownNameError = touched ? nameError : null;
  const shownQuantityError = touched || quantity !== baseline.quantity ? quantityError : null;
  const stepQuantity = (delta: number) => {
    const base = Number.isNaN(qty) ? EQUIPMENT_QUANTITY_MIN : qty;
    setQuantity(String(Math.min(EQUIPMENT_QUANTITY_MAX, Math.max(EQUIPMENT_QUANTITY_MIN, base + delta))));
  };

  const locationOption = (key: string, content: React.ReactNode) => {
    const active = unit === key;
    return (
      <label
        key={key}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
          active ? 'bg-red-50 border-red-500' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <input
          type="radio"
          name="equipment-location"
          value={key}
          checked={active}
          onChange={() => setUnit(key)}
          className="accent-red-600"
        />
        {content}
      </label>
    );
  };

  const footer = (
    <div className={`col-span-2 grid gap-2 ${equipment ? 'grid-cols-2' : 'grid-cols-3'}`}>
      <button
        type="button"
        onClick={close}
        className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
      >
        {t('common.cancel')}
      </button>
      {!equipment && (
        <button
          type="button"
          onClick={() => save(true)}
          disabled={!canSubmit || submitting}
          className="py-3 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm transition-colors"
        >
          {t('vehicles.equipment.form.saveAndNext')}
        </button>
      )}
      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
      >
        {submitting ? t('common.saving') : t('vehicles.equipment.form.save')}
      </button>
    </div>
  );

  return (
    <DrawerShell
      title={equipment ? t('vehicles.equipment.form.editTitle') : t('vehicles.equipment.form.createTitle')}
      onClose={close}
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
      footer={footer}
    >
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <FormField label={t('vehicles.equipment.form.name')} required error={shownNameError}>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name && setTouched(true)}
          maxLength={EQUIPMENT_NAME_MAX}
          autoFocus
          placeholder={t('vehicles.equipment.form.namePlaceholder')}
          aria-invalid={!!shownNameError}
          className={validatedInputClass(!!shownNameError)}
        />
      </FormField>

      <FormField label={t('vehicles.equipment.form.category')} required>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup">
          {EQUIPMENT_CATEGORIES.map((key) => {
            const meta = EQUIPMENT_CATEGORY_META[key];
            const Icon = meta.icon;
            const active = category === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setCategory(key)}
                className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-center transition-colors ${
                  active ? `${meta.bg} border-current ${meta.text}` : 'border-slate-300 text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-bold">{t(`vehicles.equipment.category.${key}`)}</span>
                <span className={`text-[10px] leading-tight ${active ? 'opacity-80' : 'text-slate-400'}`}>
                  {t(`vehicles.equipment.categoryHint.${key}`)}
                </span>
              </button>
            );
          })}
        </div>
      </FormField>

      <FormField
        label={t('vehicles.equipment.form.quantity')}
        required
        hint={t('vehicles.equipment.form.quantityHint')}
        error={shownQuantityError}
      >
        <div className="flex items-stretch w-40">
          <button
            type="button"
            onClick={() => stepQuantity(-1)}
            disabled={!Number.isNaN(qty) && qty <= EQUIPMENT_QUANTITY_MIN}
            aria-label={t('vehicles.equipment.form.decrease')}
            className="px-3 rounded-l-lg border border-r-0 border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            aria-label={t('vehicles.equipment.form.quantity')}
            aria-invalid={!!shownQuantityError}
            className={`${validatedInputClass(!!shownQuantityError)} rounded-none text-center font-mono-data tabular-nums`}
          />
          <button
            type="button"
            onClick={() => stepQuantity(1)}
            disabled={!Number.isNaN(qty) && qty >= EQUIPMENT_QUANTITY_MAX}
            aria-label={t('vehicles.equipment.form.increase')}
            className="px-3 rounded-r-lg border border-l-0 border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </FormField>

      <FormField label={t('vehicles.equipment.form.location')} required hint={t('vehicles.equipment.form.locationHint')}>
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {locationOption(
            STOCK_KEY,
            <>
              <Warehouse className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{t('vehicles.equipment.stock')}</span>
                <span className="block text-[11px] text-slate-500">{t('vehicles.equipment.group.stockHint')}</span>
              </span>
            </>
          )}
          {vehicles.map((v) => {
            const TypeIcon = VEHICLE_TYPE_META[v.type].icon;
            return locationOption(
              v.id,
              <>
                <TypeIcon className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-mono-data font-bold text-slate-900">{v.plate}</span>
                  <span className="block text-[11px] text-slate-500">{t(`enums.unitType.${v.unitType}`)}</span>
                </span>
                <VehicleStatusBadge
                  label={t(`enums.vehicleStatus.${v.status}`)}
                  color={VEHICLE_STATUS_META[v.status].color}
                />
              </>
            );
          })}
          {orphanUnit &&
            locationOption(
              orphanUnit.id,
              <span className="flex-1 text-sm font-mono-data font-bold text-slate-900">{orphanUnit.plate}</span>
            )}
        </div>
      </FormField>

      <FormField
        label={t('vehicles.equipment.form.notes')}
        hint={t('vehicles.equipment.form.counter', { length: notes.length, max: EQUIPMENT_NOTES_MAX })}
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={EQUIPMENT_NOTES_MAX}
          placeholder={t('vehicles.equipment.form.notesPlaceholder')}
          className={`${inputClass} resize-none`}
        />
      </FormField>

      {equipment ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 space-y-1">
          <p>
            <span className="font-semibold text-slate-700">{t('vehicles.equipment.form.statusNow')}: </span>
            <span className={equipment.status === 'Maintenance' ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'}>
              {t(`vehicles.equipment.statusLabel.${equipment.status}`)}
            </span>
            {equipment.statusNote && <span className="text-slate-500"> — {equipment.statusNote}</span>}
          </p>
          <p className="text-slate-500">{t('vehicles.equipment.form.statusEditHint')}</p>
        </div>
      ) : (
        <p className="text-xs text-slate-500">{t('vehicles.equipment.form.createHint')}</p>
      )}
    </DrawerShell>
  );
};
