import React, { useEffect, useState } from 'react';
import { AlertCircle, BrainCircuit, CircleCheck, CircleX, Clock, ImageOff, Loader2, MapPin, Phone, User, X } from 'lucide-react';
import { HazardTagBadge } from './HazardTagBadge';
import { PlausibilityBadge } from './PlausibilityBadge';
import { SeverityBadge } from './SeverityBadge';
import { SEVERITY_META } from '../../../data/incidentMock';
import type { Incident, IncidentSeverity } from '../../../types/incident';

type ConfirmableSeverity = Exclude<IncidentSeverity, 0>;
const CONFIRMABLE_LEVELS: ConfirmableSeverity[] = [1, 2, 3, 4, 5];

interface IncidentDetailDrawerProps {
  incident: Incident | null;
  onClose: () => void;
  onApprove: (id: string, confirmedSeverity: ConfirmableSeverity) => void;
  onReject: (id: string, reason: string) => void;
  isSubmitting?: boolean;
  errorMsg?: string | null;
}

export const IncidentDetailDrawer: React.FC<IncidentDetailDrawerProps> = ({
  incident,
  onClose,
  onApprove,
  onReject,
  isSubmitting = false,
  errorMsg = null,
}) => {
  const [confirmedSeverity, setConfirmedSeverity] = useState<ConfirmableSeverity | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Reset local form state whenever a different incident is opened.
  useEffect(() => {
    if (!incident) return;
    setConfirmedSeverity(incident.severity === 0 ? null : (incident.severity as ConfirmableSeverity));
    setRejecting(false);
    setRejectReason('');
  }, [incident?.id]);

  if (!incident) return null;

  const waitMinutes = Math.max(0, Math.round((Date.now() - new Date(incident.createdAt).getTime()) / 60000));
  const isUnclassified = incident.severity === 0;

  const handleConfirmReject = () => {
    onReject(incident.id, rejectReason.trim() || 'Điều phối viên từ chối sự cố tại Command Center.');
  };

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
              {incident.hazardTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {incident.hazardTags.map((tag) => (
                    <HazardTagBadge key={tag} tag={tag} size="md" />
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-mono-data uppercase tracking-widest text-slate-400 font-bold mb-2">
                Xác nhận mức độ nghiêm trọng {isUnclassified && <span className="text-red-600">(bắt buộc)</span>}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CONFIRMABLE_LEVELS.map((level) => {
                  const meta = SEVERITY_META[level];
                  const isActive = confirmedSeverity === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setConfirmedSeverity(level)}
                      className={`px-2.5 py-1.5 rounded-md border text-[11px] font-bold font-mono-data whitespace-nowrap transition-colors ${
                        isActive ? meta.badgeClass : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              {isUnclassified && (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  AI không phân loại được sự cố này — vui lòng chọn mức độ thủ công trước khi duyệt.
                </p>
              )}
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
              <div className="flex items-center gap-2 text-sm text-slate-700 min-w-0 col-span-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{incident.area}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{waitMinutes} phút trước</span>
              </div>
            </div>

            {rejecting && (
              <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-2.5">
                <p className="text-xs font-mono-data uppercase tracking-widest text-red-600 font-bold">
                  Lý do từ chối
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Vd: Báo khống, trùng lặp với sự cố khác..."
                  rows={2}
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="shrink-0 mx-4 mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="shrink-0 p-4 border-t border-slate-200 grid grid-cols-2 gap-3">
          {rejecting ? (
            <>
              <button
                onClick={() => setRejecting(false)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-sm transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/25 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CircleX className="w-4 h-4" />}
                Xác nhận từ chối
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setRejecting(true)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-600 font-bold text-sm transition-colors disabled:opacity-50"
              >
                <CircleX className="w-4 h-4" />
                Từ chối
              </button>
              <button
                onClick={() => confirmedSeverity && onApprove(incident.id, confirmedSeverity)}
                disabled={isSubmitting || !confirmedSeverity}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CircleCheck className="w-4 h-4" />}
                Duyệt lên bản đồ
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};
