import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CirclePlay, ImageOff } from 'lucide-react';
import type { IncidentMedia } from '../../../types/incident';

interface IncidentMediaGalleryProps {
  media: IncidentMedia[];
  title: string;
}

/**
 * Toàn bộ ảnh/video người báo gửi kèm: khung xem chính + dải ảnh thu nhỏ khi có nhiều hơn 1 tệp.
 * Nơi dùng đặt `key` theo id sự cố để mở sự cố khác thì quay về tệp đầu tiên.
 */
export const IncidentMediaGallery: React.FC<IncidentMediaGalleryProps> = ({ media, title }) => {
  const [index, setIndex] = useState(0);

  const current = media[Math.min(index, media.length - 1)];
  const hasMany = media.length > 1;
  const step = (delta: number) => setIndex((i) => (i + delta + media.length) % media.length);

  return (
    <div className="space-y-2">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100">
        {!current ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-400">
            <ImageOff className="w-8 h-8 text-slate-300" />
            <span className="text-xs">Người báo không gửi kèm hình ảnh</span>
          </div>
        ) : current.type === 'video' ? (
          <video key={current.url} src={current.url} controls className="w-full h-full object-cover bg-black" />
        ) : (
          <img src={current.url} alt={`${title} (${index + 1}/${media.length})`} className="w-full h-full object-cover" />
        )}

        {hasMany && (
          <>
            <button
              onClick={() => step(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
              aria-label="Tệp trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => step(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
              aria-label="Tệp sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-mono-data">
              {index + 1}/{media.length}
            </span>
          </>
        )}
      </div>

      {hasMany && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((item, i) => (
            <button
              key={item.url}
              onClick={() => setIndex(i)}
              className={`relative w-16 h-12 shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                i === index ? 'border-red-500' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              aria-label={`Xem tệp ${i + 1}`}
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
    </div>
  );
};
