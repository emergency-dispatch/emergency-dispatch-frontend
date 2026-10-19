import React from 'react';
import { thClass } from '../common/styles';
import { ACTOR_ROLE_LABEL, AUDIT_ACTION_LABEL, AUDIT_GROUP_META, formatAuditTime } from './auditMeta';
import { AUDIT_ACTION_GROUP, type AuditTrailEntry } from '../../../types/auditTrail';

interface AuditTrailTableProps {
  entries: AuditTrailEntry[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (entry: AuditTrailEntry) => void;
}

export const AuditTrailTable: React.FC<AuditTrailTableProps> = ({ entries, loading, selectedId, onSelect }) => (
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
          <th className={thClass}>Tóm tắt</th>
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
          const group = AUDIT_GROUP_META[AUDIT_ACTION_GROUP[e.action]];
          const Icon = group.icon;
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
              <td className="px-4 py-3 font-mono-data text-xs text-slate-600 whitespace-nowrap">{formatAuditTime(e.at)}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="font-semibold text-slate-900">{e.actorName}</div>
                <div className="text-[11px] text-slate-500">{ACTOR_ROLE_LABEL[e.actorRole]}</div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold whitespace-nowrap ${group.badgeClass}`}
                >
                  <Icon className="w-3 h-3" />
                  {AUDIT_ACTION_LABEL[e.action]}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-slate-800 font-mono-data text-xs">{e.targetLabel}</div>
                {e.incidentId && e.targetType !== 'incident' && (
                  <div className="text-[11px] text-slate-500 font-mono-data">{e.incidentId}</div>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600 max-w-[360px]">
                <span className="line-clamp-2">{e.detail}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
