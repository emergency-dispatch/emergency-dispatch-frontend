import React from 'react';
import {
  Wrench,
  AlertTriangle,
  Flame,
  Truck,
  Radio,
  HeartPulse,
  PackageOpen,
  Info,
} from 'lucide-react';
import type { EquipmentCheckItem } from '../../../types/staff';

export const StaffEquipmentView: React.FC = () => {
  // Mock data has been removed per instructions.
  // Backend currently lacks an Equipment Management API.
  const items: EquipmentCheckItem[] = [];

  return (
    <div className="space-y-5 p-1 max-w-5xl mx-auto">
      {/* Alert Banner for Missing Backend API */}
      <div className="p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 shadow-xs space-y-2">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold uppercase font-mono tracking-wider text-amber-900">
            CHƯA CÓ API BACKEND: QUẢN LÝ TRANG THIẾT BỊ PHƯƠNG TIỆN
          </h3>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed pl-7.5">
          Hệ thống Backend hiện tại chưa có các endpoint quản lý trang thiết bị phương tiện:
        </p>
        <div className="pl-7.5 flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
          <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-semibold">
            GET /api/rescue-units/{'{id}'}/equipment
          </span>
          <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-semibold">
            PUT /api/rescue-units/{'{id}'}/equipment/checklist
          </span>
        </div>
        <p className="text-[11px] text-amber-700 italic pl-7.5 pt-1">
          Toàn bộ Mock Data giả lập trước đây đã được gỡ bỏ để phục vụ đối chiếu chính xác với Backend.
        </p>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase font-mono font-bold text-red-600">
              PRE-SHIFT READINESS CHECKLIST
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Bảng Kiểm Tra Trang Thiết Bị &amp; Phương Tiện Kíp Trực
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-mono font-bold">
            0 THIẾT BỊ ĐỒNG BỘ
          </span>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-xs space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
          <PackageOpen className="w-7 h-7 text-slate-500" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Chưa Có Danh Mục Thiết Bị Từ Máy Chủ
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Khi Backend bổ sung API kiểm tra trang thiết bị theo xe (<code className="font-mono text-red-600">/api/rescue-units/:id/equipment</code>), danh mục các trang thiết bị chữa cháy, cứu nạn, y tế và phương tiện sẽ tự động hiển thị tại đây để cán bộ kíp trực kiểm tra trước ca.
        </p>
      </div>
    </div>
  );
};
