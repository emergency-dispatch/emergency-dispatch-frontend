import React, { useState } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  AlertOctagon,
  LifeBuoy,
  Radio,
  Flame,
  Ambulance,
  ShieldCheck,
  CheckCircle2,
  X,
} from 'lucide-react';
import { staffAudioService } from '../../services/staffAudioService';

interface StaffQuickActionPanelProps {
  missionId: string;
}

export const StaffQuickActionPanel: React.FC<StaffQuickActionPanelProps> = ({ missionId }) => {
  const [activeDialog, setActiveDialog] = useState<'backup' | 'traffic' | 'hazard' | null>(null);
  const [sentNotification, setSentNotification] = useState<string | null>(null);

  const handleTriggerBackup = (type: string) => {
    staffAudioService.playPriorityBeep();
    setSentNotification(`Đã gửi yêu cầu chi viện [${type}] khẩn cấp tới Tổng Đài CAD!`);
    setActiveDialog(null);
    setTimeout(() => setSentNotification(null), 4000);
  };

  const handleReportTraffic = () => {
    staffAudioService.playPriorityBeep();
    setSentNotification('Đã báo kẹt xe! Tổng đài CAD đang điều chỉnh đèn tín hiệu ưu tiên.');
    setActiveDialog(null);
    setTimeout(() => setSentNotification(null), 4000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <LifeBuoy className="w-4 h-4 text-red-600" />
          Bảng Thao Tác Khẩn Cấp Tại Hiện Trường
        </h4>
        <span className="text-[10px] font-mono text-slate-500 font-semibold">HOTKEY MDT</span>
      </div>

      {sentNotification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{sentNotification}</span>
        </div>
      )}

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Button 1: Request Backup SOS */}
        <button
          onClick={() => setActiveDialog('backup')}
          className="p-3 rounded-xl bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-700 flex flex-col items-center text-center gap-1.5 transition-all active:scale-95 group cursor-pointer"
        >
          <div className="p-2 rounded-lg bg-red-600 text-white shadow-xs">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold leading-tight">Yêu Cầu Chi Viện</span>
          <span className="text-[10px] text-red-600 font-mono font-semibold">SOS BACKUP</span>
        </button>

        {/* Button 2: Direct Call CAD */}
        <a
          href="tel:114"
          className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 flex flex-col items-center text-center gap-1.5 transition-all active:scale-95 group cursor-pointer"
        >
          <div className="p-2 rounded-lg bg-slate-200 text-slate-700 shadow-xs">
            <PhoneCall className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold leading-tight">Gọi Tổng Đài CAD</span>
          <span className="text-[10px] text-slate-500 font-mono">HOTLINE 114</span>
        </a>

        {/* Button 3: Report Traffic Block */}
        <button
          onClick={() => setActiveDialog('traffic')}
          className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 flex flex-col items-center text-center gap-1.5 transition-all active:scale-95 group cursor-pointer"
        >
          <div className="p-2 rounded-lg bg-slate-200 text-slate-700 shadow-xs">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold leading-tight">Báo Kẹt Tuyến</span>
          <span className="text-[10px] text-slate-500 font-mono">TRAFFIC JAM</span>
        </button>

        {/* Button 4: Radio intercom */}
        <button
          onClick={() => {
            staffAudioService.playPriorityBeep();
            setSentNotification('Đang mở kênh đàm thoại bộ đàm Channel #01 (Chỉ huy)...');
            setTimeout(() => setSentNotification(null), 3000);
          }}
          className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 flex flex-col items-center text-center gap-1.5 transition-all active:scale-95 group cursor-pointer"
        >
          <div className="p-2 rounded-lg bg-slate-200 text-slate-700 shadow-xs">
            <Radio className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold leading-tight">Bộ Đàm Kíp Trực</span>
          <span className="text-[10px] text-slate-500 font-mono">CH #01</span>
        </button>
      </div>

      {/* Dialog for Backup Selection */}
      {activeDialog === 'backup' && (
        <div className="p-4 bg-slate-50 rounded-xl border border-red-200 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 uppercase font-mono">
              Chọn Lực Lượng Cần Chi Viện Khẩn Cấp:
            </span>
            <button onClick={() => setActiveDialog(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleTriggerBackup('Xe Cứu Hỏa & Xe Thang')}
              className="p-2.5 rounded-lg bg-white hover:bg-red-50 text-slate-800 text-xs font-bold border border-slate-200 hover:border-red-400 flex flex-col items-center gap-1 transition-colors shadow-xs cursor-pointer"
            >
              <Flame className="w-4 h-4 text-red-600" />
              <span>Thêm Xe Cứu Hỏa</span>
            </button>

            <button
              onClick={() => handleTriggerBackup('Xe Cứu Thương 115')}
              className="p-2.5 rounded-lg bg-white hover:bg-red-50 text-slate-800 text-xs font-bold border border-slate-200 hover:border-red-400 flex flex-col items-center gap-1 transition-colors shadow-xs cursor-pointer"
            >
              <Ambulance className="w-4 h-4 text-red-600" />
              <span>Thêm Cứu Thương 115</span>
            </button>

            <button
              onClick={() => handleTriggerBackup('Lực Lượng CSGT / Công An Phường')}
              className="p-2.5 rounded-lg bg-white hover:bg-red-50 text-slate-800 text-xs font-bold border border-slate-200 hover:border-red-400 flex flex-col items-center gap-1 transition-colors shadow-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-red-600" />
              <span>Cảnh Sát / CSGT</span>
            </button>
          </div>
        </div>
      )}

      {/* Dialog for Traffic Report */}
      {activeDialog === 'traffic' && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase font-mono">
              Xác nhận báo kẹt xe trên tuyến đường hiện tại:
            </span>
            <button onClick={() => setActiveDialog(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600">
            Hệ thống CAD sẽ kích hoạt luồng sóng xanh (Green Wave) tại các nút giao thông lân cận và đề xuất tuyến đường tránh thay thế.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setActiveDialog(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-200 text-xs text-slate-700 hover:bg-slate-300 cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleReportTraffic}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Xác Nhận Báo Kẹt Xe
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
