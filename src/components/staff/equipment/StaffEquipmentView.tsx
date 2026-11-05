import React from 'react';
import {
  Wrench,
  PackageOpen,
} from 'lucide-react';
import type { EquipmentCheckItem } from '../../../types/staff';

export const StaffEquipmentView: React.FC = () => {
  const items: EquipmentCheckItem[] = [];

  return (
    <div className="space-y-5 p-1 max-w-5xl mx-auto">
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
            {items.length} THIẾT BỊ ĐỒNG BỘ
          </span>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-xs space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
          <PackageOpen className="w-7 h-7 text-slate-500" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Chưa Có Danh Mục Thiết Bị
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Hiện tại chưa có danh mục trang thiết bị hoặc xe đang được bảo trì. Vui lòng liên hệ quản lý trạm nếu cần cập nhật danh sách trang thiết bị kíp trực.
        </p>
      </div>
    </div>
  );
};
