import React from 'react';
import { ROLE_META } from '../../../data/accountMock';
import type { RoleId } from '../../../types/account';

interface RoleBadgeProps {
  role: RoleId;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const meta = ROLE_META[role];

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap"
      style={{ color: meta.color, borderColor: `${meta.color}55`, backgroundColor: `${meta.color}1A` }}
    >
      {meta.label}
    </span>
  );
};
