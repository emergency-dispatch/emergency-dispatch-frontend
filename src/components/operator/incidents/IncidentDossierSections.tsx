import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  Building2,
  Eye,
  GitCompareArrows,
  Loader2,
  MapPin,
  Phone,
  TrafficCone,
  User,
} from 'lucide-react';
import { AudioEvidencePlayer } from '../../common/AudioEvidencePlayer';
import { HazardTagBadge } from '../../common/HazardTagBadge';
import { AiVotesPanel } from './AiVotesPanel';
import { aiVoteTally } from '../../../types/aiVote';
import { ConfidenceBadge } from './ConfidenceBadge';
import { IncidentMediaGallery } from './IncidentMediaGallery';
import { IncidentSupplementList } from './IncidentSupplementList';
import { SeverityBadge } from './SeverityBadge';
import { hasReporterPhone, type CancelCaseInput } from './cancelCaseInput';
import type { RevealedPhoneState } from '../../../hooks/useRevealPhone';
import {
  BLOCK_DURATION_OPTIONS,
  CANCELLATION_REASON_OPTIONS,
  INCIDENT_CATEGORY_META,
  LOW_CONFIDENCE_THRESHOLD,
} from '../../../data/incidentMock';
import { useDispatchStore } from '../../../context/DispatchContext';
import { incidentService } from '../../../services/incidentService';
import type { useIncidentSupplements } from '../../../hooks/useIncidentSupplements';
import type { BlockDuration, Incident } from '../../../types/incident';
import { dateLocale, useTranslation } from '../../../i18n';

/**
 * Các khối của hồ sơ một ca, dùng chung cho panel thẩm định và "Hồ sơ ca" (Live Map):
 * bằng chứng của người báo, kết quả AI, phần nhập lý do hủy ca.
 */

// Số thẻ nguy cơ hiện sẵn; phần còn lại gộp vào nút "+N".
const MAX_VISIBLE_TAGS = 4;
// Tiêu đề mục: chữ thường đậm; mono chỉ dành cho số liệu (tọa độ, biển số, %, đếm ngược).
const SECTION_HEADING = 'text-[13px] font-semibold text-slate-700 mb-1.5';

interface ReporterEvidenceProps {
  incident: Incident;
  supplements: ReturnType<typeof useIncidentSupplements>;
  phone: RevealedPhoneState;
  revealDisabled?: boolean;
  /** Hiện địa chỉ + trạm phụ trách. Panel thẩm định tắt vì đầu panel đã có địa chỉ. */
  showLocation?: boolean;
  /** Chèn ngay sau mô tả của người báo (VD đoạn AI mô tả ảnh) để đọc đối chiếu hai lời mô tả. */
  afterDescription?: React.ReactNode;
  /**
   * Panel thẩm định: ảnh nhỏ bên trái, ghi âm + người báo + hồ sơ y tế bên phải; mô tả thu còn 3 dòng — để ca thông thường
   * đọc hết bằng chứng mà không phải cuộn.
   */
  compact?: boolean;
}

/**
 * Đoạn văn dài thu gọn còn `lines` dòng; chỉ hiện "Xem thêm" khi chữ thật sự bị cắt (đo theo khung, không đoán theo số ký tự).
 */
const ClampedText: React.FC<{ text: string; className?: string; lines?: 3 | 4 }> = ({ text, className = '', lines = 4 }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const check = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    observer?.observe(el);
    return () => observer?.disconnect();
  }, [text, expanded, lines]);
  return (
    <>
      <p ref={ref} className={`${className} ${expanded ? '' : lines === 3 ? 'line-clamp-3' : 'line-clamp-4'}`}>
        {text}
      </p>
      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          {expanded ? t('incidents.drawer.showLess') : t('incidents.drawer.showMore')}
        </button>
      )}
    </>
  );
};

