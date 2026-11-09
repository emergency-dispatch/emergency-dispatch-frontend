import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff, X } from 'lucide-react';
import { isVideoUrl } from './completionGroups';
import { useTranslation } from '../../../i18n';

interface EvidenceLightboxProps {
  urls: string[];
  startIndex: number;
  /** Nhãn phụ (VD tên tổ) — hiện cạnh bộ đếm ảnh. */
  caption?: string;
  /** Chữ ký: nền trắng, không tràn viền (ảnh PNG nét mảnh trên nền trong suốt). */
  variant?: 'photo' | 'signature';
  onClose: () => void;
}

/**
 * Xem ảnh hiện trường / chữ ký toàn màn hình. ← → chuyển ảnh, Esc đóng (chặn Esc lan ra trang để không đóng
 * luôn khung chi tiết phía sau).
 */
export const EvidenceLightbox: React.FC<EvidenceLightboxProps> = ({
  urls,
  startIndex,
  caption,
  variant = 'photo',
  onClose,
}) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(startIndex);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const url = urls[index];
  const hasMany = urls.length > 1;

  useEffect(() => {
    const step = (delta: number) => setIndex((i) => (i + delta + urls.length) % urls.length);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && urls.length > 1) step(-1);
      else if (e.key === 'ArrowRight' && urls.length > 1) step(1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    // Pha capture ở document: chạy trước listener Esc của trang (đăng ký ở window).
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [urls.length, onClose]);

  if (!url) return null;
  const isSignature = variant === 'signature';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('incidents.completion.lightbox.title')}
      className="fixed inset-0 z-[10050] flex flex-col bg-slate-950/90"
      onClick={onClose}
    >
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 truncate text-sm">
          {hasMany && <span className="font-mono-data text-slate-300 mr-2">{index + 1}/{urls.length}</span>}
          {caption}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t('incidents.completion.lightbox.openOriginal')}
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('incidents.completion.lightbox.close')}
            className="p-2 rounded-lg text-slate-200 hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-4 pb-6 sm:px-16">
        <div className="max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {failed.has(url) ? (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <ImageOff className="w-10 h-10" />
              <span className="text-sm">{t('incidents.completion.lightbox.imageFailed')}</span>
            </div>
          ) : isVideoUrl(url) ? (
            <video key={url} src={url} controls autoPlay className="max-w-full max-h-[80vh] rounded-lg bg-black" />
          ) : (
            <img
              key={url}
              src={url}
              alt={caption ?? ''}
              onError={() => setFailed((prev) => new Set(prev).add(url))}
              className={`max-w-full max-h-[80vh] object-contain rounded-lg ${
                isSignature ? 'bg-white p-6 min-w-[min(32rem,90vw)]' : ''
              }`}
            />
          )}
        </div>

        {hasMany && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((i) => (i - 1 + urls.length) % urls.length);
              }}
              aria-label={t('incidents.completion.lightbox.prev')}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((i) => (i + 1) % urls.length);
              }}
              aria-label={t('incidents.completion.lightbox.next')}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
