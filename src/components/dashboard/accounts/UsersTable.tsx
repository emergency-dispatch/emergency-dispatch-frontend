import React from 'react';
import { RoleBadge } from './RoleBadge';
import type { UserAccount } from '../../../types/account';

interface UsersTableProps {
  users: UserAccount[];
  stationNameById: Map<string, string>;
  onToggleActive: (id: string) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({ users, stationNameById, onToggleActive }) => {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden overflow-x-auto bg-white shadow-xs">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Người dùng
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Vai trò
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Trạm
            </th>
            <th className="px-4 py-3 text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold">
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {user.avatarInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <RoleBadge role={user.role} />
              </td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                {user.stationId ? (stationNameById.get(user.stationId) ?? '—') : '—'}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onToggleActive(user.id)}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap transition-colors ${
                    user.active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${user.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {user.active ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
