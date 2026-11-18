import React from 'react';
import { useTranslation } from '../../../i18n';

/**
 * §38: mã sự cố hiển thị (SC-yyMMdd-NNNN) — thay cho Guid khi Operator trao đổi qua bộ đàm / điện thoại.
 * Cỡ chữ / màu kế thừa từ chỗ đặt; backend cũ chưa có mã → không hiện gì.
 */
export const IncidentCode: React.FC<{ code: string | null | undefined; className?: string }> = ({ code, className = '' }) => {
  const { t } = useTranslation();
  if (!code) return null;
  return (
    <span title={t('incidents.code.label')} className={`font-mono-data tabular-nums whitespace-nowrap shrink-0 ${className}`}>
      {code}
    </span>
  );
};
