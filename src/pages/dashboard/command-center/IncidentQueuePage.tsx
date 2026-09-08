import React from 'react';
import { ListChecks } from 'lucide-react';
import { PagePlaceholder } from '../../../components/dashboard/PagePlaceholder';

export const IncidentQueuePage: React.FC = () => (
  <PagePlaceholder
    icon={ListChecks}
    title="Incident Queue & Allocation Matrix"
    description="Hàng đợi sự cố ưu tiên với nhãn mối nguy và mức nghiêm trọng (Level 1-5) do AI gợi ý, hỗ trợ kéo-thả điều phối thủ công."
  />
);
