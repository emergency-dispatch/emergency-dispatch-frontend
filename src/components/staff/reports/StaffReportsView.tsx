import React, { useState } from 'react';
import {
  FileCheck2,
  Camera,
  Calendar,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  PackageCheck,
  ExternalLink,
} from 'lucide-react';
import type { StaffMission, DigitalClosureReport } from '../../../types/staff';
import { SEVERITY_META } from '../../../data/incidentMock';

interface StaffReportsViewProps {
  completedMissions: StaffMission[];
  onOpenNewReport: () => void;
}

export const StaffReportsView: React.FC<StaffReportsViewProps> = ({
  completedMissions,
  onOpenNewReport,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<StaffMission | null>(
    completedMissions[0] || null
  );

  const filtered = completedMissions.filter(
    (m) =>
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 p-1">
      {/* Top filter bar */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm mã sự cố, địa chỉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono-data text-slate-400">
          <FileCheck2 className="w-4 h-4 text-cyan-400" />
          <span>Tổng số {completedMissions.length} hồ sơ báo cáo điện tử đã lưu trữ</span>
        </div>
      </div>

      {/* Grid: List on Left (5 Cols), Detail on Right (7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Report List */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[700px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-500 text-xs font-mono-data">
              Không tìm thấy hồ sơ báo cáo nào.
            </div>
          ) : (
            filtered.map((m) => {
              const isSelected = selectedReport?.id === m.id;
              const severityMeta = SEVERITY_META[m.severity];

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedReport(m)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/80 shadow-lg shadow-cyan-950/40'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono-data font-bold text-xs text-cyan-400">
                      {m.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono-data font-bold border ${severityMeta.badgeClass}`}>
                      CẤP {m.severity}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white truncate mb-1">{m.title}</h4>
                  <div className="text-xs text-slate-400 truncate mb-2">{m.address}</div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-data pt-2 border-t border-slate-800/80">
                    <span>{new Date(m.assignedAt).toLocaleDateString('vi-VN')}</span>
                    <span className="text-emerald-400 font-semibold">Đã nộp & Ký số</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Detailed Selected Report View */}
        <div className="lg:col-span-7">
          {selectedReport ? (
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-data uppercase text-cyan-400 font-bold">
                      HỒ SƠ BÁO CÁO ĐIỆN TỬ
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono-data font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      ĐÃ PHÊ DUYỆT BỞI CAD
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                    {selectedReport.title}
                  </h3>
                </div>

                <div className="text-right text-xs font-mono-data text-slate-400">
                  <div>Mã nhiệm vụ: <strong className="text-white">{selectedReport.id}</strong></div>
                  <div>Sự cố: <strong className="text-cyan-400">#{selectedReport.incidentId}</strong></div>
                </div>
              </div>

              {/* Action summary */}
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs">
                <span className="text-slate-400 font-mono-data uppercase">Diễn biến & Xử lý tại chỗ:</span>
                <p className="text-slate-200 leading-relaxed">
                  {selectedReport.closureReport?.actionSummary || selectedReport.description}
                </p>
              </div>

              {/* Stats: Casualties & Handover */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-center">
                  <div className="text-base font-black text-cyan-400 font-mono-data">
                    {selectedReport.closureReport?.casualtiesTreated ?? 2}
                  </div>
                  <div className="text-slate-400 text-[11px]">Sơ cứu tại chỗ</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-center">
                  <div className="text-base font-black text-emerald-400 font-mono-data">
                    {selectedReport.closureReport?.casualtiesHospitalized ?? 2}
                  </div>
                  <div className="text-slate-400 text-[11px]">Chuyển viện cấp cứu</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
                  <div className="text-xs font-bold text-amber-400 truncate">
                    {selectedReport.closureReport?.handoverEntity || 'BV Cấp Cứu 115'}
                  </div>
                  <div className="text-slate-400 text-[11px]">Đơn vị tiếp nhận</div>
                </div>
              </div>

              {/* Evidence Photos */}
              <div className="space-y-2">
                <div className="text-xs font-mono-data font-bold uppercase text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  Ảnh Hiện Trường & Bằng Chứng
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(selectedReport.closureReport?.photos || []).map((p) => (
                    <div key={p.id} className="relative h-24 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                      <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 text-[9px] text-white truncate font-mono-data">
                        {p.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500 text-xs font-mono-data">
              Chọn một hồ sơ báo cáo bên trái để xem chi tiết
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
