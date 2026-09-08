import React from 'react';
import { Building2 } from 'lucide-react';
import { PagePlaceholder } from '../../../components/dashboard/PagePlaceholder';

export const StationsPage: React.FC = () => (
  <PagePlaceholder
    icon={Building2}
    title="Station & Resource Management"
    description="Quản lý danh mục trạm cứu hộ, phân bổ khu vực phụ trách và thời hạn bảo dưỡng."
  />
);
