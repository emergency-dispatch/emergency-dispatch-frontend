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
  vehicle: { label: 'Phương tiện & Động cơ', icon: Truck, color: 'text-blue-400' },
  firefighting: { label: 'Chữa cháy & Khí độc', icon: Flame, color: 'text-orange-400' },
  medical: { label: 'Y tế & Cấp cứu', icon: HeartPulse, color: 'text-emerald-400' },
  communication: { label: 'Bộ đàm & Định vị', icon: Radio, color: 'text-cyan-400' },
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
        <div className="p-3 bg-emerald-950 border border-emerald-500 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/40">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs uppercase font-mono-data font-bold text-orange-400">
              PRE-SHIFT READINESS CHECKLIST
            </div>
            <h2 className="text-lg font-bold text-white">
              Bảng Kiểm Tra Trang Thiết Bị & Phương Tiện Xe 51D-123.45
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono-data font-bold">
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
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                isOk
                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  : 'bg-amber-950/25 border-amber-500/50'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Icon className={`w-4 h-4 ${catMeta.color}`} />
                    <span>{catMeta.label}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-data font-bold border ${
                      isOk
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {isOk ? 'SẴN SÀNG' : 'CẦN BỔ SUNG'}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white leading-tight">{item.name}</h4>
                <p className="text-xs text-slate-400">{item.note}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="font-mono-data text-cyan-400 font-bold">
                  SL: {item.quantity} {item.unit}
                </span>

                <button
                  onClick={() => toggleStatus(item.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono-data transition-colors"
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
