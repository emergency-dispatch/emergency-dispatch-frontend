import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings, Siren } from 'lucide-react';
import { IncidentAuditTab } from '../../components/admin/audit/IncidentAuditTab';
import { SystemAuditTab } from '../../components/admin/audit/SystemAuditTab';
import { useTranslation } from '../../i18n';

type AuditTab = 'incident' | 'system';

const TABS: { key: AuditTab; icon: React.ElementType }[] = [
  { key: 'incident', icon: Siren },
  { key: 'system', icon: Settings },
];

/** Audit Trail: nhật ký thao tác trên sự cố và nhật ký thao tác quản trị — cả hai chỉ đọc. Tab lưu ở ?tab=. */
const AuditTrailPage: React.FC = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab: AuditTab = params.get('tab') === 'system' ? 'system' : 'incident';

  const selectTab = (key: AuditTab) => {
    if (key === tab) return;
    // Đổi tab thì bỏ bộ lọc của tab cũ trên URL (hai tab dùng tham số khác nhau).
    setParams(key === 'system' ? { tab: 'system' } : {}, { replace: true });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {TABS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => selectTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 -mb-px border-b-2 text-sm font-semibold transition-colors ${
              tab === key ? 'border-red-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {t(`admin.monitoring.audit.tabs.${key}`)}
          </button>
        ))}
      </div>

      {/* key: mỗi tab giữ bộ lọc riêng, đổi tab là dựng lại từ đầu. */}
      {tab === 'system' ? <SystemAuditTab key="system" /> : <IncidentAuditTab key="incident" />}
    </div>
  );
};

export default AuditTrailPage;
