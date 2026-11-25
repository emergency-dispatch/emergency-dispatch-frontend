import React from 'react';
import { CitizenAlertsSection } from '../../components/admin/settings/CitizenAlertsSection';
import { DuplicateDetectionSection } from '../../components/admin/settings/DuplicateDetectionSection';

/**
 * Hai chiều trao đổi với người dân: báo cáo gửi vào (tự gộp SOS trùng, BR-07) và thông báo gửi ra (§49). Hai API riêng
 * nên mỗi phần tự lưu.
 */
const CitizenReportSettingsPage: React.FC = () => (
  <div className="p-4 sm:p-6">
    <div className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-xs xl:grid-cols-2 xl:divide-x xl:divide-y-0">
      <DuplicateDetectionSection />
      <CitizenAlertsSection />
    </div>
  </div>
);

export default CitizenReportSettingsPage;
