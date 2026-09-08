import React from 'react';
import { BarChart3 } from 'lucide-react';
import { PagePlaceholder } from '../../../components/dashboard/PagePlaceholder';

export const AnalyticsPage: React.FC = () => (
  <PagePlaceholder
    icon={BarChart3}
    title="Analytics & Heatmap Dashboard"
    description="Thống kê tần suất sự cố theo thời gian và bản đồ nhiệt các khu vực thường xảy ra sự cố."
  />
);
