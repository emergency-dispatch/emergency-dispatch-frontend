import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  Building2,
  ChevronDown,
  Eye,
  GitCompareArrows,
  Loader2,
  MapPin,
  Phone,
  TrafficCone,
  User,
} from 'lucide-react';
import { AudioEvidencePlayer } from '../../common/AudioEvidencePlayer';
import { aiVoteTally } from '../../../types/aiVote';
import { AiVotesPanel } from './AiVotesPanel';
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
   * Panel thẩm định: ảnh rộng hết cột (cao tối đa ~1/3 màn hình), dưới là một dải ghi âm + người báo; mô tả thu còn 3 dòng —
   * để ca thông thường đọc hết bằng chứng mà không phải cuộn.
   */
  compact?: boolean;
}

/**
 * Đoạn văn dài thu gọn còn `lines` dòng; chỉ hiện "Xem thêm" khi chữ thật sự bị cắt (đo theo khung, không đoán theo số ký tự).
 */
const CLAMP_CLASS = { 2: 'line-clamp-2', 3: 'line-clamp-3', 4: 'line-clamp-4' } as const;

const ClampedText: React.FC<{ text: string; className?: string; lines?: 2 | 3 | 4 }> = ({ text, className = '', lines = 4 }) => {
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
      <p ref={ref} className={`${className} ${expanded ? '' : CLAMP_CLASS[lines]}`}>
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
      <ul className="divide-y divide-slate-100 border-y border-slate-100 text-sm text-slate-700">
        <li className="flex items-center gap-2.5 py-2 min-w-0">
          <User className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">{incident.reporterName}</span>
        </li>
        {(fromCitizen || hasPhone) && (
          <li className="flex items-center gap-2.5 py-2 min-w-0">
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
                {t('incidents.drawer.phoneRevealedAt', { time: phone.revealed.at.toLocaleTimeString(dateLocale()) })}
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
    // Một dải dưới ảnh: ghi âm (nếu có) + tên + số người báo.
    const reporterInline = (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-slate-700 min-w-0">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <User className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">{incident.reporterName}</span>
        </span>
        {(fromCitizen || hasPhone) && (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-mono-data truncate">{phone.revealed?.phone ?? incident.reporterPhone}</span>
            {hasPhone && !phone.revealed && (
              <button
                onClick={phone.reveal}
                disabled={phone.revealing || revealDisabled}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 shrink-0"
              >
                {phone.revealing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                {t('incidents.drawer.revealPhone')}
              </button>
            )}
            {phone.revealed && (
              <span
                className="text-[11px] text-slate-400 shrink-0"
                title={t('incidents.drawer.phoneRevealedAt', { time: phone.revealed.at.toLocaleTimeString(dateLocale()) })}
              >
                {phone.revealed.at.toLocaleTimeString(dateLocale())}
              </span>
            )}
          </span>
        )}
      </div>
    );
    return (
      <div className="space-y-4 min-w-0">
        {gallery}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          {audio}
          {reporterInline}
        </div>
        {incident.isOutOfServiceArea && (
          <p className="flex items-start gap-1.5 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {t('incidents.drawer.outOfArea')}
            {incident.distanceOutsideAreaKm != null &&
              t('incidents.drawer.outOfAreaDistance', {
                km: incident.distanceOutsideAreaKm.toLocaleString(dateLocale(), { maximumFractionDigits: 1 }),
              })}
            {t('incidents.drawer.outOfAreaSuffix')}
          </p>
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

/**
 * "AI nhận định" ở cột hiện trường của panel thẩm định: mọi điều AI nói về ca — tóm tắt (loại, độ tin cậy, cấp đề xuất,
 * phiếu 3 AI), đoạn mô tả ảnh, nhận định ùn tắc, cảnh báo — gom trong một khối vạch chàm (màu việc của AI),
 * đọc liền sau lời người báo. AI lỗi → một câu hướng dẫn, không hiện số liệu rỗng hay câu dự phòng của backend.
 */
export const AiInsightBlock: React.FC<{
  incident: Incident;
  /**
   * Hồ sơ ca đã duyệt: bỏ cảnh báo (chỉ dành cho lúc thẩm định); thêm dòng
   * "Đã xác nhận … — khác nhận định AI" khi loại / cấp Operator chốt khác AI.
   */
  verified?: boolean;
}> = ({ incident, verified = false }) => {
  const { t } = useTranslation();
  const { incidentKindLabel } = useDispatchStore();
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const tally = incident.aiVotes ? aiVoteTally(incident.aiVotes) : null;
  // Bảng phiếu từng AI (loại · cấp · %): Hồ sơ ca rộng chỗ → mở sẵn; panel thẩm định chật → bấm dòng tổng để mở.
  const [showVotes, setShowVotes] = useState(verified);
  const verdict = incident.aiVerdict;
  // Không có nhận định dùng được (AI lỗi / quá thời gian / không đọc được kết quả) → một câu hướng dẫn.
  const aiFailed = !incident.aiPending && (incident.aiFailed || !verdict);
  const aiCategory = verdict?.category ?? null;
  const aiMeta = aiCategory ? INCIDENT_CATEGORY_META[aiCategory] : null;
  const AiIcon = aiMeta?.icon;
  // Ca đã duyệt mà loại / cấp chốt khác AI → ghi rõ để người xem lại biết đó là quyết định của người.
  const confirmedDiffers =
    verified &&
    !!verdict &&
    (verdict.category !== (incident.category === 'unknown' ? null : incident.category) ||
      verdict.severity !== incident.severity);
  // Con số ước lượng (§46) không nói lên độ tin cậy → không cảnh báo thấp theo nó.
  const isLowConfidence =
    !verified &&
    !!aiCategory &&
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
  if (!verified && incident.aiFlags.preliminaryYolo) {
    warnings.push({
      key: 'yolo',
      className: 'text-amber-800',
      icon: AlertTriangle,
      title: t('incidents.drawer.preliminaryYoloTitle'),
      body: t('incidents.drawer.preliminaryYoloBody'),
    });
  }
  if (!verified && incident.aiFlags.engineDisagreement) {
    warnings.push({
      key: 'disagree',
      className: 'text-violet-800',
      icon: GitCompareArrows,
      title: t('incidents.drawer.engineDisagreementTitle'),
      body: t('incidents.drawer.engineDisagreementBody'),
    });
  }
  const jam = incident.trafficJam;
  // Nhận định của AI (Nghi ngờ / Bất đồng / Chưa xác minh) chỉ hiện nhãn + icon: câu căn cứ của backend nặng tên mô hình,
  // không giúp Operator quyết định. Đã có người chốt (Xác nhận / Bác bỏ) thì hiện câu đó vì có ghi chú của Operator.
  const jamEvidence = jam?.reviewed ? jam.evidence?.trim() || null : null;

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

          {aiCategory && aiMeta && AiIcon && verdict ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              <span className="inline-flex items-center gap-1 font-bold" style={{ color: aiMeta.color }}>
                <AiIcon className="w-3.5 h-3.5 shrink-0" />
                {t(`enums.category.${aiCategory}`)}
              </span>
              {/* % chỉ có nghĩa khi AI thấy Cháy / Tai nạn: là độ chắc chắn của chính nhận định đó. */}
              <ConfidenceBadge
                score={incident.confidenceScore}
                measured={incident.confidenceMeasured}
                unreadable={incident.confidenceUnreadable}
              />
              <span className="inline-flex items-center gap-1 text-slate-500">
                {t('incidents.drawer.suggestedShort')}
                <SeverityBadge severity={verdict.severity ?? 1} unclassified={verdict.severity === null} />
              </span>
              {tally && (
                <button
                  type="button"
                  onClick={() => setShowVotes((v) => !v)}
                  aria-expanded={showVotes}
                  className={`inline-flex items-center gap-0.5 font-semibold rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                    tally.agree > 1 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {t('incidents.aiVotes.title')}: {t('incidents.aiVotes.tally', tally)}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showVotes ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          ) : (
            // AI không thấy sự cố: không hiện % (con số lúc này là AI chắc "không có gì", dễ đọc nhầm).
            <p className="text-sm font-semibold text-slate-700">{t('incidents.drawer.aiNoIncident')}</p>
          )}

          {showVotes && <AiVotesPanel votes={incident.aiVotes} />}

          {!verified && !aiCategory && incident.needsEventType && incident.category !== 'unknown' && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              {t('incidents.drawer.reporterChose')}
              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: category.color }}>
                <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
                {t(`enums.category.${incident.category}`)}
              </span>
            </p>
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
            <div className="flex items-start gap-1.5">
              <TrafficCone className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">{t(`incidents.traffic.status.${jam.status}`)}</p>
                {jamEvidence && (
                  <ClampedText
                    key={incident.id}
                    text={jamEvidence}
                    lines={2}
                    className="text-xs text-slate-600 leading-relaxed break-words"
                  />
                )}
              </div>
            </div>
          )}

          {confirmedDiffers && (
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">{t('incidents.drawer.confirmedLabel')}</span>
              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: category.color }}>
                <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
                {incidentKindLabel(incident)}
              </span>
              <SeverityBadge severity={incident.severity} />
              <span className="text-slate-500">{t('incidents.drawer.differsFromAi')}</span>
            </p>
          )}
        </>
      )}
    </section>
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
