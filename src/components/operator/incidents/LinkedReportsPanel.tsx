import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CopyCheck,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Split,
  User,
  Video,
} from 'lucide-react';
import { getApiErrorMessage } from '../../../services/apiClient';
import { incidentService } from '../../../services/incidentService';
import { formatDateTime } from '../../../utils/incidentFormat';
import { CATEGORY_FROM_EVENT_TYPE, type BackendEventType, type LinkedReportDto } from '../../../types/incident';
import i18n, { dateLocale, useTranslation } from '../../../i18n';

// Số ảnh thu nhỏ hiện trên mỗi báo cáo; phần còn lại gộp vào "+N".
const MAX_THUMBS = 4;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi)(\?|$)/i;

type PendingAction = { reportId: string; kind: 'unlink' | 'confirm' };

interface LinkedReportsPanelProps {
  /** Chỗ dùng gắn `key={parentIncidentId}` để đổi sự cố thì bỏ thao tác đang dở. */
  parentIncidentId: string;
  /**
   * linkedReportCount của sự cố gốc — đổi khi backend gom thêm / tách / xác nhận trùng
   * (đẩy qua ReceiveIncidentUpdate) → tải lại danh sách.
   */
  linkedReportCount: number;
  /** Operator khác đang giữ ca → chỉ xem. */
  readOnly?: boolean;
  /**
   * Tách báo cáo qua store (`useDispatchStore().unlinkLinkedReport`) để người vừa tách không bị bật popup
   * "tin báo mới". Không truyền → gọi thẳng API.
   */
  onUnlink?: (reportId: string, reason?: string) => Promise<{ ok: boolean; message?: string }>;
  /**
   * Vừa tách / xác nhận xong và không còn báo cáo nào đang gộp → nơi dùng đưa Operator về việc chính
   * (drawer quay về tab Thẩm định, hộp thoại Live Map đóng). `message` = thông báo thành công.
   */
  onAllHandled?: (message: string) => void;
}

const eventTypeLabel = (type: BackendEventType | null | undefined): string | null => {
  const category = type ? CATEGORY_FROM_EVENT_TYPE[type] : undefined;
  return category ? i18n.t(`enums.category.${category}`) : null;
};

/**
 * BR-07 — báo cáo trùng backend đã tự gom vào sự cố gốc (cùng chỗ, cùng lúc, cùng loại).
 * Operator không bắt buộc thao tác: sự cố gốc hoàn thành → báo cáo tự đóng; sự cố gốc bị hủy → báo cáo quay lại hàng đợi.
 * "Tách ra" khi gom nhầm (báo cáo thành SOS mới trong hàng đợi); "Xác nhận trùng" để đóng hẳn báo cáo.
 */
