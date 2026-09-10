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
    <div className="rounded-xl border border-slate-200 overflow-hidden overflow-x-auto bg-white shadow-xs">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Tên trạm
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Địa chỉ
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Khu vực
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Bán kính
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Trạng thái
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold text-right">
              Hành động
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {stations.map((station) => (
            <tr
              key={station.id}
              onClick={() => onSelect(station.id)}
              className={`cursor-pointer transition-colors ${
                selectedId === station.id ? 'bg-red-50' : 'hover:bg-slate-50'
              }`}
            >
              <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{station.name}</td>
              <td className="px-4 py-3 text-slate-500">{station.address}</td>
              <td className="px-4 py-3 text-slate-500 font-mono-data whitespace-nowrap">{station.area}</td>
              <td className="px-4 py-3 text-slate-500 font-mono-data whitespace-nowrap">
                {station.coverageRadiusKm} km
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${
                    station.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
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
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Sửa trạm"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(station);
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
