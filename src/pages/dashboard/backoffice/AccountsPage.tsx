import React, { useMemo, useState } from 'react';
import { ShieldCheck, Users } from 'lucide-react';
import { PermissionMatrix } from '../../../components/dashboard/accounts/PermissionMatrix';
import { UsersTable } from '../../../components/dashboard/accounts/UsersTable';
import { PERMISSIONS, defaultPermissionMatrix, userAccountsSeed } from '../../../data/accountMock';
import { stationRecordsSeed } from '../../../data/stationMock';
import type { PermissionMatrix as PermissionMatrixType, RoleId, UserAccount } from '../../../types/account';

type Tab = 'users' | 'permissions';

export const AccountsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserAccount[]>(userAccountsSeed);
  const [matrix, setMatrix] = useState<PermissionMatrixType>(defaultPermissionMatrix);

  const stationNameById = useMemo(() => new Map(stationRecordsSeed.map((s) => [s.id, s.name])), []);

  const handleToggleActive = (id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
  };

  const handleTogglePermission = (role: RoleId, permId: string) => {
    setMatrix((prev) => ({ ...prev, [role]: { ...prev[role], [permId]: !prev[role][permId] } }));
  };

  const handleToggleAllForRole = (role: RoleId, value: boolean) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: Object.fromEntries(PERMISSIONS.map((p) => [p.id, value])),
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
          <Users className="w-5 h-5 text-red-600" />
          Accounts & Roles
        </h1>

        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === 'users' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Người dùng
          </button>
          <button
            onClick={() => setTab('permissions')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === 'permissions' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Ma trận phân quyền
          </button>
        </div>
      </div>

      {tab === 'users' ? (
        <UsersTable users={users} stationNameById={stationNameById} onToggleActive={handleToggleActive} />
      ) : (
        <PermissionMatrix matrix={matrix} onToggle={handleTogglePermission} onToggleAllForRole={handleToggleAllForRole} />
      )}
    </div>
  );
};
