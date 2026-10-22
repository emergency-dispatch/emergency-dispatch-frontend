import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { HIGH_CONFIDENCE_THRESHOLD, LOW_CONFIDENCE_THRESHOLD } from '../../../data/incidentMock';

interface ConfidenceBadgeProps {
  /** % tin cậy của AI (0–100). */
  score: number;
}

/**
 * "AI 86%". Dưới ngưỡng thì đổi sang hổ phách kèm biểu tượng cảnh báo — gộp luôn cảnh báo
 * "Độ tin cậy thấp" vào đây thay vì thêm một badge riêng.
 */
export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ score }) => {
  const isLow = score < LOW_CONFIDENCE_THRESHOLD;
  const tierClass = score >= HIGH_CONFIDENCE_THRESHOLD ? 'text-emerald-700' : isLow ? 'text-amber-700' : 'text-slate-600';

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 ${tierClass}`}
      title={isLow ? 'Độ tin cậy thấp — xem kỹ ảnh/video trước khi duyệt' : `AI tin cậy ${score}%`}
    >
      {isLow && <AlertTriangle className="w-3.5 h-3.5" />}
      AI {score}%
    </span>
  );
};
