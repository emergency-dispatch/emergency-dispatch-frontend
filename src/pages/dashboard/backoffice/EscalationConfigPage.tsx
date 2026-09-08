import React from 'react';
import { Settings2 } from 'lucide-react';
import { PagePlaceholder } from '../../../components/dashboard/PagePlaceholder';

export const EscalationConfigPage: React.FC = () => (
  <PagePlaceholder
    icon={Settings2}
    title="Escalation Logic Engine"
    description="Cấu hình quy tắc leo thang tự động: sự cố Cấp 4-5 không có đội tiếp nhận sau 5 phút sẽ báo động lên cấp quản lý cao hơn."
  />
);
