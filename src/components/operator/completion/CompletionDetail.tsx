import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, History, Loader2, Map as MapIcon, MapPin, RefreshCw } from 'lucide-react';
import { SeverityBadge } from '../incidents/SeverityBadge';
import { IncidentAuditTimeline } from '../incidents/IncidentAuditTimeline';
import { TeamCompletionCard } from './TeamCompletionCard';
import { EvidenceLightbox } from './EvidenceLightbox';
import { completionMilestones, progressOf, type CompletionGroup } from './completionGroups';
import { INCIDENT_CATEGORY_META } from '../../../data/incidentMock';
import { formatDateTime, formatWaitDuration } from '../../../utils/incidentFormat';
import type { DispatchAssignmentResponseDto } from '../../../types/dispatch';
import type { Incident } from '../../../types/incident';
import { dateLocale, useTranslation } from '../../../i18n';

// Viền sáng của thẻ tổ vừa nghiệm thu trong lúc đang xem.
const JUST_SIGNED_MS = 4000;

interface CompletionDetailProps {
  incident: Incident;
  isCompleted: boolean;
  assignments: DispatchAssignmentResponseDto[];
  groups: CompletionGroup[];
  /** Đang tải báo cáo đầy đủ lần đầu (chưa có dữ liệu nào để hiện). */
  loading: boolean;
  error: string | null;
  onReload: () => void;
  /** Màn hẹp: quay về danh sách. */
  onBack: () => void;
  now: number;
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });

