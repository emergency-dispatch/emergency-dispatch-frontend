import React, { useEffect } from 'react';
import { ExternalLink, Lock, PenLine, X } from 'lucide-react';
import { labelClass } from '../common/styles';
import { formatDateTime, severityMeta } from '../reports/reportMeta';
import { unitTypeLabel } from '../fleetMeta';
import { isVideoUrl, reportTeamLabel } from './completionMeta';
import type { CompletionReportHistoryItemDto } from '../../../types/report';
import type { RescueUnitTypeDto } from '../../../types/typeCatalog';
import { useTranslation } from '../../../i18n';

interface CompletionReportDrawerProps {
  report: CompletionReportHistoryItemDto;
  /** Danh mục loại xe (tên theo ngôn ngữ); null → nhãn dịch / mã. */
  unitTypes: RescueUnitTypeDto[] | null;
  onClose: () => void;
  /** Mở sự cố trong Báo cáo sự cố (tìm theo mã). */
  onOpenIncident: (report: CompletionReportHistoryItemDto) => void;
  /** Mở nhật ký thao tác của sự cố. */
  onOpenAudit: (report: CompletionReportHistoryItemDto) => void;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[130px_1fr] gap-3 py-2 border-b border-slate-100 last:border-0">
    <dt className="text-xs text-slate-500">{label}</dt>
    <dd className="text-sm text-slate-900 min-w-0 break-words">{children}</dd>
  </div>
);

const shortTime = (iso: string | null) => (iso ? formatDateTime(iso) : '—');

