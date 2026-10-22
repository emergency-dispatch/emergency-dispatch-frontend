import React from 'react';
import { Pencil, Phone, Trash2 } from 'lucide-react';
import { iconButtonClass, thClass } from '../common/styles';
import type { StationResponseDto } from '../../../types/station';

interface StationsTableProps {
  stations: StationResponseDto[];
  loading: boolean;
  onEdit: (station: StationResponseDto) => void;
  onDelete: (station: StationResponseDto) => void;
}

export const StationsTable: React.FC<StationsTableProps> = ({ stations, loading, onEdit, onDelete }) => {
  return (
    <div
      className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
        loading ? 'opacity-60' : ''
      }`}
    >
      <table className="w-full text-sm min-w-[840px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className={thClass}>Tên trạm</th>
            <th className={thClass}>Hotline</th>
            <th className={thClass}>Bán kính</th>
            <th className={thClass}>Trạng thái</th>
            <th className={thClass}>Nhân sự</th>
            <th className={thClass}>Xe sẵn sàng</th>
            <th className={`${thClass} text-right`}>Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {stations.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                {loading ? 'Đang tải...' : 'Không có trạm nào phù hợp.'}
              </td>
            </tr>
          )}
          {stations.map((station) => (
            <tr key={station.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-900">{station.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{station.address}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5 font-mono-data text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {station.phoneNumber || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500 font-mono-data whitespace-nowrap">{station.coverageRadiusKm} km</td>
              <td className="px-4 py-3 whitespace-nowrap">
                {station.isActive ? (
                  <span className="px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold font-mono-data">
                    Hoạt động
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md border border-slate-300 bg-slate-100 text-slate-500 text-[10px] font-bold font-mono-data">
                    Tạm ngưng
                  </span>
                )}
              </td>
              <td className="px-4 py-3 font-mono-data text-slate-600 whitespace-nowrap">{station.staffCount}</td>
              <td className="px-4 py-3 font-mono-data whitespace-nowrap">
                <span
                  className={
                    station.totalUnitsCount > 0 && station.activeUnitsCount === 0 ? 'text-red-600 font-bold' : 'text-slate-600'
                  }
                >
                  {station.activeUnitsCount} / {station.totalUnitsCount}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={() => onEdit(station)} className={iconButtonClass} aria-label="Sửa trạm" title="Sửa trạm">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(station)} className={iconButtonClass} aria-label="Xóa trạm" title="Xóa trạm">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
