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
    <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-mono-data font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <LifeBuoy className="w-4 h-4 text-red-400" />
          Bảng Thao Tác Khẩn Cấp Tại Hiện Trường
        </h4>
        <span className="text-[10px] font-mono-data text-slate-500">HOTKEY MDT</span>
      </div>

      {sentNotification && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{sentNotification}</span>
        </div>
      )}

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Button 1: Request Backup SOS */}
        <button
          onClick={() => setActiveDialog('backup')}
          className="p-3 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 text-red-300 hover:text-white flex flex-col items-center text-center gap-1.5 transition-all active:scale-95 group"
        >
          <div className="p-2 rounded-lg bg-red-600/30 group-hover:bg-red-600/50 text-red-400 group-hover:text-white">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold leading-tight">Yêu Cầu Chi Viện</span>
          <span className="text-[10px] text-red-400/80 font-mono-data">SOS BACKUP</span>
        </button>

        {/* Button 2: Direct Call CAD */}
        <a
          href="tel:114"
          className="p-3 rounded-xl bg-blue-950/50 hover:bg-blue-900/60 border border-blue-500/40 text-blue-300 hover:text-white flex flex-col items-center text-center gap-1.5 transition-all active:scale-95 group"
        >
          <div className="p-2 rounded-lg bg-blue-600/30 group-hover:bg-blue-600/50 text-blue-400 group-hover:text-white">
            <PhoneCall className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold leading-tight">Gọi Tổng Đài CAD</span>
          <span className="text-[10px] text-blue-400/80 font-mono-data">HOTLINE 114</span>
        </a>

        {/* Button 3: Report Traffic Block */}
        <button
          onClick={() => setActiveDialog('traffic')}
          className="p-3 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 hover:text-white flex flex-col items-center text-center gap-1.5 transition-all active:scale-95 group"
        >
          <div className="p-2 rounded-lg bg-amber-600/30 group-hover:bg-amber-600/50 text-amber-400 group-hover:text-white">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold leading-tight">Báo Kẹt Tuyến</span>
          <span className="text-[10px] text-amber-400/80 font-mono-data">TRAFFIC JAM</span>
        </button>

        {/* Button 4: Radio intercom */}
        <button
          onClick={() => {
            staffAudioService.playPriorityBeep();
            setSentNotification('Đang mở kênh đàm thoại bộ đàm Channel #01 (Chỉ huy)...');
            setTimeout(() => setSentNotification(null), 3000);
          }}
          className="p-3 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 hover:text-white flex flex-col items-center text-center gap-1.5 transition-all active:scale-95 group"
        >
          <div className="p-2 rounded-lg bg-purple-600/30 group-hover:bg-purple-600/50 text-purple-400 group-hover:text-white">
            <Radio className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold leading-tight">Bộ Đàm Kíp Trực</span>
          <span className="text-[10px] text-purple-400/80 font-mono-data">CH #01</span>
        </button>
      </div>

      {/* Dialog for Backup Selection */}
      {activeDialog === 'backup' && (
        <div className="p-4 bg-slate-900 rounded-xl border border-red-500/50 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400 uppercase font-mono-data">
              Chọn Lực Lượng Cần Chi Viện Khẩn Cấp:
            </span>
            <button onClick={() => setActiveDialog(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleTriggerBackup('Xe Cứu Hỏa & Xe Thang')}
              className="p-2.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-white text-xs font-bold border border-red-500/50 flex flex-col items-center gap-1 transition-colors"
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Thêm Xe Cứu Hỏa</span>
            </button>

            <button
              onClick={() => handleTriggerBackup('Xe Cứu Thương 115')}
              className="p-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-white text-xs font-bold border border-emerald-500/50 flex flex-col items-center gap-1 transition-colors"
            >
              <Ambulance className="w-4 h-4 text-emerald-400" />
              <span>Thêm Cứu Thương 115</span>
            </button>

            <button
              onClick={() => handleTriggerBackup('Lực Lượng CSGT / Công An Phường')}
              className="p-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-white text-xs font-bold border border-blue-500/50 flex flex-col items-center gap-1 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Cảnh Sát / CSGT</span>
            </button>
          </div>
        </div>
      )}

      {/* Dialog for Traffic Report */}
      {activeDialog === 'traffic' && (
        <div className="p-4 bg-slate-900 rounded-xl border border-amber-500/50 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase font-mono-data">
              Xác nhận báo kẹt xe trên tuyến đường hiện tại:
            </span>
            <button onClick={() => setActiveDialog(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300">
            Hệ thống CAD sẽ kích hoạt luồng sóng xanh (Green Wave) tại các nút giao thông lân cận và đề xuất tuyến đường tránh thay thế.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setActiveDialog(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white"
            >
              Hủy
            </button>
            <button
              onClick={handleReportTraffic}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md"
            >
              Xác Nhận Báo Kẹt Xe
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
