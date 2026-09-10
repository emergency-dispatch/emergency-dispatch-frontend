import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 z-[9999] overflow-y-auto">
      {/* Fullscreen Backdrop Blur */}
      <div
        className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Centering Dialog Container */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div className="relative z-10 w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900 text-left flex flex-col max-h-[85vh] my-6 animate-fadeIn">
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Nhật Ký Nhiệm Vụ Trong Ca Trực
              </h3>
              <p className="text-xs text-slate-500 font-mono-data">
                Tổng cộng {missions.length} nhiệm vụ đã ghi nhận
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 bg-white">
          {missions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm font-mono-data">
              Chưa có nhiệm vụ nào hoàn tất trong ca trực này.
            </div>
          ) : (
            missions.map((m) => {
              const severityMeta = SEVERITY_META[m.severity];
              const isCompleted = m.status === 'completed';

              return (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-data font-bold text-xs text-red-600">
                        {m.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono-data font-bold border ${severityMeta.badgeClass}`}>
                        CẤP {m.severity}
                      </span>
                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono-data font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          HOÀN TẤT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono-data font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          ĐANG XỬ LÝ ({m.status.toUpperCase()})
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 truncate">{m.title}</h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono-data">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[200px]">{m.address}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
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
                      className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
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
  </div>,
  document.body
);
};
