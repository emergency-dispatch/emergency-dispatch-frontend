import React, { useRef, useState } from 'react';
import { ArrowRightLeft, Minus, Plus, TriangleAlert, Warehouse } from 'lucide-react';
import { DrawerShell, FormField, Notice, VehicleStatusBadge, type NoticeState } from '../admin/common/ui';
import { inputClass, validatedInputClass } from '../admin/common/styles';
import { useUnsavedChangesGuard } from '../admin/common/hooks';
import {
  EQUIPMENT_CATEGORY_META,
  STOCK_KEY,
  isNotFoundError,
  isOnDeletedUnit,
  stationOptionLabel,
  type EquipmentStationOption,
  type EquipmentUnitOption,
} from './equipmentMeta';
import { equipmentService } from '../../services/equipmentService';
import { getApiErrorMessage } from '../../services/apiClient';
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_NAME_MAX,
  EQUIPMENT_NOTES_MAX,
  EQUIPMENT_QUANTITY_MAX,
  EQUIPMENT_QUANTITY_MIN,
  type EquipmentCategory,
  type EquipmentDto,
} from '../../types/equipment';
import { useTranslation } from '../../i18n';

interface EquipmentFormDrawerProps {
  /** null → thêm mới. */
  equipment: EquipmentDto | null;
  /** Trạm khi thêm mới: Operator = trạm mình (cố định); Admin = trạm đang lọc ('' = chưa chọn). */
  stationId: string;
  /** Xe chọn làm vị trí đặt. Có `stations` thì lọc theo trạm đang chọn trong form. */
  vehicles: EquipmentUnitOption[];
  /** Chỉ Admin: hiện ô chọn trạm (thêm mới / chuyển thiết bị sang trạm khác). */
  stations?: EquipmentStationOption[];
  /** Giá trị điền sẵn khi thêm mới (theo bộ lọc / thẻ xe đang xem). */
  defaults: { category: EquipmentCategory | ''; unit: string };
  /** Khối phụ cuối form (Admin: lịch sử thay đổi). */
  extra?: React.ReactNode;
  onClose: () => void;
  /** `keepOpen`: người dùng chọn "Lưu & thêm tiếp" — drawer vẫn mở. */
  onSaved: (saved: EquipmentDto, created: boolean, keepOpen: boolean) => void;
  onGone: () => void;
}

const parseQuantity = (raw: string) => (/^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN);

