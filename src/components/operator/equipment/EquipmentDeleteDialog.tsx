import React, { useState } from 'react';
import { ConfirmModal, Notice } from '../../admin/common/ui';
import { isNotFoundError } from './equipmentMeta';
import { equipmentService } from '../../../services/equipmentService';
import { getApiErrorMessage } from '../../../services/apiClient';
import type { EquipmentDto } from '../../../types/equipment';
import { useTranslation } from '../../../i18n';

interface EquipmentDeleteDialogProps {
  equipment: EquipmentDto;
  /** Biển số xe / "Kho trạm". */
  locationLabel: string;
  onCancel: () => void;
  onDeleted: (deleted: EquipmentDto) => void;
  /** Backend 404 — đã bị xóa ở nơi khác. */
  onGone: () => void;
}

/** Xác nhận xóa (mềm) một thiết bị; lỗi hiện ngay trong hộp thoại. */
export const EquipmentDeleteDialog: React.FC<EquipmentDeleteDialogProps> = ({
  equipment,
  locationLabel,
  onCancel,
  onDeleted,
  onGone,
}) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await equipmentService.remove(equipment.id);
      onDeleted(equipment);
    } catch (err) {
      if (isNotFoundError(err)) {
        onGone();
        return;
      }
      setError(getApiErrorMessage(err, t('vehicles.equipment.delete.failed')));
      setSubmitting(false);
    }
  };

  return (
    <ConfirmModal
      title={t('vehicles.equipment.delete.title', { name: equipment.name })}
      confirmLabel={t('vehicles.equipment.delete.confirm')}
      submitting={submitting}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />
      <p className="font-mono-data text-xs text-slate-500">
        ×{equipment.quantity} · {t(`vehicles.equipment.category.${equipment.category}`)} · {locationLabel}
      </p>
      <p>{t('vehicles.equipment.delete.body')}</p>
    </ConfirmModal>
  );
};
