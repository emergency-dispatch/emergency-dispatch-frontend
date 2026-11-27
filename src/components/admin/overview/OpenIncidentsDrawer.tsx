import React, { useEffect, useState } from 'react';
import { Ban, Loader2, X } from 'lucide-react';
import { Notice } from '../common/ui';
import { ReasonModal } from '../common/ReasonModal';
import { inputClass, labelClass } from '../common/styles';
import { showToast } from '../common/toastStore';
import { useServiceQuery } from '../common/hooks';
import { severityLabel } from '../escalation/escalationMeta';
import {
  openIncidentAdminService,
  type OpenIncidentStatus,
} from '../../../services/admin/openIncidentAdminService';
import { stationAdminService } from '../../../services/admin/stationAdminService';
import { CANCELLATION_REASON_OPTIONS } from '../../../data/incidentMock';
import type { IncidentResponseDto, OperatorCancellationCode } from '../../../types/incident';
import { dateLocale, useTranslation } from '../../../i18n';

interface OpenIncidentsDrawerProps {
  title: string;
  statuses: readonly OpenIncidentStatus[];
  onClose: () => void;
  /** Đã hủy một sự cố → trang Tổng quan tải lại số liệu. */
  onChanged: () => void;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(dateLocale(), { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', hour12: false });

type OrphanReason = 'none' | 'deleted' | 'inactive';

/**
 * Danh sách sự cố đang mở toàn hệ thống (từ ô "Sự cố đang mở" của Tổng quan) — Admin chỉ giám sát, không điều phối (việc
 * của Operator trạm phụ trách). Ngoại lệ duy nhất: ca **mồ côi** (chưa có trạm phụ trách, trạm đã bị xóa hoặc ngừng hoạt
 * động → không Operator nào thấy để xử lý) mới có nút Hủy sự cố, và được xếp lên đầu.
 */
export const OpenIncidentsDrawer: React.FC<OpenIncidentsDrawerProps> = ({ title, statuses, onClose, onChanged }) => {
  const { t } = useTranslation();
  const query = useServiceQuery(() => openIncidentAdminService.list(statuses), `open-incidents:${statuses.join(',')}`);
  const [cancelling, setCancelling] = useState<IncidentResponseDto | null>(null);
  const [reasonCode, setReasonCode] = useState<OperatorCancellationCode>('Other');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !cancelling && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, cancelling]);

  // Trạm còn tồn tại (GET /stations không trả trạm đã xóa) — chưa tải xong thì chưa coi ca nào là mồ côi.
  const stations = useServiceQuery(() => stationAdminService.list({ pageIndex: 1, pageSize: 500 }), 'open-incidents-stations');
  const stationById = new Map((stations.data?.items ?? []).map((s) => [s.id, s]));
  const orphanReason = (item: IncidentResponseDto): OrphanReason | null => {
    if (!stations.data) return null;
    if (!item.responsibleStationId) return 'none';
    const station = stationById.get(item.responsibleStationId);
    if (!station) return 'deleted';
    return station.isActive === false ? 'inactive' : null;
  };
  // Ca mồ côi lên đầu (việc Admin cần làm), còn lại giữ thứ tự cũ nhất trước.
  const items = [...(query.data ?? [])].sort(
    (a, b) => Number(orphanReason(b) !== null) - Number(orphanReason(a) !== null)
  );
  const orphanCount = items.filter((item) => orphanReason(item) !== null).length;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-0 right-0 h-full w-full max-w-xl bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('admin.monitoring.openList.hint')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}
          {orphanCount > 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              {t('admin.monitoring.openList.orphanCount', { count: orphanCount })}
            </p>
          )}
          {query.loading && !query.data ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('admin.common.loading')}
            </p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">{t('admin.monitoring.openList.empty')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {items.map((item) => {
                const orphan = orphanReason(item);
                return (
                <li key={item.id} className={`flex items-start gap-3 px-4 py-3 ${orphan ? 'bg-amber-50/50' : ''}`}>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      {item.code && <span className="font-mono-data font-semibold text-slate-600">{item.code}</span>}
                      <span
                        className={`px-1.5 py-0.5 rounded border text-[11px] font-bold ${
                          item.status === 'Escalated'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        {t(`admin.monitoring.incident.status.${item.status}`)}
                      </span>
                      <span className="text-slate-500">{severityLabel(item.severity)}</span>
                      {orphan && (
                        <span className="px-1.5 py-0.5 rounded border border-amber-300 bg-amber-100 text-[11px] font-bold text-amber-800">
                          {t(`admin.monitoring.openList.orphan.${orphan}`)}
                        </span>
                      )}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                    <p className="text-xs text-slate-500 truncate" title={item.locationAddress}>
                      {item.locationAddress}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t('admin.monitoring.openList.station')}{' '}
                      {item.responsibleStationName ? (
                        <span className="font-semibold text-slate-700">{item.responsibleStationName}</span>
                      ) : (
                        <span className="font-semibold text-amber-700">{t('admin.monitoring.openList.noStation')}</span>
                      )}
                      {' · '}
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  {orphan ? (
                    <button
                      onClick={() => {
                        setReasonCode('Other');
                        setCancelling(item);
                      }}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {t('admin.monitoring.openList.cancel')}
                    </button>
                  ) : (
                    <span className="shrink-0 text-[11px] text-slate-400">{t('admin.monitoring.openList.handledByOperator')}</span>
                  )}
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {cancelling && (
        <ReasonModal
          title={t('admin.monitoring.openList.cancelTitle', { code: cancelling.code || cancelling.title })}
          confirmLabel={t('admin.monitoring.openList.cancelConfirm')}
          reasonLabel={t('admin.monitoring.openList.reasonLabel')}
          placeholder={t('admin.monitoring.openList.reasonPlaceholder')}
          onCancel={() => setCancelling(null)}
          onConfirm={async (reason) => {
            await openIncidentAdminService.cancel(cancelling.id, reasonCode, reason.trim());
            showToast(t('admin.monitoring.openList.cancelled', { code: cancelling.code || cancelling.title }), {
              kind: 'success',
            });
            setCancelling(null);
            query.reload();
            onChanged();
          }}
        >
          <p className="text-xs text-slate-600">{t('admin.monitoring.openList.cancelNote')}</p>
          <div className="space-y-1.5">
            <label className={labelClass}>{t('admin.monitoring.openList.reasonCode')}</label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value as OperatorCancellationCode)}
              className={inputClass}
            >
              {CANCELLATION_REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(`enums.cancellationReason.${opt.value}`)}
                </option>
              ))}
            </select>
          </div>
        </ReasonModal>
      )}
    </>
  );
};
