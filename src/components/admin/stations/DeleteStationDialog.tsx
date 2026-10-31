import React, { useState } from 'react';
import { ConfirmModal, Notice } from '../common/ui';
import { useServiceQuery } from '../common/hooks';
import { stationAdminService } from '../../../services/admin/stationAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { ON_MISSION_UNIT_STATUSES } from '../../../types/rescueUnit';
import type { StationResponseDto } from '../../../types/station';
import { Trans, useTranslation } from '../../../i18n';

interface DeleteStationDialogProps {
  station: StationResponseDto;
  onCancel: () => void;
  /** Số xe chuyển sang Ngừng hoạt động và số nhân sự bị gỡ khỏi trạm. */
  onDeleted: (result: { units: number; staff: number }) => void;
}

export const DeleteStationDialog: React.FC<DeleteStationDialogProps> = ({ station, onCancel, onDeleted }) => {
  const { t } = useTranslation();
  // Đọc lại chi tiết để có trạng thái xe mới nhất trước khi xóa.
  const detail = useServiceQuery(() => stationAdminService.getById(station.id), station.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const units = detail.data?.rescueUnits ?? [];
  const staff = detail.data?.staffMembers ?? [];
  const busy = units.filter((u) => ON_MISSION_UNIT_STATUSES.includes(u.status));

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await stationAdminService.remove(station.id);
      onDeleted({ units: units.length, staff: staff.length });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <ConfirmModal
      title={t('admin.stations.deleteDialog.title')}
      confirmLabel={t('admin.stations.deleteDialog.confirm')}
      confirmDisabled={detail.loading || !!detail.error || busy.length > 0}
      submitting={submitting}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      <p>
        <Trans
          i18nKey="admin.stations.deleteDialog.body"
          values={{ name: station.name }}
          components={{ b: <span className="font-semibold text-slate-900" /> }}
        />
      </p>

      {detail.loading ? (
        <p className="text-slate-400">{t('admin.stations.deleteDialog.checking')}</p>
      ) : detail.error ? (
        <Notice notice={{ kind: 'error', message: detail.error }} />
      ) : busy.length > 0 ? (
        <Notice
          notice={{
            kind: 'error',
            message: t('admin.stations.deleteDialog.busy', {
              count: busy.length,
              plates: busy.map((u) => u.plateNumber).join(', '),
            }),
          }}
        />
      ) : units.length === 0 && staff.length === 0 ? (
        <p>{t('admin.stations.deleteDialog.empty')}</p>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2 text-amber-800">
          {units.length > 0 && (
            <>
              <p className="font-semibold">
                {t('admin.stations.deleteDialog.unitsMoved', { count: units.length })}
              </p>
              <ul className="space-y-1 text-xs">
                {units.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3">
                    <span className="font-mono-data font-semibold text-slate-800">{u.plateNumber}</span>
                    <span className="text-slate-500">{t(`enums.unitStatus.${u.status}`, { defaultValue: u.statusName })}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {staff.length > 0 && (
            <p className="text-xs">
              {t('admin.stations.deleteDialog.staffRemoved', { count: staff.length })}
            </p>
          )}
        </div>
      )}

      <Notice notice={error ? { kind: 'error', message: error } : null} />
    </ConfirmModal>
  );
};
