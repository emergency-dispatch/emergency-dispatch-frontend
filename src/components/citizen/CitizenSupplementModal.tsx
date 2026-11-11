import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileImage,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  History,
  MessageSquarePlus,
  Info,
} from 'lucide-react';
import { incidentService } from '../../services/incidentService';
import { mediaService } from '../../services/mediaService';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/apiClient';
import type { IncidentSupplementDto } from '../../types/incident';

interface CitizenSupplementModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  incidentTitle?: string;
  isLinked?: boolean;
  onSuccess?: () => void;
}

export const CitizenSupplementModal: React.FC<CitizenSupplementModalProps> = ({
  isOpen,
  onClose,
  incidentId,
  incidentTitle,
  isLinked,
  onSuccess,
}) => {
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [note, setNote] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // History for authenticated citizen
  const [supplements, setSupplements] = useState<IncidentSupplementDto[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!isOpen || !incidentId) return;
    setNote('');
    setSelectedFiles([]);
    setFilePreviews([]);
    setErrorMsg('');
    setSuccessMsg('');
    setShowHistory(false);

    if (isAuthenticated) {
      loadHistory();
    }
  }, [isOpen, incidentId, isAuthenticated]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await incidentService.getSupplements(incidentId);
      setSupplements(data || []);
    } catch {
      // Guest or no permission
      setSupplements([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = 5 - selectedFiles.length;
    if (remainingSlots <= 0) {
      setErrorMsg('Tối đa 5 ảnh / video cho mỗi lần bổ sung.');
      return;
    }

    const validFiles = files.slice(0, remainingSlots);
    const newFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(newFiles);

    // Create object URLs for preview
    const newPreviews = validFiles.map((f) => URL.createObjectURL(f));
    setFilePreviews((prev) => [...prev, ...newPreviews]);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    if (filePreviews[index]) {
      URL.revokeObjectURL(filePreviews[index]);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNote = note.trim();
    if (!cleanNote && selectedFiles.length === 0) {
      setErrorMsg('Vui lòng nhập nội dung ghi chú hoặc đính kèm ảnh / video.');
      return;
    }
    if (cleanNote.length > 1000) {
      setErrorMsg('Nội dung bổ sung không được vượt quá 1000 ký tự.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Upload files first
      const mediaUrls: string[] = [];
      for (const file of selectedFiles) {
        const url = await mediaService.upload(file);
        if (url) mediaUrls.push(url);
      }

      // 2. Retrieve guest token if unauthenticated
      const guestToken =
        localStorage.getItem('resq_guest_token_' + incidentId) || undefined;

      // 3. Post supplement
      await incidentService.addSupplement(incidentId, {
        note: cleanNote,
        mediaUrls,
        guestCancellationToken: guestToken,
      });

      setSuccessMsg('Đã gửi thông tin bổ sung thành công đến trung tâm điều phối!');
      setNote('');
      filePreviews.forEach((url) => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setFilePreviews([]);

      if (isAuthenticated) {
        loadHistory();
      }

      onSuccess?.();
    } catch (err: any) {
      // Backend 429 returns message directly
      const msg = getApiErrorMessage(
        err,
        'Không thể gửi thông tin bổ sung lúc này.'
      );
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Bổ sung thông tin hiện trường</span>
                {isLinked && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Sự cố đã gộp
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Mã sự cố: #{incidentId.substring(0, 8).toUpperCase()}{' '}
                {incidentTitle ? `• ${incidentTitle}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {isLinked && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 flex items-start gap-2.5 text-xs">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Báo cáo đang gộp vào sự cố gốc</p>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Thông tin và hình ảnh bổ sung của bạn sẽ được chuyển thẳng đến đội cứu hộ đang phụ trách sự cố gốc.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Note Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[11px] font-mono">
                  Ghi chú hiện trường
                </label>
                <span
                  className={`text-[10px] font-mono ${
                    note.length > 900 ? 'text-amber-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  {note.length}/1000 ký tự
                </span>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder="Ví dụ: Đám cháy vừa lan sang nhà kho bên cạnh; Có 2 người đã thoát ra ngoài..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-red-500 font-sans shadow-2xs resize-none"
              />
            </div>

            {/* Media Upload (Photos/Videos max 5) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[11px] font-mono">
                  Đính kèm ảnh / video ({selectedFiles.length}/5)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Tối đa 5 tệp
                </span>
              </div>

              {/* Thumbnails */}
              {filePreviews.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {filePreviews.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-100"
                    >
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        title="Xóa tệp"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add files button */}
              {selectedFiles.length < 5 && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 hover:border-red-500 bg-slate-50/50 hover:bg-red-50/20 text-slate-600 hover:text-red-600 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono text-xs"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Chọn thêm ảnh hoặc video hiện trường</span>
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition-all cursor-pointer font-mono"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!note.trim() && selectedFiles.length === 0)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer font-mono"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <span>Gửi bổ sung</span>
                )}
              </button>
            </div>
          </form>

          {/* Past Supplements History (Authenticated Only) */}
          {isAuthenticated ? (
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHistory((prev) => !prev)}
                className="text-xs text-slate-600 hover:text-slate-900 font-bold font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {showHistory ? 'Ẩn lịch sử bổ sung' : 'Xem thông tin đã bổ sung'} (
                  {supplements.length})
                </span>
              </button>

              {showHistory && (
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {isLoadingHistory ? (
                    <div className="py-4 text-center text-slate-400 font-mono">
                      <Loader2 className="w-4 h-4 animate-spin inline-block mr-1" />
                      Đang tải lịch sử...
                    </div>
                  ) : supplements.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-2 font-mono text-[11px]">
                      Chưa có thông tin bổ sung nào được gửi.
                    </p>
                  ) : (
                    supplements.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span className="font-bold text-slate-700">
                            {item.reporterName || 'Người báo'}
                          </span>
                          <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                        </div>
                        {item.note && (
                          <p className="text-slate-800 text-xs whitespace-pre-wrap">
                            {item.note}
                          </p>
                        )}
                        {item.mediaUrls && item.mediaUrls.length > 0 && (
                          <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                            {item.mediaUrls.map((url, uIdx) => (
                              <a
                                key={uIdx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-200 shrink-0"
                              >
                                <img
                                  src={url}
                                  alt="media"
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 font-mono italic text-center pt-2 border-t border-slate-100">
              * Khách có thể gửi bổ sung thông tin nhưng chỉ tài khoản đã đăng nhập mới xem lại được các lần gửi trước.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
