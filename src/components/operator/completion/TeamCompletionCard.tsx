import React, { useState } from 'react';
import { CheckCircle2, Clock3, ImageOff, PenLine, PlayCircle, Truck, Users } from 'lucide-react';
import { VEHICLE_STATUS_META } from '../../../data/liveMapMeta';
import { formatDateTime, formatWaitDuration } from '../../../utils/incidentFormat';
import type { DispatchAssignmentResponseDto } from '../../../types/dispatch';
import { ASSIGNMENT_VEHICLE_STATUS, isVideoUrl, reportTime, type CompletionGroup } from './completionGroups';
import { useTranslation } from '../../../i18n';

const sectionLabelClass = 'text-[10px] font-mono-data uppercase tracking-wider text-slate-400 font-bold';

/** Ảnh hiện trường hiện tối đa 8 ô, ô cuối "+N" mở xem tiếp. */
const MAX_THUMBS = 8;

interface TeamCompletionCardProps {
  group: CompletionGroup;
  now: number;
  /** Tổ vừa nghiệm thu trong lúc đang xem → viền sáng vài giây. */
  justSigned: boolean;
  onOpenMedia: (urls: string[], index: number, caption: string, variant?: 'photo' | 'signature') => void;
}

/** Mốc dùng để tính "đã ở trạng thái này bao lâu" của xe đang làm. */
const statusSince = (a: DispatchAssignmentResponseDto) =>
  (a.status === 'OnScene' ? a.arrivedAt : a.status === 'EnRoute' ? a.enRouteAt : a.status === 'Accepted' ? a.acceptedAt : null) ??
  a.dispatchedAt;

const plateOf = (a: DispatchAssignmentResponseDto) => a.rescueUnit?.plateNumber ?? '—';

