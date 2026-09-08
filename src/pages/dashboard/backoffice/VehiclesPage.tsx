import React from 'react';
import { Truck } from 'lucide-react';
import { PagePlaceholder } from '../../../components/dashboard/PagePlaceholder';

export const VehiclesPage: React.FC = () => (
  <PagePlaceholder
    icon={Truck}
    title="Vehicles & Equipment"
    description="Danh mục xe cứu hộ (xe cẩu, xe cứu thương...) và trang thiết bị chuyên dụng đi kèm từng xe."
  />
);
