import React from 'react';
import { TriangleAlert } from 'lucide-react';

interface DeleteConfirmDialogProps {
  stationName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({ stationName, onCancel, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl cad-glass border border-slate-700/80 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-950/60 border border-red-800 flex items-center justify-center shrink-0">
            <TriangleAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Xóa trạm cứu hộ?</h3>
            <p className="text-xs text-slate-400 mt-0.5">Hành động này không thể hoàn tác.</p>
          </div>
        </div>

        <p className="text-sm text-slate-300">
          Bạn có chắc muốn xóa <span className="font-semibold text-white">{stationName}</span>?
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
};
