import React, { useState } from 'react';
import { Truck, Wrench } from 'lucide-react';
import { MaintenanceBadge } from './MaintenanceBadge';
import type { AssetCategory, StationAsset } from '../../../types/station';

interface StationAssetsPanelProps {
  stationName: string;
  assets: StationAsset[];
}

export const StationAssetsPanel: React.FC<StationAssetsPanelProps> = ({ stationName, assets }) => {
  const [tab, setTab] = useState<AssetCategory>('vehicle');
  const filtered = assets.filter((a) => a.category === tab);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-slate-400">
          Danh mục xe / thiết bị — <span className="text-white font-semibold">{stationName}</span>
        </p>
        <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/60 p-1">
          <button
            onClick={() => setTab('vehicle')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === 'vehicle' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Xe cứu hộ
          </button>
          <button
            onClick={() => setTab('equipment')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === 'equipment' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Thiết bị
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-800/80">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-500">Không có dữ liệu</div>
        ) : (
          filtered.map((asset) => (
            <div key={asset.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{asset.name}</p>
                <p className="text-xs text-slate-500">{asset.type}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-mono-data text-slate-500 whitespace-nowrap">
                  Hạn: {new Date(asset.maintenanceDueDate).toLocaleDateString('vi-VN')}
                </span>
                <MaintenanceBadge dueDate={asset.maintenanceDueDate} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
