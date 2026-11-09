import React, { useState } from 'react';
import { ConfirmModal, Notice } from '../admin/common/ui';
import { inputClass } from '../admin/common/styles';
import { EQUIPMENT_QUICK_REASONS, isNotFoundError } from './equipmentMeta';
import { equipmentService } from '../../services/equipmentService';
import { getApiErrorMessage } from '../../services/apiClient';
import { EQUIPMENT_NOTES_MAX, EQUIPMENT_REASON_MIN, type EquipmentDto } from '../../types/equipment';
import { useTranslation } from '../../i18n';

interface EquipmentStatusDialogProps {
  equipment: EquipmentDto;
  onCancel: () => void;
  onDone: (updated: EquipmentDto) => void;
  /** Backend 404 — thiết bị đã bị xóa ở nơi khác. */
  onGone: () => void;
}

/**
 * Sẵn sàng → Bảo trì: bắt buộc lý do ≥ 5 ký tự (kèm lý do gợi ý bấm nhanh).
 * Bảo trì → Sẵn sàng: chỉ xác nhận, báo trước lý do cũ sẽ bị xóa.
 */
export const EquipmentStatusDialog: React.FC<EquipmentStatusDialogProps> = ({ equipment, onCancel, onDone, onGone }) => {
  const { t } = useTranslation();
  const toMaintenance = equipment.status === 'Available';
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonLength = reason.trim().length;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await equipmentService.setStatus(
        equipment.id,
        toMaintenance ? 'Maintenance' : 'Available',
        toMaintenance ? reason.trim() : undefined
      );
      onDone(updated);
    } catch (err) {
      if (isNotFoundError(err)) {
        onGone();
        return;
      }
      setError(getApiErrorMessage(err, t('vehicles.equipment.status.failed')));
      setSubmitting(false);
    }
  };

  return (
    <ConfirmModal
      title={
        toMaintenance
          ? t('vehicles.equipment.status.maintenanceTitle', { name: equipment.name })
          : t('vehicles.equipment.status.availableTitle', { name: equipment.name })
      }
      confirmLabel={
        toMaintenance ? t('vehicles.equipment.status.confirmMaintenance') : t('vehicles.equipment.status.confirmAvailable')
      }
      confirmDisabled={toMaintenance && reasonLength < EQUIPMENT_REASON_MIN}
      submitting={submitting}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />
      {toMaintenance ? (
        <>
          <p>{t('vehicles.equipment.status.maintenanceBody')}</p>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-500">{t('vehicles.equipment.status.quickReasonsLabel')}</p>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_QUICK_REASONS.map((key) => {
                const text = t(`vehicles.equipment.status.quickReasons.${key}`);
                const active = reason.trim() === text;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setReason(text)}
                    aria-pressed={active}
                    className={`px-2 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
                      active
                        ? 'bg-amber-50 border-amber-400 text-amber-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="equipment-maintenance-reason" className="block text-xs font-semibold text-slate-700">
              {t('vehicles.equipment.status.reason')} *
            </label>
            <textarea
              id="equipment-maintenance-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              autoFocus
              maxLength={EQUIPMENT_NOTES_MAX}
              placeholder={t('vehicles.equipment.status.reasonPlaceholder')}
              className={`${inputClass} resize-none`}
            />
            <p
              className={`text-[11px] font-mono-data ${
                reasonLength >= EQUIPMENT_REASON_MIN ? 'text-slate-400' : 'text-amber-600'
              }`}
            >
              {t('vehicles.equipment.status.reasonCounter', { length: reasonLength, min: EQUIPMENT_REASON_MIN })}
            </p>
          </div>
        </>
      ) : (
        <>
          <p>{t('vehicles.equipment.status.availableBody')}</p>
          {equipment.statusNote && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-semibold">{t('vehicles.equipment.status.currentNote')}</p>
              <p className="mt-0.5 break-words">{equipment.statusNote}</p>
            </div>
          )}
        </>
      )}
    </ConfirmModal>
  );
};
