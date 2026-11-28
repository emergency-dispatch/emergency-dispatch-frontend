import React from 'react';
import { useDispatchStore } from '../../../context/DispatchContext';
import { useTranslation } from '../../../i18n';

/**
 * BR-07: chấm "mới" cạnh số người cùng báo khi hệ thống vừa gộp thêm SOS trùng vào sự cố mà Operator chưa mở danh sách
 * báo cáo trùng (store `newLinkedReportIds`, xóa bằng `markLinkedReportsSeen`).
 */
export const NewLinkedDot: React.FC<{ incidentId: string }> = ({ incidentId }) => {
  const { t } = useTranslation();
  const { newLinkedReportIds } = useDispatchStore();
  if (!newLinkedReportIds.has(incidentId)) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600">
      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-red-500 motion-safe:animate-pulse" />
      {t('incidents.row.linkedNew')}
    </span>
  );
};