export const CompletionDetail: React.FC<CompletionDetailProps> = ({
  incident,
  isCompleted,
  assignments,
  groups,
  loading,
  error,
  onReload,
  onBack,
  now,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);
  const [lightbox, setLightbox] = useState<{
    urls: string[];
    index: number;
    caption: string;
    variant: 'photo' | 'signature';
  } | null>(null);

  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const milestones = useMemo(() => completionMilestones(assignments), [assignments]);
  const progress = progressOf(groups);

  // Tổ chuyển sang "Đã nghiệm thu" trong lúc đang xem (realtime) → làm nổi thẻ đó vài giây.
  const [justSigned, setJustSigned] = useState<Set<string>>(new Set());
  const seenRef = useRef<{ incidentId: string; keys: Set<string> } | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    // Chưa có dữ liệu → chưa bắt đầu theo dõi (dữ liệu tải về lần đầu không phải "vừa ký").
    if (loading) return;
    const submitted = new Set(groups.filter((g) => g.state === 'submitted').map((g) => g.key));
    const seen = seenRef.current;
    seenRef.current = { incidentId: incident.id, keys: submitted };
    if (!seen || seen.incidentId !== incident.id) return;
    const fresh = [...submitted].filter((k) => !seen.keys.has(k));
    if (fresh.length === 0) return;
    setJustSigned((prev) => new Set([...prev, ...fresh]));
    // Không hủy hẹn giờ khi `groups` đổi tiếp (cập nhật realtime khác) — chỉ hủy lúc rời màn.
    timersRef.current.push(
      setTimeout(() => setJustSigned((prev) => new Set([...prev].filter((k) => !fresh.includes(k)))), JUST_SIGNED_MS)
    );
  }, [groups, incident.id, loading]);
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const steps = [
    { key: 'received', at: incident.createdAt },
    { key: 'dispatched', at: milestones.dispatchedAt },
    { key: 'arrived', at: milestones.arrivedAt },
    { key: 'completed', at: milestones.completedAt },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-slate-50/60 min-w-0">
      {/* Đầu khung: sự cố là gì, ở đâu, đang ở trạng thái nào */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-5 sm:px-6 pt-4 pb-4 space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="xl:hidden inline-flex items-center gap-1.5 -ml-1 px-1.5 py-1 rounded-md text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('incidents.completion.back')}
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: category.color }}>
                <CategoryIcon className="w-3.5 h-3.5" />
                {t(`enums.category.${incident.category}`)}
              </span>
              <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {isCompleted ? t('incidents.completion.detail.statusCompleted') : t('incidents.completion.detail.statusActive')}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug break-words">{incident.title}</h2>
            <p className="flex items-start gap-1.5 text-xs text-slate-500">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-px text-slate-400" />
              <span>{incident.area}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isCompleted && (
              <button
                type="button"
                onClick={() =>
                  navigate('/dashboard/command-center/live-map', { state: { focusIncidentId: incident.id } })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <MapIcon className="w-3.5 h-3.5" />
                {t('incidents.completion.detail.viewOnMap')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              aria-expanded={showHistory}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold ${
                showHistory
                  ? 'border-slate-300 bg-slate-100 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              {showHistory ? t('incidents.completion.detail.hideHistory') : t('incidents.completion.detail.showHistory')}
            </button>
          </div>
        </div>

        {/* Dòng thời gian: mốc + thời gian kể từ lúc tiếp nhận */}
        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 pt-1">
          {steps.map((step, i) => {
            const done = !!step.at;
            const elapsed = step.at && i > 0 ? new Date(step.at).getTime() - new Date(incident.createdAt).getTime() : null;
            return (
              <li key={step.key} className="relative pl-4">
                <span
                  aria-hidden
                  className={`absolute left-0 top-1 w-2 h-2 rounded-full ${
                    done ? (step.key === 'completed' ? 'bg-emerald-500' : 'bg-slate-700') : 'border border-dashed border-slate-400'
                  }`}
                />
                <p className="text-[10px] font-mono-data uppercase tracking-wider text-slate-400 font-bold">
                  {t(`incidents.completion.detail.timeline.${step.key}`)}
                </p>
                {step.at ? (
                  <p className="text-xs text-slate-800" title={formatDateTime(step.at)}>
                    <span className="font-mono-data font-semibold">{timeOf(step.at)}</span>
                    {elapsed !== null && elapsed >= 0 && (
                      <span className="ml-1.5 text-slate-400">
                        {t('incidents.completion.detail.timeline.after', { duration: formatWaitDuration(elapsed) })}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">{t('incidents.completion.detail.timeline.notYet')}</p>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={onReload}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold hover:bg-amber-100"
              >
                <RefreshCw className="w-3 h-3" />
                {t('incidents.completion.detail.reload')}
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-300">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm text-slate-500">{t('incidents.completion.loading')}</p>
            </div>
          ) : groups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              {t('incidents.completion.detail.noAssignments')}
            </p>
          ) : (
            <>
              {/* Tiến độ: mỗi đoạn là một tổ */}
              <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-mono-data uppercase tracking-wider text-slate-500 font-bold text-[10px]">
                    {t('incidents.completion.detail.progressTitle')}
                  </span>
                  <span className={`font-semibold ${progress.done === progress.total ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {progress.done === progress.total
                      ? t('incidents.completion.detail.allDone')
                      : t('incidents.completion.detail.progressValue', { ...progress })}
                  </span>
                </div>
                <div className="flex gap-1" role="img" aria-label={t('incidents.completion.progress', { ...progress })}>
                  {groups.map((g) => (
                    <span
                      key={g.key}
                      className={`h-1.5 flex-1 rounded-full ${g.state === 'submitted' ? 'bg-emerald-500' : 'bg-amber-300'}`}
                    />
                  ))}
                </div>
              </section>

              {groups.map((g) => (
                <TeamCompletionCard
                  key={g.key}
                  group={g}
                  now={now}
                  justSigned={justSigned.has(g.key)}
                  onOpenMedia={(urls, index, caption, variant = 'photo') => setLightbox({ urls, index, caption, variant })}
                />
              ))}
            </>
          )}

          {showHistory && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <IncidentAuditTimeline incidentId={incident.id} />
            </section>
          )}
        </div>
      </div>

      {lightbox && (
        <EvidenceLightbox
          urls={lightbox.urls}
          startIndex={lightbox.index}
          caption={lightbox.caption}
          variant={lightbox.variant}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
};
