import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { HIGH_CONFIDENCE_THRESHOLD, LOW_CONFIDENCE_THRESHOLD } from '../../../data/incidentMock';
import { useTranslation } from '../../../i18n';

interface ConfidenceBadgeProps {
  /** % tin cậy của AI (0–100). */
  score: number;
  /** false = không phải xác suất đo thật (logprob) → không hiện %. null / bỏ trống = không rõ nguồn (dữ liệu cũ). */
  measured?: boolean | null;
  /** §44: kết quả AI không đọc được → "—". */
  unreadable?: boolean;
}

/**
 * "AI 86%". Dưới ngưỡng thì đổi sang hổ phách kèm biểu tượng cảnh báo — gộp luôn cảnh báo
 * "Độ tin cậy thấp" vào đây thay vì thêm một badge riêng.
 */
export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ score, measured = null, unreadable = false }) => {
  const { t } = useTranslation();
  // §46: nguồn khác logprob (VD "heuristic" luôn 95%) không phải xác suất → chữ "Ước lượng" thay cho số.
  if (unreadable || measured === false) {
    return (
      <span
        className="inline-flex items-center text-xs font-semibold whitespace-nowrap shrink-0 text-slate-400 underline decoration-dotted cursor-help"
        title={t(unreadable ? 'incidents.confidence.unreadableTitle' : 'incidents.confidence.estimatedTitle')}
      >
        {unreadable ? '—' : t('incidents.badge.estimated')}
      </span>
    );
  }
  const isLow = score < LOW_CONFIDENCE_THRESHOLD;
  const tierClass = score >= HIGH_CONFIDENCE_THRESHOLD ? 'text-emerald-700' : isLow ? 'text-amber-700' : 'text-slate-600';

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 ${tierClass}`}
      title={isLow ? t('incidents.badge.lowConfidence') : t('incidents.badge.confidenceTitle', { score })}
    >
      {isLow && <AlertTriangle className="w-3.5 h-3.5" />}
      {t('incidents.badge.confidence', { score })}
    </span>
  );
};
