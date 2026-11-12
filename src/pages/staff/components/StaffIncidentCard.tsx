import React, { useState } from 'react';
import type { StaffMission } from '../../../types/staff';
import type { IncidentSupplementDto } from '../../../types/incident';
import { SEVERITY_META } from '../../../data/incidentMock';
import { HazardTagBadge } from '../../../components/common/HazardTagBadge';
import { incidentService } from '../../../services/incidentService';
import { getApiErrorMessage } from '../../../services/apiClient';
import {
  MapPin,
  Phone,
  User,
  UserCheck,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MessageSquarePlus,
  Image as ImageIcon,
  Clock,
  AlertTriangle,
  X,
  ExternalLink,
} from 'lucide-react';

interface StaffIncidentCardProps {
  mission: StaffMission;
  supplements?: IncidentSupplementDto[];
  onPhoneRevealed?: (fullPhone: string) => void;
}

export const StaffIncidentCard: React.FC<StaffIncidentCardProps> = ({
  mission,
  supplements = [],
  onPhoneRevealed,
}) => {
  const severityMeta = SEVERITY_META[mission.severity];

  // Phone Reveal State (POST /api/incidents/{id}/reveal-phone - BR-32)
  const isMaskedInitial = mission.callerPhone?.includes('*') || false;
  const [isRevealed, setIsRevealed] = useState<boolean>(!isMaskedInitial);
  const [displayedPhone, setDisplayedPhone] = useState<string>(mission.callerPhone || '114');
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  // Lightbox Modal for Citizen Evidence Photos
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  const handleRevealPhone = async () => {
    if (isRevealing || isRevealed) return;
    setIsRevealing(true);
    setRevealError(null);

    try {
      const res = await incidentService.revealPhone(mission.incidentId);
      if (res.success && res.data?.phoneNumber) {
        setDisplayedPhone(res.data.phoneNumber);
        setIsRevealed(true);
        onPhoneRevealed?.(res.data.phoneNumber);
      } else {
        setRevealError(res.message || 'Không thể mở số điện thoại.');
      }
    } catch (err: any) {
      const msg = getApiErrorMessage(
        err,
        'Chỉ nhân viên trong kíp trực được phân công mới có quyền mở số điện thoại này.'
      );
      setRevealError(msg);
    } finally {
      setIsRevealing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
      {/* 1. Header: Severity & Incident ID */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${severityMeta?.badgeClass || 'bg-red-600 text-white'}`}
          >
            {severityMeta?.label || `Cấp độ ${mission.severity}`}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            #{mission.incidentId}
          </span>
        </div>

        <span className="text-xs text-red-600 font-mono font-bold">
          {mission.area}
        </span>
      </div>

      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
        {mission.title}
      </h3>

      <p className="text-xs text-slate-600 leading-relaxed">
        {mission.description}
      </p>

      {/* Hazard Tags */}
      {mission.hazardTags && mission.hazardTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {mission.hazardTags.map((tag) => (
            <HazardTagBadge key={tag} tag={tag} size="sm" />
          ))}
        </div>
      )}

      {/* 2. Address & Caller Details */}
      <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
        <div className="flex items-start gap-2 text-slate-600">
          <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span className="font-medium text-slate-900">{mission.address}</span>
        </div>

        <div className="flex flex-col gap-2 text-slate-600 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
          <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-200/60">
            <div className="flex items-center gap-1.5">
              {mission.isAiDispatched || mission.dispatcherName === 'AI tự điều phối' ? (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-purple-100 text-purple-800 border border-purple-200">
                  <Sparkles className="w-3 h-3 text-purple-600 animate-pulse" />
                  <span>AI tự điều phối</span>
                </div>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-red-600" />
                  <span>
                    Điều phối: <strong className="text-slate-900">{mission.dispatcherName || 'Điều phối viên CAD'}</strong>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Người báo: <strong className="text-slate-900">{mission.callerName}</strong>
              </span>
            </div>

            {/* Caller Phone with Reveal Button */}
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-red-600 shrink-0" />
              {isRevealed ? (
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${displayedPhone}`}
                    className="text-red-600 font-mono font-bold hover:underline"
                    title="Bấm để gọi trực tiếp người báo tin"
                  >
                    {displayedPhone}
                  </a>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold border border-emerald-300">
                    ĐÃ MỞ KHÓA
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono font-bold">
                    {displayedPhone}
                  </span>
                  <button
                    onClick={handleRevealPhone}
                    disabled={isRevealing}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    title="Bấm mở số điện thoại nạn nhân (Hệ thống ghi nhật ký kiểm toán BR-32)"
                  >
                    {isRevealing ? (
                      <span>Đang mở...</span>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Mở SĐT</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {revealError && (
            <p className="text-[10px] text-red-600 font-medium pt-1">
              {revealError}
            </p>
          )}
        </div>
      </div>

      {/* 3. Bổ Sung Từ Người Dân (Mục 21.4: Realtime Incident Supplements) */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MessageSquarePlus className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              Bổ Sung Hiện Trường Từ Người Dân
            </span>
          </div>
          {supplements.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {supplements.length} cập nhật
            </span>
          )}
        </div>

        {supplements.length === 0 ? (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <p className="text-[11px] text-slate-500">
              Chưa có thông tin bổ sung hoặc ảnh hiện trường mới từ người dân.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {supplements.map((supp) => (
              <div
                key={supp.id}
                className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-1.5 transition-all"
              >
                <div className="flex items-center justify-between text-[10px] text-amber-900 font-medium">
                  <span className="font-bold text-amber-950">
                    {supp.reporterName || 'Người dân tại hiện trường'}
                  </span>
                  <div className="flex items-center gap-1 text-slate-500 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(supp.createdAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {supp.note && (
                  <p className="text-xs text-slate-900 font-semibold leading-relaxed bg-white/80 p-2 rounded-lg border border-amber-100">
                    "{supp.note}"
                  </p>
                )}

                {/* Attached Media Photos */}
                {supp.mediaUrls && supp.mediaUrls.length > 0 && (
                  <div className="pt-1">
                    <div className="text-[10px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                      <ImageIcon className="w-3 h-3 text-slate-500" />
                      <span>Ảnh hiện trường đính kèm ({supp.mediaUrls.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {supp.mediaUrls.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActivePhotoUrl(url)}
                          className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-300 hover:opacity-90 transition-opacity cursor-pointer group"
                          title="Bấm để xem ảnh phóng to"
                        >
                          <img
                            src={url}
                            alt={`Hiện trường ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                            <Eye className="w-3.5 h-3.5 text-white opacity-80" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Photo Preview Modal */}
      {activePhotoUrl && (
        <div
          className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn"
          onClick={() => setActivePhotoUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-800 text-white">
              <span className="text-xs font-bold font-mono">
                ẢNH BỔ SUNG HIỆN TRƯỜNG TỪ NGƯỜI DÂN (MỤC 21.4)
              </span>
              <button
                onClick={() => setActivePhotoUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black min-h-[300px] max-h-[75vh]">
              <img
                src={activePhotoUrl}
                alt="Phóng to ảnh hiện trường"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-slate-900/90 text-right">
              <a
                href={activePhotoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold"
              >
                <span>Mở trong tab mới</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
