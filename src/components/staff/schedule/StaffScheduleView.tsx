import React from 'react';
import {
  CalendarDays,
  Clock,
  ArrowLeftRight,
  Coffee,
  CalendarX,
} from 'lucide-react';

export const StaffScheduleView: React.FC = () => {
  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase font-mono font-bold text-red-600">
              SHIFT &amp; ROSTER MANAGEMENT
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Lịch Ca Trực &amp; Phân Công Nhiệm Vụ
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-mono font-bold">
            0 CA TRỰC ĐỒNG BỘ
          </span>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-14 text-center shadow-xs space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
          <CalendarX className="w-8 h-8 text-slate-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Chưa Có Dữ Liệu Lịch Ca
          </h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Hiện tại bạn chưa được phân ca trực trong tuần này. Vui lòng liên hệ chỉ huy trạm để được xếp lịch trực tác chiến.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Giờ trực: --
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
            Đổi ca: Chưa khả dụng
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-slate-400" />
            Phép năm: Chưa đồng bộ
          </span>
        </div>
      </div>
    </div>
  );
};
