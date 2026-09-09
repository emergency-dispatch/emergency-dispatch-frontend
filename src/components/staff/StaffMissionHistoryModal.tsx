import React, { useState } from 'react';
import { History, X, CheckCircle2, MapPin, Clock, FileText, ChevronRight, UserCheck, ShieldAlert } from 'lucide-react';
import type { StaffMission, DigitalClosureReport } from '../../types/staff';
import { SEVERITY_META } from '../../data/incidentMock';

interface StaffMissionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  missions: StaffMission[];
  onSelectMission: (mission: StaffMission) => void;
}

export const StaffMissionHistoryModal: React.FC<StaffMissionHistoryModalProps> = ({
  isOpen,
  onClose,
  missions,
  onSelectMission,
}) => {
  const [selectedReport, setSelectedReport] = useState<StaffMission | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Fullscreen Backdrop Blur */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Centering Dialog Container */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div className="relative z-10 w-full max-w-3xl bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white text-left flex flex-col max-h-[85vh] my-6 animate-fadeIn">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Nhật Ký Nhiệm Vụ Trong Ca Trực
              </h3>
              <p className="text-xs text-slate-400 font-mono-data">
                Tổng cộng {missions.length} nhiệm vụ đã ghi nhận
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
          {missions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm font-mono-data">
              Chưa có nhiệm vụ nào hoàn tất trong ca trực này.
            </div>
          ) : (
            missions.map((m) => {
              const severityMeta = SEVERITY_META[m.severity];
              const isCompleted = m.status === 'completed';

              return (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-data font-bold text-xs text-cyan-400">
                        {m.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono-data font-bold border ${severityMeta.badgeClass}`}>
                        CẤP {m.severity}
                      </span>
                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono-data font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          HOÀN TẤT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono-data font-bold bg-amber-500/20 text-yellow-400 border border-amber-500/40">
                          ĐANG XỬ LÝ ({m.status.toUpperCase()})
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white truncate">{m.title}</h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono-data">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate max-w-[200px]">{m.address}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(m.assignedAt).toLocaleTimeString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        onSelectMission(m);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Chi Tiết
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  </div>
);
};
