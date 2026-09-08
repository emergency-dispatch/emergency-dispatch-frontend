import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { StationRecord } from '../../../types/station';

interface StationsTableProps {
  stations: StationRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (station: StationRecord) => void;
  onDelete: (station: StationRecord) => void;
}

export const StationsTable: React.FC<StationsTableProps> = ({ stations, selectedId, onSelect, onEdit, onDelete }) => {
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="bg-slate-900/70 border-b border-slate-800 text-left">
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-400 font-bold">
              Tên trạm
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-400 font-bold">
              Địa chỉ
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-400 font-bold">
              Khu vực
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-400 font-bold">
              Bán kính
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-400 font-bold">
              Trạng thái
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-400 font-bold text-right">
              Hành động
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {stations.map((station) => (
            <tr
              key={station.id}
              onClick={() => onSelect(station.id)}
              className={`cursor-pointer transition-colors ${
                selectedId === station.id ? 'bg-blue-600/10' : 'hover:bg-slate-900/50'
              }`}
            >
              <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{station.name}</td>
              <td className="px-4 py-3 text-slate-400">{station.address}</td>
              <td className="px-4 py-3 text-slate-400 font-mono-data whitespace-nowrap">{station.area}</td>
              <td className="px-4 py-3 text-slate-400 font-mono-data whitespace-nowrap">
                {station.coverageRadiusKm} km
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${
                    station.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-700/60'
                      : 'bg-slate-700/30 text-slate-400 border-slate-600/60'
                  }`}
                >
                  {station.status === 'active' ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(station);
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-blue-400 hover:bg-blue-950/40 transition-colors"
                    aria-label="Sửa trạm"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(station);
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                    aria-label="Xóa trạm"
                  >
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
