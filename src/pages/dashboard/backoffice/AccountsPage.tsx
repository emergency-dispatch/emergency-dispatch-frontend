import React from 'react';
import { Users } from 'lucide-react';
import { PagePlaceholder } from '../../../components/dashboard/PagePlaceholder';

export const AccountsPage: React.FC = () => (
  <PagePlaceholder
    icon={Users}
    title="Accounts & Roles"
    description="Quản lý tài khoản người dùng và phân quyền (RBAC) cho điều hành viên, quản trị viên và đội cứu hộ."
  />
);