export const TeamCompletionCard: React.FC<TeamCompletionCardProps> = ({ group, now, justSigned, onOpenMedia }) => {
  const { t } = useTranslation();
  const isPending = group.state === 'pending';
  // Không có tên tổ (xe chưa gán tổ / tổ đã bị xóa) → gọi theo biển số.
  const name = group.teamName ?? `${t('incidents.completion.team.unteamed')} — ${group.assignments.map(plateOf).join(', ')}`;
  const report = group.report;
  const signedAt = reportTime(report);

  return (
    <article
      className={`rounded-xl border bg-white overflow-hidden transition-shadow duration-700 ${
        isPending ? 'border-amber-200' : 'border-slate-200'
      } ${justSigned ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-100' : 'shadow-sm'}`}
    >
      {/* Đầu thẻ: tên tổ + trạng thái */}
      <header
        className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 border-b ${
          isPending ? 'bg-amber-50/70 border-amber-100' : 'bg-emerald-50/50 border-emerald-100'
        }`}
      >
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
            isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {group.teamName ? <Users className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
        </span>
        <h3 className="flex-1 min-w-0 text-sm font-bold text-slate-900 truncate" title={name}>
          {name}
        </h3>
        {justSigned && (
          <span className="text-[11px] font-semibold text-emerald-700">{t('incidents.completion.team.justSigned')}</span>
        )}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${
            isPending ? 'bg-white border-amber-300 text-amber-700' : 'bg-white border-emerald-300 text-emerald-700'
          }`}
        >
          {isPending ? <Clock3 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          {isPending ? t('incidents.completion.team.pendingBadge') : t('incidents.completion.team.submittedBadge')}
        </span>
      </header>

      <div className="p-4 space-y-4">
        {/* Xe của tổ */}
        <section className="space-y-1.5">
          <p className={sectionLabelClass}>{t('incidents.completion.team.vehicles')}</p>
          {isPending ? (
            <ul className="space-y-1">
              {group.assignments.map((a) => {
                const status = ASSIGNMENT_VEHICLE_STATUS[a.status];
                const meta = status ? VEHICLE_STATUS_META[status] : null;
                return (
                  <li key={a.id} className="flex items-center gap-2.5 text-xs">
                    <span className="font-mono-data font-semibold text-slate-800 w-28 shrink-0">{plateOf(a)}</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: meta?.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta?.color }} />
                      {status ? t(`enums.vehicleStatus.${status}`) : a.status}
                    </span>
                    <span className="text-slate-400 font-mono-data">
                      · {formatWaitDuration(now - new Date(statusSince(a)).getTime())}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {group.assignments.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 font-mono-data text-[11px] font-semibold text-slate-700"
                >
                  {plateOf(a)}
                </span>
              ))}
            </div>
          )}
        </section>

        {isPending ? (
          <p className="text-xs text-slate-500">{t('incidents.completion.team.pendingHint')}</p>
        ) : !report ? (
          <p className="text-xs text-slate-500">{t('incidents.completion.team.noReport')}</p>
        ) : (
          <>
            {/* Kết quả xử lý */}
            <section className="space-y-1.5">
              <p className={sectionLabelClass}>{t('incidents.completion.team.summary')}</p>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{report.actionsSummary}</p>
            </section>

            {/* Số liệu */}
            <section className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-8 gap-y-3">
              <div className="space-y-1">
                <p className={sectionLabelClass}>{t('incidents.completion.team.victims')}</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">{report.victimsAssistedCount}</p>
              </div>
              <div className="space-y-1.5 min-w-0">
                <p className={sectionLabelClass}>{t('incidents.completion.team.equipment')}</p>
                {report.equipmentUsed.length === 0 ? (
                  <p className="text-xs text-slate-400">{t('incidents.completion.team.noEquipment')}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {report.equipmentUsed.map((item, i) => (
                      <span
                        key={`${item}-${i}`}
                        className="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Ảnh hiện trường */}
            <section className="space-y-1.5">
              <p className={sectionLabelClass}>
                {t('incidents.completion.team.evidence')}
                {report.evidenceMediaUrls.length > 0 && (
                  <span className="ml-1 text-slate-500">({report.evidenceMediaUrls.length})</span>
                )}
              </p>
              {report.evidenceMediaUrls.length === 0 ? (
                <p className="text-xs text-slate-400">{t('incidents.completion.team.noEvidence')}</p>
              ) : (
                <EvidenceGrid
                  urls={report.evidenceMediaUrls}
                  onOpen={(index) => onOpenMedia(report.evidenceMediaUrls, index, name)}
                />
              )}
            </section>

            {/* Bàn giao */}
            {(report.handoverEntity || report.handoverContactName || report.handoverContactPhone || report.handoverNotes) && (
              <section className="space-y-1.5">
                <p className={sectionLabelClass}>{t('incidents.completion.team.handover')}</p>
                <dl className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs">
                  {report.handoverEntity && (
                    <HandoverRow label={t('incidents.completion.team.handoverTo')} value={report.handoverEntity} />
                  )}
                  {(report.handoverContactName || report.handoverContactPhone) && (
                    <HandoverRow
                      label={t('incidents.completion.team.handoverContact')}
                      value={[report.handoverContactName, report.handoverContactPhone].filter(Boolean).join(' · ')}
                      mono={!report.handoverContactName}
                    />
                  )}
                  {report.handoverNotes && (
                    <HandoverRow label={t('incidents.completion.team.handoverNotes')} value={report.handoverNotes} />
                  )}
                </dl>
              </section>
            )}

            {/* Chữ ký — đọc như phần cuối biên bản */}
            <section className="pt-3 border-t border-dashed border-slate-200">
              <p className={`${sectionLabelClass} mb-2`}>{t('incidents.completion.team.signature')}</p>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                {report.signatureUrl ? (
                  <button
                    type="button"
                    onClick={() => onOpenMedia([report.signatureUrl!], 0, name, 'signature')}
                    title={t('incidents.completion.team.zoomSignature')}
                    aria-label={t('incidents.completion.team.zoomSignature')}
                    className="group w-full sm:w-56 h-24 shrink-0 rounded-lg border border-slate-300 bg-white p-2 hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    <img
                      src={report.signatureUrl}
                      alt={t('incidents.completion.team.signature')}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ) : (
                  <div className="w-full sm:w-56 h-24 shrink-0 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center px-3 text-center text-[11px] text-slate-500">
                    {t('incidents.completion.team.noSignature')}
                  </div>
                )}
                <div className="text-xs text-slate-600 space-y-0.5">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <PenLine className="w-3.5 h-3.5 text-slate-400" />
                    {t('incidents.completion.team.signedBy', {
                      name: report.signerName || t('incidents.completion.team.unknownSigner'),
                    })}
                  </p>
                  {signedAt && <p className="font-mono-data text-slate-500 pl-5">{formatDateTime(signedAt)}</p>}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </article>
  );
};

const HandoverRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="grid grid-cols-[8.5rem_1fr] gap-3 px-3 py-2">
    <dt className="text-slate-500">{label}</dt>
    <dd className={`text-slate-800 break-words ${mono ? 'font-mono-data' : ''}`}>{value}</dd>
  </div>
);

const EvidenceGrid: React.FC<{ urls: string[]; onOpen: (index: number) => void }> = ({ urls, onOpen }) => {
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const shown = urls.slice(0, MAX_THUMBS);
  const extra = urls.length - shown.length;

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 2xl:grid-cols-6 gap-1.5">
      {shown.map((url, i) => {
        const isLast = i === shown.length - 1 && extra > 0;
        return (
          <button
            key={`${url}-${i}`}
            type="button"
            onClick={() => onOpen(i)}
            className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            {failed.has(i) ? (
              <span className="absolute inset-0 flex items-center justify-center text-slate-300">
                <ImageOff className="w-5 h-5" />
              </span>
            ) : isVideoUrl(url) ? (
              <>
                <video src={url} muted preload="metadata" className="w-full h-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                  <PlayCircle className="w-6 h-6" />
                </span>
              </>
            ) : (
              <img
                src={url}
                alt=""
                loading="lazy"
                onError={() => setFailed((prev) => new Set(prev).add(i))}
                className="w-full h-full object-cover"
              />
            )}
            {isLast && (
              <span className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-white text-sm font-bold">
                +{extra}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
