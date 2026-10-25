import React from 'react';
import { thClass } from '../common/styles';
import { actorRoleLabel, entityDisplayName, entityTypeMeta, formatAuditTime, systemActionMeta } from './auditMeta';
import type { SystemAuditLogDto } from '../../../types/auditTrail';

interface SystemAuditTableProps {
  entries: SystemAuditLogDto[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (entry: SystemAuditLogDto) => void;
}

export const SystemAuditTable: React.FC<SystemAuditTableProps> = ({ entries, loading, selectedId, onSelect }) => (
  <div
    className={`rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-xs transition-opacity ${
      loading ? 'opacity-60' : ''
    }`}
  >
    <table className="w-full text-sm min-w-[960px]">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-left">
          <th className={thClass}>Thời điểm</th>
          <th className={thClass}>Người thao tác</th>
          <th className={thClass}>Hành động</th>
          <th className={thClass}>Đối tượng</th>
          <th className={thClass}>Mô tả</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {entries.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
              {loading ? 'Đang tải...' : 'Không có bản ghi nào phù hợp.'}
            </td>
          </tr>
        )}
        {entries.map((e) => {
          const action = systemActionMeta(e.action);
          const ActionIcon = action.icon;
          const entity = entityTypeMeta(e.entityType);
          const EntityIcon = entity.icon;
          return (
            <tr
              key={e.id}
              onClick={() => onSelect(e)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  onSelect(e);
                }
              }}
              tabIndex={0}
              className={`cursor-pointer focus:outline-none focus:bg-red-50/50 ${
                selectedId === e.id ? 'bg-red-50/60' : 'hover:bg-slate-50'
              }`}
            >
              <td className="px-4 py-3 font-mono-data text-xs text-slate-600 whitespace-nowrap">{formatAuditTime(e.timestamp)}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="font-semibold text-slate-900">{e.actorName || '—'}</div>
                <div className="text-[11px] text-slate-500">{actorRoleLabel(e.actorRole)}</div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold whitespace-nowrap ${action.badgeClass}`}
                >
                  <ActionIcon className="w-3 h-3" />
                  {action.label}
                </span>
              </td>
              <td className="px-4 py-3 max-w-[240px]">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <EntityIcon className="w-3 h-3 shrink-0" />
                  {entity.label}
                </div>
                <div className="text-slate-800 text-xs truncate">{entityDisplayName(e.entityType, e.entityName)}</div>
              </td>
              <td className="px-4 py-3 text-xs text-slate-600 max-w-[360px]">
                <span className="line-clamp-2">{e.description || '—'}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
