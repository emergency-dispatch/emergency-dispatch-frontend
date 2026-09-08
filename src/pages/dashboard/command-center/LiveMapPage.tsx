import React from 'react';
import { Map } from 'lucide-react';
import { PagePlaceholder } from '../../../components/dashboard/PagePlaceholder';

export const LiveMapPage: React.FC = () => (
  <PagePlaceholder
    icon={Map}
    title="Live Map Board"
    description="Bản đồ trung tâm cập nhật trạng thái mọi phương tiện cứu hộ (Available, En route, On scene) qua WebSocket."
  />
);
