import React, { useState } from 'react';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Truck,
  Radio,
  HeartPulse,
  RotateCcw,
  Plus,
} from 'lucide-react';
import type { EquipmentCheckItem } from '../../../types/staff';
import { mockEquipmentList } from '../../../data/staffMock';
import { staffAudioService } from '../../../services/staffAudioService';

const CATEGORY_META = {
  vehicle: { label: 'Phương tiện & Động cơ', icon: Truck, color: 'text-slate-600' },
  firefighting: { label: 'Chữa cháy & Khí độc', icon: Flame, color: 'text-red-600' },
  medical: { label: 'Y tế & Cấp cứu', icon: HeartPulse, color: 'text-emerald-600' },
  communication: { label: 'Bộ đàm & Định vị', icon: Radio, color: 'text-blue-600' },
};

export const StaffEquipmentView: React.FC = () => {
  const [items, setItems] = useState<EquipmentCheckItem[]>(mockEquipmentList);
  const [toast, setToast] = useState<string | null>(null);

  const toggleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'operational' ? 'needs_refill' : 'operational';
          return { ...item, status: nextStatus, lastChecked: 'Vừa xong' };
        }
        return item;
      })
    );
    staffAudioService.playSuccessChime();
    setToast('Đã cập nhật trạng thái thiết bị sẵn sàng chiến đấu!');
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-4 p-1">
      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase font-mono-data font-bold text-red-600">
              PRE-SHIFT READINESS CHECKLIST
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Bảng Kiểm Tra Trang Thiết Bị & Phương Tiện Xe 51D-123.45
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono-data font-bold">
            96% ĐẠT CHUẨN XUẤT PHÁT
          </span>
        </div>
      </div>

      {/* Equipment List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {items.map((item) => {
          const catMeta = CATEGORY_META[item.category];
          const Icon = catMeta.icon;
          const isOk = item.status === 'operational';

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 shadow-sm ${
                isOk
                  ? 'bg-white border-slate-200 hover:border-slate-300'
                  : 'bg-amber-50/50 border-amber-300'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Icon className={`w-4 h-4 ${catMeta.color}`} />
                    <span>{catMeta.label}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-data font-bold border ${
                      isOk
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {isOk ? 'SẴN SÀNG' : 'CẦN BỔ SUNG'}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 leading-tight">{item.name}</h4>
                <p className="text-xs text-slate-500">{item.note}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="font-mono-data text-red-600 font-bold">
                  SL: {item.quantity} {item.unit}
                </span>

                <button
                  onClick={() => toggleStatus(item.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono-data transition-colors font-medium"
                >
                  Đổi Trạng Thái
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
