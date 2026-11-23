import React from 'react';
import { ArrowUp, Check, Vote } from 'lucide-react';
import {
  aiVoteModelName,
  aiVotePercent,
  aiVoteStatus,
  aiVoteTally,
  aiVoteUpgrade,
  type AiModelVoteDto,
  type AiVoteStatus,
} from '../../../types/aiVote';
import { dateLocale, useTranslation } from '../../../i18n';

const STATUS_CLASS: Record<AiVoteStatus, string> = {
  reference: 'text-indigo-700',
  agree: 'text-emerald-700',
  belowThreshold: 'text-amber-700',
  differentType: 'text-amber-700',
  unavailable: 'text-slate-400',
};

/**
 * §42 — phiếu của 3 AI: mỗi dòng một model (kết quả, độ tin cậy, có được tính không) và lý do nâng cấp sự cố nếu có.
 * Chưa bỏ phiếu (chế độ Single, AI loại ca trước đó, ca cũ) → không hiện gì.
 */
export const AiVotesPanel: React.FC<{ votes: AiModelVoteDto[] | null; className?: string }> = ({
  votes,
  className = '',
}) => {
  const { t } = useTranslation();
  if (!votes) return null;
  const { agree, total } = aiVoteTally(votes);
  const upgrade = aiVoteUpgrade(votes);

  const resultOf = (vote: AiModelVoteDto) => {
    if (!vote.isAvailable || !vote.incidentType) return '—';
    if (vote.incidentType === 'none') return t('incidents.aiVotes.none');
    const type = t(`enums.category.${vote.incidentType}`);
    const level = vote.severity;
    return level === 1 || level === 2 || level === 3 ? `${type} · ${t(`enums.severityShort.level${level}`)}` : type;
  };

  return (
    <section aria-label={t('incidents.aiVotes.title')} className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 text-xs">
        <Vote className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        <h4 className="font-semibold text-slate-700">{t('incidents.aiVotes.title')}</h4>
        <span className={`ml-auto font-bold ${agree > 1 ? 'text-emerald-700' : 'text-amber-700'}`}>
          {t('incidents.aiVotes.tally', { agree, total })}
        </span>
      </div>
      <ul className="divide-y divide-slate-100 text-xs">
        {votes.map((vote, index) => {
          const status = aiVoteStatus(vote, index, votes);
          return (
            <li key={vote.model} className="grid grid-cols-[1fr_auto] gap-x-3 px-3 py-2">
              <span className="font-semibold text-slate-800 min-w-0 break-words">{aiVoteModelName(vote.model)}</span>
              <span
                // Lỗi kỹ thuật của model (tiếng Anh, từ backend) chỉ để tra cứu.
                title={status === 'unavailable' ? vote.error ?? undefined : undefined}
                className={`inline-flex items-center gap-1 justify-end font-semibold ${STATUS_CLASS[status]}`}
              >
                {status === 'agree' && <Check className="w-3.5 h-3.5 shrink-0" />}
                {t(`incidents.aiVotes.status.${status}`)}
              </span>
              <span className="text-slate-600">{resultOf(vote)}</span>
              <span className="text-right font-mono-data text-slate-600">
                {vote.isAvailable && vote.confidence !== null
                  ? `${aiVotePercent(vote.confidence).toLocaleString(dateLocale())}%`
                  : ''}
              </span>
            </li>
          );
        })}
      </ul>
      {upgrade && (
        <p className="flex items-start gap-1.5 px-3 py-2 border-t border-slate-100 text-[11px] text-amber-800 bg-amber-50 rounded-b-lg">
          <ArrowUp className="w-3.5 h-3.5 shrink-0" />
          {t('incidents.aiVotes.upgrade', {
            from: t(`enums.severityShort.level${upgrade.from}`),
            to: t(`enums.severityShort.level${upgrade.to}`),
          })}
        </p>
      )}
    </section>
  );
};