/** §36: một biên bản nghiệm thu — nội dung xử lý, xe, ảnh hiện trường, bàn giao, chữ ký. Chỉ đọc. */
export const CompletionReportDrawer: React.FC<CompletionReportDrawerProps> = ({
  report,
  unitTypes,
  onClose,
  onOpenIncident,
  onOpenAudit,
}) => {
  const { t } = useTranslation();
  const severity = report.incidentSeverity ? severityMeta(report.incidentSeverity) : null;
  const hasHandover = !!(
    report.handoverEntity ||
    report.handoverContactName ||
    report.handoverContactPhone ||
    report.handoverNotes
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('admin.monitoring.completion.drawer.title')}
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900">{report.incidentTitle}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
              {report.incidentCode && (
                <span className="font-mono-data font-semibold text-slate-600">{report.incidentCode}</span>
              )}
              {severity && (
                <span className={`px-1.5 py-px rounded-md border text-[10px] font-bold ${severity.badgeClass}`}>
                  {severity.label}
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{report.incidentAddress}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <dl>
            <Row label={t('admin.monitoring.completion.drawer.station')}>{report.stationName || '—'}</Row>
            <Row label={t('admin.monitoring.completion.drawer.team')}>{reportTeamLabel(report)}</Row>
            <Row label={t('admin.monitoring.completion.drawer.submittedBy')}>{report.submittedByName || '—'}</Row>
            <Row label={t('admin.monitoring.completion.drawer.submittedAt')}>
              <span className="font-mono-data">{formatDateTime(report.submittedAt)}</span>
            </Row>
            <Row label={t('admin.monitoring.completion.drawer.incidentStatus')}>
              {report.incidentStatus
                ? t(`admin.monitoring.incident.status.${report.incidentStatus}`, { defaultValue: report.incidentStatus })
                : '—'}
              {report.incidentClosedAt && (
                <span className="text-slate-500 font-mono-data text-xs"> · {formatDateTime(report.incidentClosedAt)}</span>
              )}
            </Row>
          </dl>

          <section className="space-y-1.5">
            <h3 className={labelClass}>{t('admin.monitoring.completion.drawer.actions')}</h3>
            <p className="text-sm text-slate-800 whitespace-pre-line">{report.actionsSummary || '—'}</p>
            <dl className="pt-1">
              <Row label={t('admin.monitoring.completion.drawer.victims')}>{report.victimsAssistedCount}</Row>
              <Row label={t('admin.monitoring.completion.drawer.equipment')}>
                {report.equipmentUsed.length === 0 ? (
                  <span className="text-slate-400">{t('admin.monitoring.completion.drawer.noEquipment')}</span>
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {report.equipmentUsed.map((item) => (
                      <span key={item} className="px-1.5 py-0.5 rounded bg-slate-100 text-xs text-slate-700">
                        {item}
                      </span>
                    ))}
                  </span>
                )}
              </Row>
            </dl>
          </section>

          <section className="space-y-1.5">
            <h3 className={labelClass}>{t('admin.monitoring.completion.drawer.units')}</h3>
            <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100">
              {report.units.map((u) => (
                <li key={u.assignmentId} className="px-3 py-2 text-xs">
                  <p className="font-mono-data font-bold text-slate-900">
                    {u.plateNumber}
                    <span className="ml-1.5 font-sans font-normal text-slate-500">{unitTypeLabel(u.unitType, unitTypes)}</span>
                  </p>
                  <p className="mt-0.5 font-mono-data text-[11px] text-slate-500">
                    {t('admin.monitoring.completion.drawer.dispatched')} {shortTime(u.dispatchedAt)} ·{' '}
                    {t('admin.monitoring.completion.drawer.arrived')} {shortTime(u.arrivedAt)} ·{' '}
                    {t('admin.monitoring.completion.drawer.completed')} {shortTime(u.completedAt)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className={labelClass}>
              {t('admin.monitoring.completion.drawer.evidence')}
              {report.evidenceMediaUrls.length > 0 && (
                <span className="ml-1 text-slate-500">({report.evidenceMediaUrls.length})</span>
              )}
            </h3>
            {report.evidenceMediaUrls.length === 0 ? (
              <p className="text-xs text-slate-400">{t('admin.monitoring.completion.drawer.noEvidence')}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {report.evidenceMediaUrls.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    title={t('admin.monitoring.completion.drawer.openMedia', { index: index + 1 })}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                  >
                    {isVideoUrl(url) ? (
                      <video src={url} muted preload="metadata" className="w-full h-full object-cover" />
                    ) : (
                      <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
                    <ExternalLink className="absolute top-1 right-1 w-3.5 h-3.5 text-white drop-shadow opacity-0 group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            )}
          </section>

          {hasHandover && (
            <section className="space-y-1.5">
              <h3 className={labelClass}>{t('admin.monitoring.completion.drawer.handover')}</h3>
              <dl>
                {report.handoverEntity && (
                  <Row label={t('admin.monitoring.completion.drawer.handoverTo')}>{report.handoverEntity}</Row>
                )}
                {(report.handoverContactName || report.handoverContactPhone) && (
                  <Row label={t('admin.monitoring.completion.drawer.handoverContact')}>
                    {[report.handoverContactName, report.handoverContactPhone].filter(Boolean).join(' · ')}
                  </Row>
                )}
                {report.handoverNotes && (
                  <Row label={t('admin.monitoring.completion.drawer.handoverNotes')}>{report.handoverNotes}</Row>
                )}
              </dl>
            </section>
          )}

          <section className="pt-3 border-t border-dashed border-slate-200 space-y-2">
            <h3 className={labelClass}>{t('admin.monitoring.completion.drawer.signature')}</h3>
            {report.signatureUrl ? (
              <a
                href={report.signatureUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-56 h-24 rounded-lg border border-slate-300 bg-white p-2 hover:border-slate-400"
              >
                <img
                  src={report.signatureUrl}
                  alt={t('admin.monitoring.completion.drawer.signature')}
                  className="w-full h-full object-contain"
                />
              </a>
            ) : (
              <p className="text-xs text-slate-400">{t('admin.monitoring.completion.drawer.noSignature')}</p>
            )}
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <PenLine className="w-3.5 h-3.5 text-slate-400" />
              {t('admin.monitoring.completion.drawer.signedBy', {
                name: report.signerName || t('admin.monitoring.completion.drawer.unknownSigner'),
              })}
              {report.signedAt && (
                <span className="font-mono-data font-normal text-slate-500">· {formatDateTime(report.signedAt)}</span>
              )}
            </p>
          </section>

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => onOpenIncident(report)}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              {t('admin.monitoring.completion.drawer.viewIncident')}
            </button>
            <button
              type="button"
              onClick={() => onOpenAudit(report)}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              {t('admin.monitoring.completion.drawer.viewAudit')}
            </button>
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-slate-200 flex items-center gap-2 text-[11px] text-slate-500">
          <Lock className="w-3.5 h-3.5" />
          {t('admin.monitoring.completion.drawer.readOnly')}
        </div>
      </aside>
    </>
  );
};
