import React from 'react';
import { AlertCircle, Clock, Loader2, MessageSquarePlus, RefreshCw, User, Users, Video } from 'lucide-react';
import { formatDateTime } from '../../../utils/incidentFormat';
import type { IncidentSupplementDto } from '../../../types/incident';
import { useTranslation } from '../../../i18n';

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi)(\?|$)/i;

interface IncidentSupplementListProps {
  items: IncidentSupplementDto[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
}

/** §21.4: danh sách ghi chú / ảnh người báo gửi thêm sau SOS (mới nhất trước). */
export const IncidentSupplementList: React.FC<IncidentSupplementListProps> = ({ items, loading, error, onReload }) => {
  const { t } = useTranslation();

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
        <span className="flex-1">{error}</span>
        <button onClick={onReload} className="inline-flex items-center gap-1 font-bold hover:text-red-800 shrink-0">
          <RefreshCw className="w-3 h-3" />
          {t('incidents.supplements.retry')}
        </button>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {t('incidents.supplements.loading')}
      </p>
    );
  }

  if (items.length === 0) {
    return <p className="text-xs text-slate-400">{t('incidents.supplements.empty')}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((s) => {
        const fromLinked = s.incidentId !== s.targetIncidentId;
        return (
          <li key={s.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                <User className="w-3 h-3" />
                {s.reporterName || t('incidents.supplements.anonymous')}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDateTime(s.createdAt)}
              </span>
              {fromLinked && (
                <span className="inline-flex items-center gap-1 px-1.5 py-px rounded border border-blue-200 bg-blue-50 font-semibold text-blue-700">
                  <Users className="w-3 h-3" />
                  {t('incidents.supplements.fromLinked')}
                </span>
              )}
            </div>

            {s.note.trim() ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words">{s.note}</p>
            ) : (
              <p className="flex items-center gap-1 text-xs italic text-slate-500">
                <MessageSquarePlus className="w-3 h-3" />
                {t('incidents.supplements.mediaOnly')}
              </p>
            )}

            {s.mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {s.mediaUrls.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    title={t('incidents.supplements.openMedia')}
                    className="w-16 h-12 rounded-md overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0"
                  >
                    {VIDEO_EXT.test(url) ? (
                      <Video className="w-4 h-4 text-slate-400" />
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </a>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};