export const LinkedReportsPanel: React.FC<LinkedReportsPanelProps> = ({
  parentIncidentId,
  linkedReportCount,
  readOnly = false,
  onUnlink,
  onAllHandled,
}) => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<LinkedReportDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  /** Tải danh sách; trả danh sách mới (null nếu lỗi) để submit biết còn báo cáo đang gộp không. */
  const load = useCallback(async (): Promise<LinkedReportDto[] | null> => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await incidentService.getLinkedReports(parentIncidentId);
      setReports(list);
      return list;
    } catch (err) {
      setLoadError(getApiErrorMessage(err, i18n.t('incidents.linked.loadFailed')));
      return null;
    } finally {
      setLoading(false);
    }
  }, [parentIncidentId]);

  useEffect(() => {
    load();
  }, [load, linkedReportCount]);

  const startAction = (action: PendingAction) => {
    setPending(action);
    setNote('');
    setNotice(null);
  };

  const submit = async () => {
    if (!pending) return;
    const { reportId, kind } = pending;
    setBusyId(reportId);
    setNotice(null);
    let doneMessage: string | null = null;
    try {
      if (kind === 'unlink') {
        if (onUnlink) {
          const result = await onUnlink(reportId, note.trim());
          if (!result.ok) throw new Error(result.message || t('incidents.linked.actionFailed'));
        } else {
          await incidentService.unlinkReport(reportId, note.trim());
        }
      } else {
        await incidentService.confirmDuplicate(reportId, note.trim());
      }
      setPending(null);
      setNote('');
      doneMessage = t(kind === 'unlink' ? 'incidents.linked.unlinkDone' : 'incidents.linked.confirmDone');
      setNotice({ kind: 'ok', text: doneMessage });
    } catch (err) {
      // 400 = báo cáo đã được tách / xác nhận ở nơi khác → tải lại cho khớp.
      setNotice({ kind: 'error', text: getApiErrorMessage(err, t('incidents.linked.actionFailed')) });
    } finally {
      setBusyId(null);
    }
    const list = await load();
    // Xử lý xong báo cáo cuối cùng → không để Operator kẹt ở danh sách trống.
    if (doneMessage && list && !list.some((r) => r.status === 'Linked')) onAllHandled?.(doneMessage);
  };

  const activeCount = reports.filter((r) => r.status === 'Linked').length;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {t('incidents.linked.heading', { count: loading && reports.length === 0 ? linkedReportCount : activeCount })}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t('incidents.linked.help')}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {t('incidents.linked.reload')}
        </button>
      </div>

      {readOnly && (
        <p className="text-[11px] text-slate-500 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5">
          {t('incidents.linked.readOnly')}
        </p>
      )}

      {notice && (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-1.5 rounded-lg border px-3 py-2 text-xs ${
            notice.kind === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {notice.kind === 'error' ? (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" />
          )}
          {notice.text}
        </p>
      )}

      {loadError ? (
        <p className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          {loadError}
        </p>
      ) : loading && reports.length === 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-500 py-4">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {t('incidents.linked.loading')}
        </p>
      ) : reports.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">{t('incidents.linked.empty')}</p>
      ) : (
        <ul className="space-y-2.5">
          {reports.map((report) => {
            const isLinked = report.status === 'Linked';
            const isPending = pending?.reportId === report.incidentId;
            const isBusy = busyId === report.incidentId;
            const reportedType = eventTypeLabel(report.reportedEventType);
            const yoloType = eventTypeLabel(report.quickCheckEventType);
            const extraMedia = report.mediaUrls.length - MAX_THUMBS;
            return (
              <li
                key={report.incidentId}
                className={`rounded-xl border p-3 space-y-2 ${
                  !isLinked
                    ? 'border-slate-200 bg-slate-50 opacity-75'
                    : report.isOutlier
                      ? 'border-amber-300 bg-amber-50/60'
                      : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5 text-xs text-slate-700">
                    <p className="flex items-center gap-1.5 min-w-0">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold truncate">{report.reporterName || t('incidents.linked.anonymous')}</span>
                      {report.maskedReporterPhone && (
                        <span className="inline-flex items-center gap-1 font-mono-data text-slate-500 shrink-0">
                          <Phone className="w-3 h-3" />
                          {report.maskedReporterPhone}
                        </span>
                      )}
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {formatDateTime(report.reportedAt)}
                      {report.distanceMeters != null &&
                        ` · ${t('incidents.linked.distance', {
                          meters: Math.round(report.distanceMeters).toLocaleString(dateLocale()),
                        })}`}
                    </p>
                  </div>
                  {isLinked ? (
                    report.isOutlier && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-800 shrink-0">
                        <AlertTriangle className="w-3 h-3" />
                        {t('incidents.linked.outlier')}
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 text-[10px] font-bold text-slate-600 shrink-0">
                      <CopyCheck className="w-3 h-3" />
                      {t('incidents.linked.confirmedBadge')}
                    </span>
                  )}
                </div>

                {report.description && <p className="text-sm text-slate-700 leading-relaxed break-words">{report.description}</p>}
                {report.locationAddress && (
                  <p className="flex items-start gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-px" />
                    <span className="break-words">{report.locationAddress}</span>
                  </p>
                )}

                {(reportedType || yoloType) && (
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {reportedType && (
                      <span className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600">
                        {t('incidents.linked.reportedType', { type: reportedType })}
                      </span>
                    )}
                    {yoloType && (
                      <span className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600">
                        {t('incidents.linked.yoloType', { type: yoloType })}
                      </span>
                    )}
                  </div>
                )}

                {report.mediaUrls.length > 0 && (
                  <div className="flex gap-1.5">
                    {report.mediaUrls.slice(0, MAX_THUMBS).map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-16 h-12 rounded-md overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0"
                        title={t('incidents.linked.openMedia')}
                      >
                        {VIDEO_EXT.test(url) ? (
                          <Video className="w-4 h-4 text-slate-400" />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        )}
                      </a>
                    ))}
                    {extraMedia > 0 && (
                      <span className="w-12 h-12 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0">
                        +{extraMedia}
                      </span>
                    )}
                  </div>
                )}

                {isLinked && !readOnly && (
                  isPending ? (
                    <div
                      className={`rounded-lg border p-2.5 space-y-2 ${
                        pending.kind === 'unlink' ? 'border-blue-200 bg-blue-50/60' : 'border-slate-300 bg-slate-50'
                      }`}
                    >
                      <p className="text-xs text-slate-700">
                        {t(pending.kind === 'unlink' ? 'incidents.linked.unlinkPrompt' : 'incidents.linked.confirmPrompt')}
                      </p>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder={t(
                          pending.kind === 'unlink' ? 'incidents.linked.unlinkPlaceholder' : 'incidents.linked.confirmPlaceholder'
                        )}
                        className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setPending(null)}
                          disabled={isBusy}
                          className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {t('incidents.linked.back')}
                        </button>
                        <button
                          onClick={submit}
                          disabled={isBusy}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-white disabled:opacity-60 ${
                            pending.kind === 'unlink' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                        >
                          {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                          {t(pending.kind === 'unlink' ? 'incidents.linked.unlinkConfirm' : 'incidents.linked.confirmConfirm')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        onClick={() => startAction({ reportId: report.incidentId, kind: 'unlink' })}
                        disabled={!!busyId}
                        title={t('incidents.linked.unlinkTitle')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-blue-200 bg-white text-[11px] font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        <Split className="w-3 h-3" />
                        {t('incidents.linked.unlink')}
                      </button>
                      <button
                        onClick={() => startAction({ reportId: report.incidentId, kind: 'confirm' })}
                        disabled={!!busyId}
                        title={t('incidents.linked.confirmTitle')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <CopyCheck className="w-3 h-3" />
                        {t('incidents.linked.confirm')}
                      </button>
                    </div>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
