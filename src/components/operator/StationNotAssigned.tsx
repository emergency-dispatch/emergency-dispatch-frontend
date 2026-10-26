import React from 'react';
import { Building2 } from 'lucide-react';
import { useTranslation } from '../../i18n';

/**
 * Vận hành theo trạm: tài khoản Operator chưa được Admin gán trạm phụ trách → backend trả 403 cho hàng đợi / bảng
 * điều phối. Hiện hướng dẫn thay vì báo lỗi tải.
 */
export const StationNotAssigned: React.FC<{ message: string }> = ({ message }) => {
  const { t } = useTranslation();
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-slate-500" />
        </div>
        <h2 className="text-base font-bold text-slate-900">{t('layout.stationNotAssigned.title')}</h2>
        <p className="text-sm text-slate-600">{message}</p>
        <p className="text-xs text-slate-500">{t('layout.stationNotAssigned.help')}</p>
      </div>
    </div>
  );
};
