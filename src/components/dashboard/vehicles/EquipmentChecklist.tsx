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
        <p className="text-xs font-mono-data uppercase tracking-wider text-slate-400 font-bold">Checklist thiết bị</p>
        <span className="text-[11px] font-mono-data text-slate-500 whitespace-nowrap">
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
                ? 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                : 'border-red-900/60 bg-red-950/20 hover:border-red-800'
            }`}
          >
            {item.equipped ? (
              <CircleCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <CircleX className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className={`text-sm ${item.equipped ? 'text-slate-300' : 'text-red-300'}`}>{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
