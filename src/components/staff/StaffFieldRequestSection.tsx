import React, { useState } from 'react';
import {
  ShieldAlert,
  LifeBuoy,
  Truck,
  Ambulance,
  Flame,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  MessageSquare,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import type { FieldRequestDto, FieldRequestType } from '../../types/fieldRequest';
import { StaffFieldRequestModal } from './StaffFieldRequestModal';
import type { CreateFieldRequestDto } from '../../types/fieldRequest';

interface StaffFieldRequestSectionProps {
  assignmentId: string;
  incidentTitle?: string;
  fieldRequests: FieldRequestDto[];
  loading: boolean;
  onCreateRequest: (dto: CreateFieldRequestDto) => Promise<boolean>;
  onCancelRequest: (requestId: string, note?: string) => Promise<boolean>;
}

export const StaffFieldRequestSection: React.FC<StaffFieldRequestSectionProps> = ({
  assignmentId,
  incidentTitle,
  fieldRequests,
  loading,
  onCreateRequest,
  onCancelRequest,
}) => {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<FieldRequestType>('Backup');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleOpenCreateModal = (type: FieldRequestType) => {
    setModalType(type);
    setModalOpen(true);
  };

  const handleConfirmCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await onCancelRequest(id, 'Hiện trường tự xử lý xong / Không cần chi viện nữa');
    } finally {
      setCancellingId(null);
    }
  };

  const renderStatusBadge = (status: FieldRequestDto['status']) => {
    switch (status) {
      case 'Open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            CHỜ TIẾP NHẬN (OPEN)
          </span>
        );
      case 'Acknowledged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3 h-3 text-blue-600" />
            TỔNG ĐÀI ĐANG XỬ LÝ (ACK)
          </span>
        );
      case 'Fulfilled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ĐÃ ĐÁP ỨNG / ĐIỀU XE
          </span>
        );
      case 'Declined':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-600" />
            TỪ CHỐI
          </span>
        );
      case 'Cancelled':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-300">
            ĐÃ HỦY
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
              YÊU CẦU CHI VIỆN &amp; HỖ TRỢ HIỆN TRƯỜNG
            </h4>
            <p className="text-[10px] text-slate-500 font-mono">Quy chuẩn Mục 21.2 &amp; 12.2</p>
          </div>
        </div>

        {fieldRequests.length > 0 && (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold text-slate-700">
            {fieldRequests.length} yêu cầu
          </span>
        )}
      </div>

      {/* 2 Main Action Buttons: Backup & Other */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Button 1: Request Backup */}
        <button
          type="button"
          onClick={() => handleOpenCreateModal('Backup')}
          className="p-3 rounded-xl bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-900 flex items-start gap-3 transition-all active:scale-[0.98] group cursor-pointer text-left shadow-xs"
        >
          <div className="p-2 rounded-lg bg-red-600 text-white shrink-0 group-hover:scale-105 transition-transform">
            <Truck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="text-xs font-extrabold text-red-950 flex items-center gap-1.5">
              <span>YÊU CẦU CHI VIỆN (BACKUP)</span>
            </div>
            <p className="text-[11px] text-red-800 leading-tight">
              Xin trung tâm gửi thêm từ 1 đến 5 xe (Ambulance, xe chữa cháy...)
            </p>
          </div>
        </button>

        {/* Button 2: Report Other Issue */}
        <button
          type="button"
          onClick={() => handleOpenCreateModal('Other')}
          className="p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-900 flex items-start gap-3 transition-all active:scale-[0.98] group cursor-pointer text-left shadow-xs"
        >
          <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 group-hover:scale-105 transition-transform">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
              <span>BÁO VẤN ĐỀ KHÁC (OTHER)</span>
            </div>
            <p className="text-[11px] text-indigo-800 leading-tight">
              Cần CSGT phân luồng, điện lực cúp điện lưới, rào chắn hiện trường...
            </p>
          </div>
        </button>
      </div>

      {/* Requests Status Feed */}
      <div className="space-y-2 pt-1">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
          <span>Trạng thái yêu cầu từ tổ:</span>
          {loading && <span className="text-[10px] text-slate-400">Đang cập nhật...</span>}
        </div>

        {fieldRequests.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Chưa có yêu cầu chi viện nào đang gửi</p>
            <p className="text-[11px] text-slate-500">
              Nhấn một trong 2 nút phía trên nếu hiện trường diễn biến phức tạp cần thêm lực lượng.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {fieldRequests.map((req) => {
              const isOpen = req.status === 'Open' || req.status === 'Acknowledged';
              const isBackup = req.type === 'Backup';

              return (
                <div
                  key={req.id}
                  className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                    req.status === 'Fulfilled'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : req.status === 'Declined'
                      ? 'bg-rose-50/40 border-rose-200'
                      : isOpen
                      ? 'bg-amber-50/40 border-amber-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Top row: Type badge + Status */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] font-mono border ${
                          isBackup
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {isBackup ? `CHI VIỆN: +${req.quantity} XE` : 'VẤN ĐỀ KHÁC'}
                      </span>

                      {req.requestedUnitType && (
                        <span className="font-mono text-[10px] text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                          {req.requestedUnitType}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {renderStatusBadge(req.status)}
                    </div>
                  </div>

                  {/* Description */}
                  {req.description && (
                    <p className="text-slate-800 text-[11px] leading-relaxed bg-white/80 p-2 rounded-lg border border-slate-100">
                      {req.description}
                    </p>
                  )}

                  {/* Response Note from Operator (if fulfilled or declined) */}
                  {req.responseNote && (
                    <div
                      className={`p-2 rounded-lg text-[11px] flex items-start gap-1.5 ${
                        req.status === 'Fulfilled'
                          ? 'bg-emerald-100/70 text-emerald-950 font-medium'
                          : req.status === 'Declined'
                          ? 'bg-rose-100/70 text-rose-950 font-medium'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        <strong>Phản hồi Operator:</strong> {req.responseNote}
                      </span>
                    </div>
                  )}

                  {/* Bottom row: Timing & Cancel Button */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 text-[11px] text-slate-500">
                    <span className="font-mono">
                      {req.ageMinutes !== undefined
                        ? `${req.ageMinutes} phút trước`
                        : new Date(req.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                    </span>

                    {/* Cancel action if Open or Acknowledged */}
                    {isOpen && (
                      <button
                        type="button"
                        onClick={() => handleConfirmCancel(req.id)}
                        disabled={cancellingId === req.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-red-700 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                        title="Hủy yêu cầu nếu hiện trường đã tự kiểm soát được tình hình"
                      >
                        {cancellingId === req.id ? (
                          <Loader2 className="w-3 h-3 animate-spin text-red-600" />
                        ) : (
                          <RotateCcw className="w-3 h-3 text-slate-500" />
                        )}
                        <span>{cancellingId === req.id ? 'Đang hủy...' : 'Hủy yêu cầu'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <StaffFieldRequestModal
        visible={modalOpen}
        assignmentId={assignmentId}
        incidentTitle={incidentTitle}
        initialType={modalType}
        onClose={() => setModalOpen(false)}
        onSubmit={onCreateRequest}
      />
    </div>
  );
};

