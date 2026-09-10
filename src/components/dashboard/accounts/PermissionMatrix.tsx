import React from 'react';
import { Check } from 'lucide-react';
import { PERMISSIONS, ROLE_META, ROLE_ORDER } from '../../../data/accountMock';
import type { PermissionMatrix as PermissionMatrixType, RoleId } from '../../../types/account';

interface PermissionMatrixProps {
  matrix: PermissionMatrixType;
  onToggle: (role: RoleId, permissionId: string) => void;
  onToggleAllForRole: (role: RoleId, value: boolean) => void;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ matrix, onToggle, onToggleAllForRole }) => {
  const groups = Array.from(new Set(PERMISSIONS.map((p) => p.group)));

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px] border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 bg-slate-50/95 backdrop-blur px-4 py-3 text-left text-[11px] font-mono-data uppercase tracking-wider text-slate-500 font-bold z-10 min-w-[240px]">
                Quyền hạn
              </th>
              {ROLE_ORDER.map((role) => {
                const meta = ROLE_META[role];
                const allChecked = PERMISSIONS.every((p) => matrix[role][p.id]);

                return (
                  <th key={role} className="px-3 py-3 text-center min-w-[128px]">
                    <div className="space-y-1.5">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono-data whitespace-nowrap"
                        style={{ color: meta.color, backgroundColor: `${meta.color}1A` }}
                      >
                        {meta.label}
                      </span>
                      <button
                        onClick={() => onToggleAllForRole(role, !allChecked)}
                        className="block mx-auto text-[10px] font-mono-data text-slate-400 hover:text-slate-900 transition-colors underline decoration-dotted underline-offset-2"
                      >
                        {allChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <React.Fragment key={group}>
                <tr>
                  <td
                    colSpan={ROLE_ORDER.length + 1}
                    className="sticky left-0 bg-slate-100 px-4 py-1.5 text-[10px] font-mono-data uppercase tracking-widest text-red-600 font-bold border-y border-slate-200"
                  >
                    {group}
                  </td>
                </tr>
                {PERMISSIONS.filter((p) => p.group === group).map((perm) => (
                  <tr key={perm.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                    <td className="sticky left-0 bg-white group-hover:bg-slate-50 px-4 py-2.5 text-slate-700 text-sm whitespace-nowrap z-10">
                      {perm.label}
                    </td>
                    {ROLE_ORDER.map((role) => {
                      const checked = matrix[role][perm.id];
                      return (
                        <td key={role} className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => onToggle(role, perm.id)}
                            aria-label={`${checked ? 'Tắt' : 'Bật'} quyền ${perm.label} cho ${ROLE_META[role].label}`}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-colors ${
                              checked
                                ? 'bg-red-600 border-red-500'
                                : 'bg-white border-slate-300 hover:border-slate-400'
                            }`}
                          >
                            {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
