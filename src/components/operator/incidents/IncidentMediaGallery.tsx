import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, CirclePlay, ImageOff, Maximize2, X } from 'lucide-react';
import type { IncidentMedia } from '../../../types/incident';
import { useTranslation } from '../../../i18n';

interface IncidentMediaGalleryProps {
  media: IncidentMedia[];
  title: string;
  /** Panel thẩm định: rộng hết cột nhưng cao tối đa ~1/3 màn hình (màn thấp vẫn thấy phần dưới); bấm ảnh để xem lớn. */
  compact?: boolean;
}

/**
 * Toàn bộ ảnh/video người báo gửi kèm: khung xem chính + dải ảnh thu nhỏ khi có nhiều hơn 1 tệp.
 * Nơi dùng đặt `key` theo id sự cố để mở sự cố khác thì quay về tệp đầu tiên.
 */
export const IncidentMediaGallery: React.FC<IncidentMediaGalleryProps> = ({ media, title, compact = false }) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  // Xem ảnh cỡ lớn (khung nhỏ khó nhìn chi tiết).
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed]);

  const current = media[Math.min(index, media.length - 1)];
  const hasMany = media.length > 1;
  const step = (delta: number) => setIndex((i) => (i + delta + media.length) % media.length);

  return (
    <div className="space-y-2">
      <div className={`relative rounded-xl overflow-hidden bg-slate-100 ${compact ? 'aspect-video max-h-[34vh]' : 'aspect-video'}`}>
        {!current ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-400">
            <ImageOff className="w-8 h-8 text-slate-300" />
            <span className="text-xs">{t('incidents.media.none')}</span>
          </div>
        ) : current.type === 'video' ? (
          <video key={current.url} src={current.url} controls className="w-full h-full object-cover bg-black" />
        ) : (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label={t('incidents.media.zoom')}
            title={t('incidents.media.zoom')}
            className="group block w-full h-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-400"
          >
            <img src={current.url} alt={`${title} (${index + 1}/${media.length})`} className="w-full h-full object-cover" />
            <span className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-black/50 text-white opacity-80 group-hover:opacity-100">
              <Maximize2 className="w-3.5 h-3.5" />
            </span>
          </button>
        )}

        {hasMany && (
          <>
            <button
              onClick={() => step(-1)}
              className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 ${compact ? 'left-1 p-1' : 'left-2 p-1.5'}`}
              aria-label={t('incidents.media.previous')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => step(1)}
              className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 ${compact ? 'right-1 p-1' : 'right-2 p-1.5'}`}
              aria-label={t('incidents.media.next')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-mono-data">
              {index + 1}/{media.length}
            </span>
          </>
        )}
      </div>

      {hasMany && (
        <div className={`flex overflow-x-auto pb-1 ${compact ? 'gap-1.5' : 'gap-2'}`}>
          {media.map((item, i) => (
            <button
              key={item.url}
              onClick={() => setIndex(i)}
              className={`relative shrink-0 rounded-md overflow-hidden border-2 transition-colors ${compact ? 'w-10 h-8' : 'w-16 h-12'} ${
                i === index ? 'border-red-500' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              aria-label={t('incidents.media.view', { index: i + 1 })}
            >
              {item.type === 'video' ? (
                <>
                  <video src={item.url} preload="metadata" muted className="w-full h-full object-cover bg-black" />
                  <CirclePlay className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow" />
                </>
              ) : (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      {zoomed &&
        current &&
        current.type !== 'video' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={() => setZoomed(false)}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-6 cursor-zoom-out"
          >
            <img src={current.url} alt={title} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            <button
              type="button"
              onClick={() => setZoomed(false)}
              aria-label={t('incidents.media.close')}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <X className="w-5 h-5" />
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};
