import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  LifeBuoy,
  Truck,
  Ambulance,
  Flame,
  AlertTriangle,
  Send,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { CreateFieldRequestDto, FieldRequestType } from '../../types/fieldRequest';
import { staffAudioService } from '../../services/staffAudioService';

interface StaffFieldRequestModalProps {
  visible: boolean;
  assignmentId: string;
  incidentTitle?: string;
  initialType?: FieldRequestType;
  onClose: () => void;
  onSubmit: (dto: CreateFieldRequestDto) => Promise<boolean>;
}

const UNIT_TYPE_OPTIONS: { value: string | null; label: string; icon: React.ElementType }[] = [
  { value: null, label: 'Operator chỉ định (Bất kỳ)', icon: Truck },
  { value: 'Ambulance', label: 'Xe cứu thương (Ambulance)', icon: Ambulance },
  { value: 'FireTruck', label: 'Xe chữa cháy (Fire Truck)', icon: Flame },
  { value: 'LadderTruck', label: 'Xe thang cứu hộ (Ladder)', icon: Flame },
  { value: 'RescueTruck', label: 'Xe cứu nạn cứu hộ (Rescue)', icon: ShieldAlert },
  { value: 'WaterTanker', label: 'Xe bồn tiếp nước (Water Tanker)', icon: Truck },
];

const QUICK_OTHER_ISSUES = [
  'Cần CSGT hỗ trợ phân luồng & chặn đường',
  'Cần Điện lực cúp điện lưới khẩn cấp khu vực',
  'Cần Công an lập rào chắn bảo vệ hiện trường',
  'Cần chi viện máy bơm cao áp & lăng phun bọt',
  'Đường hẹp xe lớn không vào được, cần xe nhỏ',
];

export const StaffFieldRequestModal: React.FC<StaffFieldRequestModalProps> = ({
  visible,
  assignmentId,
  incidentTitle,
  initialType = 'Backup',
  onClose,
  onSubmit,
}) => {
  const [requestType, setRequestType] = useState<FieldRequestType>(initialType);
  const [quantity, setQuantity] = useState<number>(1);
  const [requestedUnitType, setRequestedUnitType] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!visible) return null;

  const isOther = requestType === 'Other';
  const isDescriptionValid = !isOther || description.trim().length >= 5;

  const handleSelectQuickIssue = (issue: string) => {
    setDescription(issue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isOther && description.trim().length < 5) {
      setErrorMessage('Vui lòng mô tả chi tiết vấn đề (tối thiểu 5 ký tự).');
      return;
    }

    setIsSubmitting(true);
    try {
      staffAudioService.playPriorityBeep();
      const payload: CreateFieldRequestDto = {
        type: requestType,
        quantity: requestType === 'Backup' ? quantity : 0,
        requestedUnitType: requestType === 'Backup' ? requestedUnitType : null,
        description: description.trim() || null,
      };

      const success = await onSubmit(payload);
      if (success) {
        onClose();
        // Reset form
        setDescription('');
        setQuantity(1);
        setRequestedUnitType(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể gửi yêu cầu về trung tâm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl text-white ${
                isOther ? 'bg-indigo-600' : 'bg-red-600'
              }`}
            >
              {isOther ? <LifeBuoy className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                {isOther ? 'Báo Vấn Đề Khác Về Trung Tâm' : 'Yêu Cầu Chi Viện Xe (Backup SOS)'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono truncate max-w-xs">
                Mục 21.2 • {incidentTitle || 'Nhiệm vụ tác chiến'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch between Backup and Other */}
        <div className="px-5 pt-4 pb-1">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold font-mono">
            <button
              type="button"
              onClick={() => {
                setRequestType('Backup');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !isOther
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>YÊU CẦU CHI VIỆN XE</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRequestType('Other');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isOther
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>BÁO VẤN ĐỀ KHÁC</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-5 py-3 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* BACKUP MODE FORM */}
          {!isOther && (
            <>
              {/* Quantity selector (1 - 5) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Số lượng xe cần chi viện (1 - 5 xe):</span>
                  <span className="font-mono text-red-600 font-extrabold text-sm">{quantity} xe</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuantity(num)}
                      className={`py-2 rounded-xl font-mono font-bold text-xs border transition-all ${
                        quantity === num
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-xs ring-1 ring-red-400'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      +{num} xe
                    </button>
                  ))}
                </div>
              </div>

              {/* Unit Type Dropdown / Grid */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Loại xe yêu cầu (Tùy chọn):</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {UNIT_TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = requestedUnitType === opt.value;
                    return (
                      <button
                        key={opt.value ?? 'all'}
                        type="button"
                        onClick={() => setRequestedUnitType(opt.value)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                          isSelected
                            ? 'bg-red-50 border-red-400 text-red-800 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-red-600' : 'text-slate-400'}`} />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description / Victim Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Mô tả tình trạng nạn nhân / Hiện trường (Tùy chọn):
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Đám cháy đang lan sang tầng 2, có khoảng 3 người mắc kẹt cần sơ tán gấp..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden"
                  maxLength={1000}
                />
              </div>
            </>
          )}

          {/* OTHER MODE FORM */}
          {isOther && (
            <>
              {/* Quick Suggestion Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Gợi ý yêu cầu nhanh:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_OTHER_ISSUES.map((issue) => (
                    <button
                      key={issue}
                      type="button"
                      onClick={() => handleSelectQuickIssue(issue)}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium transition-colors text-left"
                    >
                      + {issue}
                    </button>
                  ))}
                </div>
              </div>

              {/* Required Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Chi tiết vấn đề cần hỗ trợ <span className="text-red-500">*</span>:
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      description.trim().length >= 5 ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {description.trim().length}/5 ký tự tối thiểu
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả cụ thể sự cố cần phối hợp (ví dụ: cần công an chặn đường, cúp điện lưới, rào chắn hiện trường)..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                  maxLength={1000}
                  required
                />
              </div>
            </>
          )}

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Yêu cầu sẽ được chuyển tức thời đến màn hình Tổng đài viên CAD qua SignalR. Tổng đài viên sẽ phản hồi hoặc trực tiếp điều động thêm xe chi viện.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isDescriptionValid}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isOther
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>ĐANG PHÁT TÍN HIỆU...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isOther ? 'GỬI BÁO CÁO VẤN ĐỀ' : 'PHÁT LỆNH XIN CHI VIỆN'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

