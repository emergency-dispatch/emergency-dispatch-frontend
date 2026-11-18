import i18n from '../../../i18n';
import type { CompletionReportHistoryItemDto } from '../../../types/report';

/** Tên tổ nộp báo cáo; tổ đã giải thể ghi rõ vì tên có thể đã được tổ mới dùng lại (§40–41). */
export function reportTeamLabel(report: Pick<CompletionReportHistoryItemDto, 'stationTeamName' | 'stationTeamDeleted'>) {
  if (!report.stationTeamName) return i18n.t('admin.monitoring.completion.noTeam');
  return report.stationTeamDeleted
    ? i18n.t('admin.monitoring.completion.teamDisbanded', { name: report.stationTeamName })
    : report.stationTeamName;
}

/** Ảnh / video hiện trường: video mở bằng thẻ <video>, còn lại coi là ảnh. */
export const isVideoUrl = (url: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
