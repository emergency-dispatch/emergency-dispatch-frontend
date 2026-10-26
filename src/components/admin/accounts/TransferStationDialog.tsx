import React, { useState } from 'react';
import { ConfirmModal, Notice } from '../common/ui';
import { inputClass } from '../common/styles';
import { useServiceQuery } from '../common/hooks';
import { stationAdminService } from '../../../services/admin/stationAdminService';
import { getApiErrorMessage } from '../../../services/apiClient';
import type { UserResponseDto } from '../../../types/auth';
import { Trans, useTranslation } from '../../../i18n';

interface TransferStationDialogProps {
  account: UserResponseDto;
  onCancel: () => void;
  onDone: (stationName: string | null) => void;
}

/**
 * Điều chuyển một nhân sự cứu hộ sang trạm khác, hoặc gỡ khỏi trạm. Việc chỉ Admin làm được: Operator chỉ quản lý
 * nhân sự trạm mình và không thấy người chưa thuộc trạm nào. Chia tổ ở trạm mới do Operator trạm đó làm.
 */
export const TransferStationDialog: React.FC<TransferStationDialogProps> = ({ account, onCancel, onDone }) => {
  const { t } = useTranslation();
  const stations = useServiceQuery(() => stationAdminService.list({ pageIndex: 1, pageSize: 500 }), 'transfer-stations');
  const [stationId, setStationId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const NONE = 'none';
  const targets = (stations.data?.items ?? []).filter((s) => s.id !== account.stationId && s.isActive);
  const canConfirm = !!stationId && !(stationId === NONE && !account.stationId);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const target = stationId === NONE ? null : stationId;
      await stationAdminService.assignStaff(account.id, target);
      onDone(target ? (targets.find((s) => s.id === target)?.name ?? null) : null);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <ConfirmModal
      title={t('admin.users.transfer.title', { name: account.fullName })}
      confirmLabel={stationId === NONE ? t('admin.users.transfer.remove') : t('admin.users.transfer.confirm')}
      confirmDisabled={!canConfirm}
      submitting={submitting}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      <Notice notice={error ? { kind: 'error', message: error } : null} />
      <p>
        <Trans
          i18nKey="admin.users.transfer.current"
          values={{ station: account.stationName ?? t('admin.users.transfer.noStation') }}
          components={{ b: <strong /> }}
        />
      </p>
      <select
        value={stationId}
        onChange={(e) => setStationId(e.target.value)}
        disabled={stations.loading && !stations.data}
        aria-label={t('admin.users.transfer.newStation')}
        className={inputClass}
      >
        <option value="">{stations.loading && !stations.data ? t('admin.users.transfer.loading') : t('admin.users.transfer.choose')}</option>
        {targets.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
        {account.stationId && <option value={NONE}>{t('admin.users.transfer.removeOption')}</option>}
      </select>
      {stations.error && <p className="text-[11px] text-red-600">{stations.error}</p>}
      <p className="text-xs text-slate-500">
        {t('admin.users.transfer.note')}
      </p>
    </ConfirmModal>
  );
};
