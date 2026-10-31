import React from 'react';
import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { findAdminNavItem } from '../../components/admin/adminNav';
import { useTranslation } from '../../i18n';

// Trang tạm cho các màn Admin chưa làm — tiêu đề lấy theo mục sidebar của route hiện tại.
const AdminPlaceholderPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const item = findAdminNavItem(location.pathname);
  const Icon = item?.icon ?? Construction;

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
        <Icon className="w-5 h-5 text-red-600" />
        {item ? t(`admin.layout.nav.${item.key}`) : t('admin.layout.systemAdmin')}
      </h2>
      <div className="mt-6 p-8 sm:p-12 rounded-2xl border border-dashed border-slate-300 bg-white text-center">
        <Construction className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="mt-3 text-sm font-semibold text-slate-600">{t('admin.layout.underDevelopment')}</p>
      </div>
    </div>
  );
};

export default AdminPlaceholderPage;