/** Bằng chứng của người báo: không đóng khung, đọc như hồ sơ. */
export const ReporterEvidence: React.FC<ReporterEvidenceProps> = ({
  incident,
  supplements,
  phone,
  revealDisabled = false,
  showLocation = true,
  afterDescription,
  compact = false,
}) => {
  const { t } = useTranslation();
  const hasPhone = hasReporterPhone(incident);
  // Ca Operator tạo từ điện thoại / bộ đàm…: không có người báo qua app nên thiếu ảnh, mô tả, số là bình thường → không để ô trống.
  const fromCitizen = incident.source === 'CitizenApp';
  const showGallery = fromCitizen || incident.media.length > 0;
  const gallery = showGallery && (
    <IncidentMediaGallery key={incident.id} media={incident.media} title={incident.title} compact={compact} />
  );

  // §55: ghi âm người báo gửi kèm (URL phát ký 5 phút).
  const audio = incident.audioItems && incident.audioItems.length > 0 && (
    <div className="space-y-2">
      {incident.audioItems.map((item) => (
        <AudioEvidencePlayer
          key={item.id}
          audio={item}
          compact
          resolvePlaybackUrl={() => incidentService.getAudioPlaybackUrl(incident.id, item.id)}
        />
      ))}
    </div>
  );

  const description = (fromCitizen || incident.description) && (
    <section>
      <h3 className={SECTION_HEADING}>{t('incidents.drawer.reporterDescription')}</h3>
      <ClampedText
        key={incident.id}
        text={incident.description}
        lines={compact ? 3 : 4}
        className="text-sm text-slate-600 leading-relaxed whitespace-pre-line break-words"
      />
    </section>
  );

  // §21.4: chỉ hiện khi người báo đã gửi thêm (hoặc tải lỗi).
  const supplementSection = (supplements.items.length > 0 || supplements.error) && (
    <section>
      <h3 className={`${SECTION_HEADING} text-amber-700`}>
        {t('incidents.supplements.heading', { count: supplements.items.length })}
      </h3>
      <IncidentSupplementList
        items={supplements.items}
        loading={supplements.loading}
        error={supplements.error}
        onReload={supplements.reload}
      />
    </section>
  );

  const reporter = (
    <div>
      <ul className={`divide-y divide-slate-100 border-y border-slate-100 text-slate-700 ${compact ? 'text-[13px]' : 'text-sm'}`}>
        <li className={`flex items-center gap-2.5 min-w-0 ${compact ? 'py-1.5' : 'py-2'}`}>
          <User className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">{incident.reporterName}</span>
        </li>
        {(fromCitizen || hasPhone) && (
          <li className={`flex items-center gap-2.5 min-w-0 ${compact ? 'py-1.5' : 'py-2'}`}>
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-mono-data truncate">{phone.revealed?.phone ?? incident.reporterPhone}</span>
            {hasPhone && !phone.revealed && (
              <button
                onClick={phone.reveal}
                disabled={phone.revealing || revealDisabled}
                className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 shrink-0"
              >
                {phone.revealing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                {t('incidents.drawer.revealPhone')}
              </button>
            )}
            {phone.revealed && (
              <span
                className="ml-auto text-[11px] text-slate-400 shrink-0 truncate"
                title={t('incidents.drawer.phoneRevealedAt', { time: phone.revealed.at.toLocaleTimeString(dateLocale()) })}
              >
                {compact
                  ? phone.revealed.at.toLocaleTimeString(dateLocale())
                  : t('incidents.drawer.phoneRevealedAt', { time: phone.revealed.at.toLocaleTimeString(dateLocale()) })}
              </span>
            )}
          </li>
        )}
        {showLocation && (
          <li className="flex items-start gap-2.5 py-2 min-w-0">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span className="break-words">{incident.area}</span>
          </li>
        )}
        {showLocation && incident.responsibleStationName && (
          <li className="flex items-center gap-2.5 py-2 min-w-0">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">
              {t('incidents.drawer.responsibleStation', { name: incident.responsibleStationName })}
            </span>
          </li>
        )}
      </ul>
      {incident.isOutOfServiceArea && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs text-red-700">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          {t('incidents.drawer.outOfArea')}
          {incident.distanceOutsideAreaKm != null &&
            t('incidents.drawer.outOfAreaDistance', {
              km: incident.distanceOutsideAreaKm.toLocaleString(dateLocale(), { maximumFractionDigits: 1 }),
            })}
          {t('incidents.drawer.outOfAreaSuffix')}
        </p>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-4 min-w-0">
        {/* Cạnh ảnh: ghi âm + người báo (cao xấp xỉ ảnh). */}
        {gallery ? (
          <div className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-3.5 items-start">
            {gallery}
            <div className="space-y-2.5 min-w-0">
              {audio}
              {reporter}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {audio}
            {reporter}
          </div>
        )}
        {description}
        {afterDescription}
        {supplementSection}
      </div>
    );
  }

  return (
    <div className="space-y-5 min-w-0">
      {gallery}
      {audio}
      {description}
      {afterDescription}
      {supplementSection}
      {reporter}
    </div>
  );
};

interface AiFindingsProps {
  incident: Incident;
  /** Ca đã duyệt (người hoặc AI): bỏ cảnh báo chỉ dành cho lúc thẩm định, bỏ loại + cấp (đã chốt, hiện ở đầu hồ sơ, không còn là ý kiến AI). */
  verified?: boolean;
}

/**
 * "AI nhận định" ở cột hiện trường của panel thẩm định: mọi điều AI nói về ca — tóm tắt (loại, độ tin cậy, cấp đề xuất,
 * phiếu 3 AI), thẻ nguy cơ, đoạn mô tả ảnh, nhận định ùn tắc, cảnh báo — gom trong một khối vạch chàm (màu việc của AI),
 * đọc liền sau lời người báo. AI lỗi → một câu hướng dẫn, không hiện số liệu rỗng hay câu dự phòng của backend.
 */
export const AiInsightBlock: React.FC<{ incident: Incident }> = ({ incident }) => {
  const { t } = useTranslation();
  const { incidentKindLabel } = useDispatchStore();
  const [showAllTags, setShowAllTags] = useState(false);
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const tally = incident.aiVotes ? aiVoteTally(incident.aiVotes) : null;
  const aiFailed = !incident.aiPending && incident.aiFailed;
  // Con số ước lượng (§46) không nói lên độ tin cậy → không cảnh báo thấp theo nó.
  const isLowConfidence =
    !incident.aiPending &&
    !aiFailed &&
    !incident.aiUnclassified &&
    incident.confidenceMeasured !== false &&
    incident.confidenceScore < LOW_CONFIDENCE_THRESHOLD;
  const warnings: Array<{ key: string; className: string; icon: typeof AlertTriangle; title: string; body: string }> = [];
  if (isLowConfidence) {
    warnings.push({
      key: 'low',
      className: 'text-amber-800',
      icon: AlertTriangle,
      title: t('incidents.drawer.lowConfidenceTitle'),
      body: t('incidents.drawer.lowConfidenceBody'),
    });
  }
  if (incident.aiFlags.preliminaryYolo) {
    warnings.push({
      key: 'yolo',
      className: 'text-amber-800',
      icon: AlertTriangle,
      title: t('incidents.drawer.preliminaryYoloTitle'),
      body: t('incidents.drawer.preliminaryYoloBody'),
    });
  }
  if (incident.aiFlags.engineDisagreement) {
    warnings.push({
      key: 'disagree',
      className: 'text-violet-800',
      icon: GitCompareArrows,
      title: t('incidents.drawer.engineDisagreementTitle'),
      body: t('incidents.drawer.engineDisagreementBody'),
    });
  }
  const jam = incident.trafficJam;

  return (
    <section aria-label={t('incidents.drawer.aiInsight')} className="border-l-2 border-indigo-400 pl-3.5 space-y-2">
      <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-indigo-900">
        <BrainCircuit className="w-4 h-4 text-indigo-600 shrink-0" />
        {t('incidents.drawer.aiInsight')}
      </h3>

      {incident.aiPending ? (
        <p className="flex items-center gap-1.5 text-sm text-slate-600">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-indigo-600" />
          {t('incidents.drawer.aiPendingTitle')}
        </p>
      ) : aiFailed ? (
        <p className="text-sm text-slate-600 leading-relaxed">{t('incidents.drawer.aiFailedInline')}</p>
      ) : (
        <>
          {warnings.map(({ key, className, icon: Icon, title, body }) => (
            <p key={key} className={`flex items-start gap-1.5 text-xs leading-relaxed ${className}`}>
              <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                <strong>{title}</strong>
                {body}
              </span>
            </p>
          ))}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <span
              className="inline-flex items-center gap-1 font-bold"
              style={{ color: category.color }}
              title={
                incident.needsEventType && incident.category !== 'unknown' ? t('incidents.drawer.suggestedFromSos') : undefined
              }
            >
              <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
              {incidentKindLabel(incident)}
            </span>
            <ConfidenceBadge
              score={incident.confidenceScore}
              measured={incident.confidenceMeasured}
              unreadable={incident.confidenceUnreadable}
            />
            <span className="inline-flex items-center gap-1 text-slate-500">
              {t('incidents.drawer.suggestedShort')}
              <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
            </span>
            {tally && (
              <span className={`font-semibold ${tally.agree > 1 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {t('incidents.aiVotes.title')}: {t('incidents.aiVotes.tally', tally)}
              </span>
            )}
          </div>

          {incident.hazardTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(showAllTags ? incident.hazardTags : incident.hazardTags.slice(0, MAX_VISIBLE_TAGS)).map((tag) => (
                <HazardTagBadge key={tag} tag={tag} />
              ))}
              {incident.hazardTags.length > MAX_VISIBLE_TAGS && (
                <button
                  type="button"
                  onClick={() => setShowAllTags((v) => !v)}
                  className="text-[10px] px-1.5 py-0.5 rounded-md border border-slate-200 bg-white font-semibold text-slate-500 hover:text-slate-700 hover:border-slate-300"
                >
                  {showAllTags ? t('incidents.drawer.hazardTagsLess') : `+${incident.hazardTags.length - MAX_VISIBLE_TAGS}`}
                </button>
              )}
            </div>
          )}

          {incident.aiSummary && (
            <div>
              <ClampedText
                key={incident.id}
                text={incident.aiSummary}
                lines={3}
                className="text-sm text-slate-600 leading-relaxed whitespace-pre-line break-words"
              />
              {incident.aiSummaryIsFallback && (
                <p className="text-[11px] text-slate-400 mt-1">{t('incidents.drawer.summaryFallback')}</p>
              )}
            </div>
          )}

          {jam && (
            <p className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed" title={jam.evidence ?? undefined}>
              <TrafficCone className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600" />
              <span className="line-clamp-2">
                <strong className="text-slate-700">{t(`incidents.traffic.status.${jam.status}`)}</strong>
                {jam.evidence ? ` — ${jam.evidence}` : ''}
              </span>
            </p>
          )}
        </>
      )}
    </section>
  );
};

/** Ý kiến của AI: một khối nền xám duy nhất, tách khỏi bằng chứng và quyết định. */
export const AiFindings: React.FC<AiFindingsProps> = ({ incident, verified = false }) => {
  const { t } = useTranslation();
  const { incidentKindLabel } = useDispatchStore();
  // Thẻ nguy cơ: mặc định chỉ hiện vài thẻ đầu, phần mô tả AI bên dưới đã nói chi tiết.
  const [showAllTags, setShowAllTags] = useState(false);
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  // AI lỗi / quá thời gian chờ: % tin cậy và cấp đề xuất vô nghĩa → báo rõ là AI thất bại, không phải "độ tin cậy thấp".
  const aiFailed = !incident.aiPending && incident.aiFailed;
  // Con số ước lượng (§46) không nói lên độ tin cậy → không cảnh báo thấp theo nó.
  const isLowConfidence =
    !incident.aiPending &&
    !aiFailed &&
    !incident.aiUnclassified &&
    incident.confidenceMeasured !== false &&
    incident.confidenceScore < LOW_CONFIDENCE_THRESHOLD;
  return (
    <>
      {!verified && aiFailed && (
        <div className="flex items-start gap-2 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-3 text-xs text-slate-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
          <span>
            <strong>{t('incidents.drawer.aiFailedTitle')}</strong>
            {t('incidents.drawer.aiFailedBody')}
          </span>
        </div>
      )}

      {!verified && isLowConfidence && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>{t('incidents.drawer.lowConfidenceTitle')}</strong>
            {t('incidents.drawer.lowConfidenceBody')}
          </span>
        </div>
      )}

      {!verified && !incident.aiPending && incident.aiFlags.preliminaryYolo && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>{t('incidents.drawer.preliminaryYoloTitle')}</strong>
            {t('incidents.drawer.preliminaryYoloBody')}
          </span>
        </div>
      )}

      {!verified && !incident.aiPending && incident.aiFlags.engineDisagreement && (
        <div className="flex items-start gap-2 rounded-xl border border-violet-300 bg-violet-50 px-3.5 py-3 text-xs text-violet-800">
          <GitCompareArrows className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>{t('incidents.drawer.engineDisagreementTitle')}</strong>
            {t('incidents.drawer.engineDisagreementBody')}
          </span>
        </div>
      )}

      <section className="rounded-xl bg-slate-50 p-4 space-y-3">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
          <BrainCircuit className="w-4 h-4 text-red-600 shrink-0" />
          {t('incidents.drawer.aiResult')}
        </h3>
        {incident.aiPending ? (
          <div className="flex items-start gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-xs text-slate-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mt-0.5 text-red-600" />
            <span>
              <strong>{t('incidents.drawer.aiPendingTitle')}</strong>
              {t('incidents.drawer.aiPendingBody')}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            {!verified && (
              <div>
                <p className="text-slate-500 mb-1">{t('incidents.drawer.eventType')}</p>
                <span className="inline-flex items-center gap-1 font-bold" style={{ color: category.color }}>
                  <CategoryIcon className="w-3.5 h-3.5" />
                  {incidentKindLabel(incident)}
                </span>
                {incident.needsEventType && incident.category !== 'unknown' && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{t('incidents.drawer.suggestedFromSos')}</p>
                )}
              </div>
            )}
            <div>
              <p className="text-slate-500 mb-1">{t('incidents.drawer.aiConfidence')}</p>
              {aiFailed ? (
                <span className="text-slate-400">—</span>
              ) : (
                <ConfidenceBadge
                  score={incident.confidenceScore}
                  measured={incident.confidenceMeasured}
                  unreadable={incident.confidenceUnreadable}
                />
              )}
            </div>
            {!verified && (
              <div>
                <p className="text-slate-500 mb-1">{t('incidents.drawer.suggestedLevel')}</p>
                {aiFailed ? (
                  <span className="text-slate-400">—</span>
                ) : (
                  <SeverityBadge severity={incident.severity} unclassified={incident.aiUnclassified} />
                )}
              </div>
            )}
            {incident.aiEngine && (
              <div className="min-w-0">
                <p className="text-slate-500 mb-1">{t('incidents.engine.label')}</p>
                <p className="font-semibold text-slate-700 truncate" title={incident.aiEngine.modelName}>
                  {incident.aiEngine.mode === 'legacy'
                    ? incident.aiEngine.modelName
                    : t(`incidents.engine.${incident.aiEngine.mode}`)}
                </p>
              </div>
            )}
            {incident.hazardTags.length > 0 && (
              <div className="col-span-2">
                <p className="text-slate-500 mb-1">{t('incidents.drawer.hazardTags')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(showAllTags ? incident.hazardTags : incident.hazardTags.slice(0, MAX_VISIBLE_TAGS)).map(
                    (tag) => (
                      <HazardTagBadge key={tag} tag={tag} />
                    )
                  )}
                  {incident.hazardTags.length > MAX_VISIBLE_TAGS && (
                    <button
                      type="button"
                      onClick={() => setShowAllTags((v) => !v)}
                      className="text-[10px] px-1.5 py-0.5 rounded-md border border-slate-200 bg-white font-semibold text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    >
                      {showAllTags
                        ? t('incidents.drawer.hazardTagsLess')
                        : `+${incident.hazardTags.length - MAX_VISIBLE_TAGS}`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {!incident.aiPending && <AiVotesPanel votes={incident.aiVotes} />}
        {incident.aiSummary && (
          <div className="border-t border-slate-200 pt-3">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words">
              {incident.aiSummary}
            </p>
            {incident.aiSummaryIsFallback && (
              <p className="text-[11px] text-slate-400 mt-1">{t('incidents.drawer.summaryFallback')}</p>
            )}
          </div>
        )}
      </section>
    </>
  );
};

/** Lý do hủy + ghi chú + chặn số người báo. */
export const CancelCaseFields: React.FC<{
  incident: Incident;
  value: CancelCaseInput;
  onChange: (value: CancelCaseInput) => void;
  /** Mặc định "Hủy ca báo khống" (lúc thẩm định). */
  title?: string;
}> = ({ incident, value, onChange, title }) => {
  const { t } = useTranslation();
  const hasPhone = hasReporterPhone(incident);
  return (
    <section className="space-y-2.5">
      <h3 className="text-[13px] font-semibold text-red-700">{title ?? t('incidents.drawer.rejectTitle')}</h3>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('incidents.drawer.rejectReasonGroup')}>
        {CANCELLATION_REASON_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value.code === opt.value}
            onClick={() => onChange({ ...value, code: opt.value })}
            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 ${
              value.code === opt.value
                ? 'bg-red-600 border-red-600 text-white'
                : 'bg-white border-red-200 text-slate-600 hover:border-red-300'
            }`}
          >
            {t(`enums.cancellationReason.${opt.value}`)}
          </button>
        ))}
      </div>
      <textarea
        value={value.note}
        onChange={(e) => onChange({ ...value, note: e.target.value })}
        placeholder={t('incidents.drawer.rejectNotePlaceholder')}
        rows={2}
        className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300"
      />
      {hasPhone && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={value.block}
              onChange={(e) => onChange({ ...value, block: e.target.checked })}
              className="w-4 h-4 accent-red-600"
            />
            {t('incidents.drawer.blockPhone', { phone: incident.reporterPhone })}
          </label>
          {value.block && (
            <select
              value={value.blockDuration}
              onChange={(e) => onChange({ ...value, blockDuration: e.target.value as BlockDuration })}
              className="text-sm bg-white border border-red-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              {BLOCK_DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t('incidents.drawer.blockFor', { duration: t(`enums.blockDuration.${opt.value}`) })}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </section>
  );
};
