import React from 'react';
import {
  CalendarDays,
  AlertTriangle,
  Clock,
  ArrowLeftRight,
  Coffee,
  CheckCircle2,
  CalendarX,
  FileQuestion,
} from 'lucide-react';

export const StaffScheduleView: React.FC = () => {
  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Alert Banner for Missing Shift APIs */}
      <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-amber-900">
            CHƯA CÓ API BACKEND: PHÂN HỆ QUẢN LÝ CA TRỰC (/api/shifts)
          </h3>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed pl-7.5">
          Theo tài liệu bàn giao kỹ thuật <strong>FE_MOBILE_HANDOFF.md</strong> (Mục 5.3) và tài liệu API Backend, nghiệp vụ Quản lý Ca trực hiện tại <strong>chưa có API Backend</strong>. Để phục vụ đối chiếu chính xác, toàn bộ Mock Data giả lập đã được gỡ bỏ.
        </p>

        <div className="pl-7.5 space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-amber-950 uppercase font-mono">
            Danh sách các API Backend cần bổ sung:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] pt-1">
            <div className="p-2 rounded-lg bg-white border border-amber-300 text-amber-900 flex items-center justify-between">
              <span>GET /api/shifts</span>
              <span className="text-[10px] text-amber-700 font-sans">Lịch ca cá nhân &amp; trạm</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-amber-300 text-amber-900 flex items-center justify-between">
              <span>POST /api/shifts/register</span>
              <span className="text-[10px] text-amber-700 font-sans">Đăng ký ca trực mới</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-amber-300 text-amber-900 flex items-center justify-between">
              <span>POST /api/shifts/swap</span>
              <span className="text-[10px] text-amber-700 font-sans">Yêu cầu đổi ca trực</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-amber-300 text-amber-900 flex items-center justify-between">
              <span>POST /api/shifts/leave</span>
              <span className="text-[10px] text-amber-700 font-sans">Đơn xin nghỉ phép</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-amber-300 text-amber-900 flex items-center justify-between">
              <span>POST /api/shifts/check-in</span>
              <span className="text-[10px] text-amber-700 font-sans">Điểm danh vào ca trực</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-amber-300 text-amber-900 flex items-center justify-between">
              <span>GET /api/shifts/summary</span>
              <span className="text-[10px] text-amber-700 font-sans">Thống kê giờ trực &amp; phép</span>
            </div>
          </div>
        </div>
      </div>

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
            Chưa Có Dữ Liệu Lịch Ca Từ Máy Chủ
          </h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Hệ thống không sử dụng dữ liệu giả lập. Khi Backend triển khai các API xếp ca trực (<code className="font-mono text-red-600 bg-red-50 px-1 py-0.5 rounded">/api/shifts</code>), toàn bộ lịch trực tuần/tháng, phiếu đăng ký ca, yêu cầu đổi ca và chức năng điểm danh GPS sẽ tự động hiển thị tại đây.
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
