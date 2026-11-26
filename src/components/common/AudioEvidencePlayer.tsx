import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Mic, Play, RefreshCw, Volume2, AlertCircle } from 'lucide-react';
import type { IncidentMediaDto } from '../../types/incident';
import type { AudioPlaybackUrlDto } from '../../services/mediaService';
import { getApiErrorMessage } from '../../services/apiClient';

function formatAudioDuration(seconds?: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return '';
  const total = Math.max(1, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface AudioEvidencePlayerProps {
  audio: IncidentMediaDto;
  resolvePlaybackUrl: () => Promise<AudioPlaybackUrlDto>;
  compact?: boolean;
}

/**
 * §55: Trình phát ghi âm sự cố dùng URL ký 5 phút từ BE (tự làm mới khi hết hạn) + hiển thị bản chép lời.
 */
export const AudioEvidencePlayer: React.FC<AudioEvidencePlayerProps> = ({
  audio,
  resolvePlaybackUrl,
  compact = false,
}) => {
  const [signed, setSigned] = useState<AudioPlaybackUrlDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSigned(null);
    setError('');
  }, [audio.id]);

  const loadPlaybackUrl = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await resolvePlaybackUrl();
      setSigned(next);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải liên kết phát ghi âm.'));
    } finally {
      setLoading(false);
    }
  }, [resolvePlaybackUrl]);

  const isExpired = signed?.expiresAt ? new Date(signed.expiresAt).getTime() <= Date.now() + 5000 : false;
  const durationLabel = formatAudioDuration(audio.durationSeconds);

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/90 ${
        compact ? 'p-2.5 space-y-1.5' : 'p-3 space-y-2'
      }`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
            <Mic className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-bold text-slate-800 truncate">
            Ghi âm hiện trường {durationLabel ? `(${durationLabel})` : ''}
          </span>
          {audio.transcriptionStatus === 'Missing' && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
              Chưa có bản chép lời
            </span>
          )}
        </div>

        {!signed || isExpired ? (
          <button
            type="button"
            onClick={loadPlaybackUrl}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isExpired ? 'Lấy lại link nghe' : 'Nghe ghi âm'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={loadPlaybackUrl}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-semibold cursor-pointer"
            title="Làm mới liên kết phát (hết hạn sau 5 phút)"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới link</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {signed && !isExpired && (
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <audio
            src={signed.url}
            controls
            preload="metadata"
            onError={() => {
              setSigned(null);
              setError('Liên kết nghe đã hết hạn hoặc không tải được. Bấm Nghe lại.');
            }}
            className="w-full h-8"
          />
        </div>
      )}

      {audio.transcript?.trim() && (
        <div className="rounded-lg bg-white border border-slate-200/80 px-2.5 py-2 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-0.5">
            Lời nói ghi nhận
          </span>
          {audio.transcript}
        </div>
      )}
    </div>
  );
};
