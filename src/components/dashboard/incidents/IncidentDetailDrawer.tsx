import React from 'react';
import { BrainCircuit, CircleCheck, CircleX, Clock, ImageOff, MapPin, Phone, User, X } from 'lucide-react';
import { HazardTagBadge } from './HazardTagBadge';
import { PlausibilityBadge } from './PlausibilityBadge';
import { SeverityBadge } from './SeverityBadge';
import type { Incident } from '../../../types/incident';

interface IncidentDetailDrawerProps {
  incident: Incident | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const IncidentDetailDrawer: React.FC<IncidentDetailDrawerProps> = ({
  incident,
  onClose,
  onApprove,
  onReject,
}) => {
  if (!incident) return null;

  const waitMinutes = Math.max(0, Math.round((Date.now() - new Date(incident.createdAt).getTime()) / 60000));

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={onClose} />

      <aside className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <p className="text-[11px] font-mono-data text-slate-500 uppercase tracking-widest">Chi tiết sự cố</p>
            <h2 className="text-base font-bold text-slate-900 mt-0.5 truncate">{incident.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="relative aspect-video bg-slate-100 shrink-0">
            {incident.mediaUrl ? (
              <img src={incident.mediaUrl} alt={incident.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageOff className="w-8 h-8 text-slate-300" />
              </div>
            )}
            {incident.mediaType === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="text-[11px] font-mono-data text-white/90 bg-black/50 px-2.5 py-1 rounded-md uppercase tracking-wide">
                  Video hiện trường
                </span>
              </div>
            )}
          </div>

          <div className="p-5 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono-data uppercase tracking-widest text-slate-500 font-bold">
                <BrainCircuit className="w-3.5 h-3.5 text-red-600 shrink-0" />
                AI Verification (Qwen2.5-VL)
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <SeverityBadge severity={incident.severity} />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Plausibility Score</span>
                  <PlausibilityBadge score={incident.plausibilityScore} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {incident.hazardTags.map((tag) => (
                  <HazardTagBadge key={tag} tag={tag} size="md" />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-mono-data uppercase tracking-widest text-slate-400 font-bold mb-1.5">Mô tả</p>
              <p className="text-sm text-slate-600 leading-relaxed">{incident.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{incident.reporterName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{incident.reporterPhone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{incident.area}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{waitMinutes} phút trước</span>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 p-4 border-t border-slate-200 grid grid-cols-2 gap-3">
          <button
            onClick={() => onReject(incident.id)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-600 font-bold text-sm transition-colors"
          >
            <CircleX className="w-4 h-4" />
            Từ chối
          </button>
          <button
            onClick={() => onApprove(incident.id)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-colors"
          >
            <CircleCheck className="w-4 h-4" />
            Duyệt lên bản đồ
          </button>
        </div>
      </aside>
    </>
  );
};
