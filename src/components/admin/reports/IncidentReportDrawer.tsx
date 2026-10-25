import React, { useEffect } from 'react';
import { CheckCircle2, CircleDot, Lock, X } from 'lucide-react';
import { labelClass } from '../common/styles';
import { cancellationLabel, formatDateTime, formatMinutes, severityMeta } from './reportMeta';
import type { IncidentHistoryItemDto } from '../../../types/report';

interface IncidentReportDrawerProps {
  item: IncidentHistoryItemDto;
  onClose: () => void;
  /** Mở nhật ký thao tác của sự cố (tab Sự cố của Audit Trail). */
  onOpenAudit: (incidentId: string) => void;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[130px_1fr] gap-3 py-2 border-b border-slate-100 last:border-0">
    <dt className="text-xs text-slate-500">{label}</dt>
    <dd className="text-sm text-slate-900 min-w-0 break-words">{children}</dd>
  </div>
);

/** Chi tiết một sự cố đã đóng: các mốc thời gian, người xử lý, trạm / xe tham gia — chỉ đọc. */
export const IncidentReportDrawer: React.FC<IncidentReportDrawerProps> = ({ item, onClose, onOpenAudit }) => {
  const severity = severityMeta(item.severity);
  const completed = item.status === 'Completed';
  const milestones: { label: string; at: string | null; by?: string | null }[] = [
    { label: 'Tiếp nhận tin báo', at: item.reportedAt },
    { label: 'Xác minh', at: item.verifiedAt, by: item.verifiedByName },
    { label: 'Điều xe đầu tiên', at: item.firstDispatchedAt },
    { label: 'Xe đầu tiên tới hiện trường', at: item.firstArrivedAt },
    { label: completed ? 'Hoàn thành' : 'Hủy sự cố', at: item.closedAt, by: item.closedByName },
  ];

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
        aria-label="Chi tiết sự cố"
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900">{item.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{item.locationAddress}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${severity.badgeClass}`}>{severity.label}</span>
            {completed ? (
              <span className="px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                Hoàn thành
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md border border-slate-300 bg-slate-100 text-slate-600 text-[11px] font-bold">
                Đã hủy{item.cancellationReason ? ` · ${cancellationLabel(item.cancellationReason)}` : ''}
              </span>
            )}
          </div>

          <dl>
            <Row label="Thời gian phản ứng">{formatMinutes(item.responseMinutes)}</Row>
            <Row label="Thời gian xử lý">{formatMinutes(item.resolutionMinutes)}</Row>
            <Row label="Trạm tham gia">{item.stations.length > 0 ? item.stations.join(', ') : '—'}</Row>
            <Row label="Xe tham gia">
              {item.units.length > 0 ? <span className="font-mono-data">{item.units.join(', ')}</span> : '—'}
            </Row>
            {item.aiSeverityScore !== null && <Row label="Độ tin cậy AI">{item.aiSeverityScore}%</Row>}
            {item.resolutionSummary && <Row label="Kết quả xử lý">{item.resolutionSummary}</Row>}
          </dl>

          <section className="space-y-2">
            <h3 className={labelClass}>Các mốc thời gian</h3>
            <ol className="space-y-2.5">
              {milestones.map((m) => (
                <li key={m.label} className="flex items-start gap-2.5">
                  {m.at ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <CircleDot className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-sm ${m.at ? 'text-slate-900' : 'text-slate-400'}`}>{m.label}</p>
                    <p className="text-[11px] text-slate-500 font-mono-data">
                      {m.at ? formatDateTime(m.at) : 'Không có'}
                      {m.at && m.by ? <span className="font-sans"> · {m.by}</span> : null}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <button
            type="button"
            onClick={() => onOpenAudit(item.id)}
            className="text-xs font-semibold text-red-600 hover:underline"
          >
            Xem nhật ký thao tác của sự cố này
          </button>
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-slate-200 flex items-center gap-2 text-[11px] text-slate-500">
          <Lock className="w-3.5 h-3.5" />
          Sự cố đã đóng — chỉ xem.
        </div>
      </aside>
    </>
  );
};