/** Thêm / sửa thiết bị. Operator: trạm cố định. Admin: chọn / đổi trạm. Trạng thái đổi ở danh sách. */
export const EquipmentFormDrawer: React.FC<EquipmentFormDrawerProps> = ({
  equipment,
  stationId,
  vehicles: allVehicles,
  stations,
  defaults,
  extra,
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
    station: equipment?.stationId ?? stationId,
  };
  const [name, setName] = useState(initial.name);
  const [station, setStation] = useState(initial.station);
  // Vừa đổi trạm làm mất xe đang chọn (xe thuộc trạm cũ) → báo đã đưa về Kho trạm.
  const [unitReset, setUnitReset] = useState(false);
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
    notes !== baseline.notes ||
    station !== baseline.station;
  useUnsavedChangesGuard(dirty, t('vehicles.equipment.form.discardConfirm'));

  const qty = parseQuantity(quantity);
  const nameError = !name.trim() ? t('vehicles.equipment.form.nameRequired') : null;
  const quantityError =
    Number.isNaN(qty) || qty < EQUIPMENT_QUANTITY_MIN || qty > EQUIPMENT_QUANTITY_MAX
      ? t('vehicles.equipment.form.quantityInvalid')
      : null;
  const vehicles = stations ? allVehicles.filter((v) => v.stationId === station) : allVehicles;
  const stationError = stations && !station ? t('vehicles.equipment.form.stationRequired') : null;
  // Xe đang giữ thiết bị nhưng không có trong danh sách (Operator: xe bị ẩn khỏi Live Map; xe đã xóa mềm)
  // → vẫn hiện để không mất lựa chọn. Chỉ hiện khi vẫn ở trạm cũ.
  const orphanUnit =
    equipment?.rescueUnitId &&
    station === equipment.stationId &&
    !vehicles.some((v) => v.id === equipment.rescueUnitId)
      ? { id: equipment.rescueUnitId, plate: equipment.rescueUnitPlate ?? '—', deleted: isOnDeletedUnit(equipment) }
      : null;
  // Backend 404 với xe đã xóa → bắt chọn vị trí khác.
  const locationError =
    orphanUnit?.deleted && unit === orphanUnit.id ? t('vehicles.equipment.form.deletedUnitError') : null;
  const canSubmit = !nameError && !quantityError && !stationError && !locationError;
  const movingStation = !!equipment && !!station && station !== equipment.stationId;
  const stationName = (id: string) => {
    const s = stations?.find((x) => x.id === id);
    return s ? stationOptionLabel(s) : (equipment?.stationName ?? '—');
  };

  const changeStation = (next: string) => {
    setStation(next);
    const keeps =
      unit === STOCK_KEY ||
      allVehicles.some((v) => v.id === unit && v.stationId === next) ||
      (!!equipment && next === equipment.stationId && unit === equipment.rescueUnitId);
    if (!keeps) setUnit(STOCK_KEY);
    setUnitReset(!keeps);
  };

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
      // Backend bắt buộc stationId cả khi tạo lẫn sửa; chỉ Admin (có ô chọn trạm) đổi được.
      stationId: stations ? station : (equipment?.stationId ?? stationId),
      rescueUnitId: unit === STOCK_KEY ? null : unit,
      notes: notes.trim() || null,
    };
    try {
      const saved = equipment ? await equipmentService.update(equipment.id, input) : await equipmentService.create(input);
      onSaved(saved, !equipment, keepOpen);
      if (!keepOpen) return;
      // Nhập kho liên tục: giữ trạm + nhóm + vị trí, xóa phần còn lại.
      const next = { ...initial, category, unit, station, name: '', quantity: '1', notes: '' };
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
          onChange={() => {
            setUnit(key);
            setUnitReset(false);
          }}
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

      {stations && (
        <FormField label={t('vehicles.equipment.form.station')} required error={touched ? stationError : null}>
          <select
            value={station}
            onChange={(e) => changeStation(e.target.value)}
            aria-invalid={touched && !!stationError}
            className={validatedInputClass(touched && !!stationError)}
          >
            <option value="">{t('vehicles.equipment.form.stationPlaceholder')}</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {stationOptionLabel(s)}
              </option>
            ))}
          </select>
          {movingStation && (
            <p className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
              <ArrowRightLeft className="w-3.5 h-3.5 shrink-0 mt-px" />
              {t('vehicles.equipment.form.moveStation', {
                from: stationName(equipment.stationId),
                to: stationName(station),
              })}
            </p>
          )}
        </FormField>
      )}

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

      <FormField
        label={t('vehicles.equipment.form.location')}
        required
        hint={stations && !station ? t('vehicles.equipment.form.locationPickStation') : t('vehicles.equipment.form.locationHint')}
        error={locationError}
      >
        {unitReset && <p className="mb-1.5 text-[11px] text-amber-700">{t('vehicles.equipment.form.unitReset')}</p>}
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
            const TypeIcon = v.icon;
            return locationOption(
              v.id,
              <>
                <TypeIcon className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-mono-data font-bold text-slate-900">{v.plate}</span>
                  <span className="block text-[11px] text-slate-500">{v.typeLabel}</span>
                </span>
                <VehicleStatusBadge label={v.statusLabel} color={v.statusColor} />
              </>
            );
          })}
          {orphanUnit &&
            locationOption(
              orphanUnit.id,
              orphanUnit.deleted ? (
                <span className="flex-1 inline-flex items-center gap-1.5 text-sm font-semibold text-red-700">
                  <TriangleAlert className="w-4 h-4 shrink-0" />
                  {t('vehicles.equipment.deletedUnit')}
                </span>
              ) : (
                <span className="flex-1 text-sm font-mono-data font-bold text-slate-900">{orphanUnit.plate}</span>
              )
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

      {extra}
    </DrawerShell>
  );
};
