import React from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import type { EquipmentChecklistItem } from '../../../types/vehicleRecord';

interface EquipmentChecklistProps {
  items: EquipmentChecklistItem[];
  onToggle: (itemId: string) => void;
}

export const EquipmentChecklist: React.FC<EquipmentChecklistProps> = ({ items, onToggle }) => {
  const equippedCount = items.filter((i) => i.equipped).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono-data uppercase tracking-wider text-slate-500 font-bold">Checklist thiết bị</p>
        <span className="text-[11px] font-mono-data text-slate-400 whitespace-nowrap">
          {equippedCount}/{items.length} đầy đủ
        </span>
      </div>

      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${
              item.equipped
                ? 'border-slate-200 bg-white hover:border-slate-300'
                : 'border-red-200 bg-red-50 hover:border-red-300'
            }`}
          >
            {item.equipped ? (
              <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <CircleX className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className={`text-sm ${item.equipped ? 'text-slate-700' : 'text-red-700'}`}>{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
