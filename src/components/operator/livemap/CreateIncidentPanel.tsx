import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ImagePlus,
  Loader2,
  MapPin,
  PhoneIncoming,
  Trash2,
  X,
} from 'lucide-react';
import { CONFIRMABLE_CATEGORIES, INCIDENT_CATEGORY_META, SEVERITY_LEVEL_META } from '../../../data/incidentMock';
import { useDispatchStore } from '../../../context/DispatchContext';
import { mapboxService } from '../../../services/mapboxService';
import { AddressSearchField } from '../../admin/stations/AddressSearchField';
import { mediaService } from '../../../services/mediaService';
import { validatedInputClass, labelClass } from '../../admin/common/styles';
import { INCIDENT_SOURCE_ICON } from '../../../data/incidentSourceMeta';
import {
  EVENT_TYPE_FROM_CATEGORY,
  OPERATOR_INCIDENT_SOURCES,
  severityToBackend,
  type IncidentCategory,
  type OperatorIncidentSource,
  type SeverityLevel,
} from '../../../types/incident';
import type { NearbyIncident } from '../../../utils/nearbyIncidents';
import type { PickedPoint } from './MapPickLocation';
import i18n, { useTranslation } from '../../../i18n';

// Khớp CreateOperatorIncidentDtoValidator của backend.
const NOTES_MIN_LENGTH = 5;
const TITLE_MAX_LENGTH = 300;
const DESCRIPTION_MAX_LENGTH = 1000;
const ADDRESS_MAX_LENGTH = 500;
const MAX_MEDIA = 5;
const VN_PHONE = /^(0|\+84)[35789][0-9]{8}$/;
// Kênh có người báo tin trực tiếp → mở sẵn mục người báo.
const SOURCES_WITH_REPORTER: OperatorIncidentSource[] = ['PhoneCall', 'Radio'];

type ConfirmableCategory = Exclude<IncidentCategory, 'unknown'>;

export interface IncidentCreatedInfo {
  incidentId: string;
  title: string;
  message?: string;
  dispatchSucceeded: boolean | null;
  dispatchMessage?: string | null;
}

interface CreateIncidentPanelProps {
  position: PickedPoint | null;
  /** Vị trí tìm được từ ô địa chỉ → đặt ghim và bay camera tới. */
  onLocate: (point: PickedPoint) => void;
  nearby: NearbyIncident[];
  onViewIncident: (id: string) => void;
  onClose: () => void;
  /** `selectForDispatch` = bấm "Tạo & chọn xe": chọn sự cố mới để mở gợi ý xe. */
  onCreated: (info: IncidentCreatedInfo, selectForDispatch: boolean) => void;
}

const Section: React.FC<{ step: number; label: string; required?: boolean; error?: string | null; children: React.ReactNode }> = ({
  step,
  label,
  required,
  error,
  children,
}) => (
  <section className="space-y-2">
    <p className={`${labelClass} flex items-center gap-2`}>
      <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
        {step}
      </span>
      {label}
      {required && ' *'}
    </p>
    {children}
    {error && (
      <p role="alert" className="text-[11px] font-medium text-red-600">
        {error}
      </p>
    )}
  </section>
);

/**
 * Form tiếp nhận tin báo ngoài app (điện thoại, bộ đàm, camera…). Hiện bên trái Live Map, bản đồ vẫn thấy để
 * chọn vị trí và đối chiếu sự cố xung quanh. Sự cố được xác minh ngay theo loại / mức Operator chọn.
 */
export const CreateIncidentPanel: React.FC<CreateIncidentPanelProps> = ({
  position,
  onLocate,
  nearby,
  onViewIncident,
  onClose,
  onCreated,
}) => {
  const { createOperatorIncident } = useDispatchStore();
  const { t } = useTranslation();

  const [source, setSource] = useState<OperatorIncidentSource | null>(null);
  const [category, setCategory] = useState<ConfirmableCategory | null>(null);
  const [severity, setSeverity] = useState<SeverityLevel | null>(null);
  const [address, setAddress] = useState('');
  // Địa chỉ do Operator gõ thì không bị địa chỉ tra ngược từ ghim ghi đè.
  const addressTypedRef = useRef(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [notes, setNotes] = useState('');
  const [reporterOpen, setReporterOpen] = useState(false);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState<'create' | 'dispatch' | null>(null);
  const [error, setError] = useState<{ message: string; errors: string[] } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [duplicatesDismissed, setDuplicatesDismissed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ghim mới → tra ngược địa chỉ (chỉ khi Operator chưa tự gõ).
  useEffect(() => {
    if (!position || addressTypedRef.current) return;
    let cancelled = false;
    setResolvingAddress(true);
    mapboxService
      .reverseGeocode(position.lng, position.lat)
      .then((resolved) => !cancelled && !addressTypedRef.current && setAddress(resolved.slice(0, ADDRESS_MAX_LENGTH)))
      .finally(() => !cancelled && setResolvingAddress(false));
    return () => {
      cancelled = true;
    };
  }, [position?.lat, position?.lng]);

  // Ghim dời sang chỗ khác → cảnh báo trùng hiện lại.
  const nearbyKey = nearby.map((n) => n.incident.id).join(',');
  useEffect(() => setDuplicatesDismissed(false), [nearbyKey]);

  const dirty =
    !!position || !!source || !!category || !!severity || !!address.trim() || !!notes.trim() ||
    !!reporterName.trim() || !!reporterPhone.trim() || !!title.trim() || !!description.trim() || mediaUrls.length > 0;

  const requestClose = () => {
    if (dirty && !submitting) setConfirmDiscard(true);
    else onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || submitting) return;
      if (confirmDiscard) setConfirmDiscard(false);
      else requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleSourceChange = (next: OperatorIncidentSource) => {
    setSource(next);
    if (SOURCES_WITH_REPORTER.includes(next)) setReporterOpen(true);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_MEDIA - mediaUrls.length;
    const picked = Array.from(files).slice(0, room);
    if (picked.length === 0) return;
    setUploading(true);
    setUploadError(null);
    for (const file of picked) {
      try {
        const url = await mediaService.upload(file);
        setMediaUrls((prev) => [...prev, url]);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : i18n.t('liveMap.create.uploadFailed'));
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const notesLength = notes.trim().length;
  const phone = reporterPhone.trim();
  const errors = {
    location: !position ? t('liveMap.create.requiredLocation') : !address.trim() ? t('liveMap.create.requiredAddress') : null,
    source: !source ? t('liveMap.create.requiredSource') : null,
    category: !category ? t('liveMap.create.requiredType') : null,
    severity: !severity ? t('liveMap.create.requiredSeverity') : null,
    notes:
      notesLength < NOTES_MIN_LENGTH ? t('liveMap.create.notesMin', { min: NOTES_MIN_LENGTH, length: notesLength }) : null,
    phone: phone && !VN_PHONE.test(phone) ? t('liveMap.create.phoneInvalid') : null,
  };
  const shown = (key: keyof typeof errors) => (attempted || (key === 'phone' && phone.length >= 10) ? errors[key] : null);
  const valid = Object.values(errors).every((e) => !e);

  const submit = async (mode: 'create' | 'dispatch') => {
    setAttempted(true);
    if (!valid || !position || !source || !category || !severity) {
      if (errors.phone) setReporterOpen(true);
      return;
    }
    setSubmitting(mode);
    setError(null);
    const result = await createOperatorIncident({
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      latitude: position.lat,
      longitude: position.lng,
      locationAddress: address.trim(),
      source,
      eventType: EVENT_TYPE_FROM_CATEGORY[category],
      severity: severityToBackend(severity) as 'Level1' | 'Level2' | 'Level3',
      operatorNotes: notes.trim(),
      reporterName: reporterName.trim() || undefined,
      reporterPhone: phone || undefined,
      mediaUrls,
    });
    setSubmitting(null);
    if (!result.ok) {
      setError({ message: result.message, errors: result.errors });
      return;
    }
    onCreated(
      {
        incidentId: result.incidentId,
        title: title.trim() || address.trim(),
        message: result.message,
        dispatchSucceeded: result.dispatchSucceeded,
        dispatchMessage: result.dispatchMessage,
      },
      mode === 'dispatch'
    );
  };

  const SourceIcon = source ? INCIDENT_SOURCE_ICON[source] : PhoneIncoming;
  const showDuplicates = nearby.length > 0 && !duplicatesDismissed;

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200 relative">
      {/* Header */}
      <div className="shrink-0 px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <SourceIcon className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-900">
            {t('liveMap.create.title')}
            {source && <span className="text-red-600"> · {t(`enums.incidentSource.${source}`)}</span>}
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{t('liveMap.create.subtitle')}</p>
        </div>
        <button
          onClick={requestClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200 shrink-0"
          aria-label={t('common.close')}
          title={t('liveMap.create.closeHint')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            <p className="font-semibold">{error.message}</p>
            {error.errors.length > 0 && (
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {error.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Section step={1} label={t('liveMap.create.sectionLocation')} required error={shown('location')}>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
              position ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-dashed border-red-300 bg-red-50/50 text-red-700'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {position ? (
              <span className="font-mono-data">
                {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
              </span>
            ) : (
              <span className="font-semibold">{t('liveMap.create.noPosition')}</span>
            )}
          </div>
          <div className="relative">
            <AddressSearchField
              value={address}
              onChange={(value) => {
                addressTypedRef.current = value.trim().length > 0;
                setAddress(value);
              }}
              onPick={(suggestion) => {
                // Chọn gợi ý → giữ đúng địa chỉ đã chọn (không để tra ngược từ ghim ghi đè) và dời ghim tới đó.
                addressTypedRef.current = true;
                setAddress(suggestion.label.slice(0, ADDRESS_MAX_LENGTH));
                onLocate({ lat: suggestion.lat, lng: suggestion.lng });
              }}
              maxLength={ADDRESS_MAX_LENGTH}
              placeholder={resolvingAddress ? t('liveMap.create.resolvingAddress') : t('liveMap.create.addressPlaceholder')}
            />
            {resolvingAddress && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>
          <p className="text-[11px] text-slate-500">{t('liveMap.create.addressHint')}</p>

          {showDuplicates && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {t('liveMap.create.duplicateTitle', { count: nearby.length })}
              </p>
              {nearby.slice(0, 3).map(({ incident, distanceM, minutesAgo }) => (
                <div key={incident.id} className="flex items-center gap-2 text-[11px] text-amber-900">
                  <span className="flex-1 min-w-0 truncate">
                    <strong>{incident.title}</strong>
                    {' · '}
                    {t('liveMap.create.duplicateMeta', { distance: distanceM, minutes: minutesAgo })}
                  </span>
                  <button
                    type="button"
                    onClick={() => onViewIncident(incident.id)}
                    className="shrink-0 px-2 py-0.5 rounded border border-amber-300 bg-white font-semibold hover:bg-amber-100"
                  >
                    {t('liveMap.create.viewIncident')}
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDuplicatesDismissed(true)}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
              >
                {t('liveMap.create.notDuplicate')}
              </button>
            </div>
          )}
        </Section>

        <Section step={2} label={t('liveMap.create.sectionSource')} required error={shown('source')}>
          <div className="grid grid-cols-3 gap-1.5">
            {OPERATOR_INCIDENT_SOURCES.map((key) => {
              const Icon = INCIDENT_SOURCE_ICON[key];
              const active = source === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSourceChange(key)}
                  aria-pressed={active}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-[11px] font-bold transition-colors ${
                    active ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-300 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t(`enums.incidentSource.${key}`)}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section step={3} label={t('liveMap.create.sectionType')} required error={shown('category')}>
          <div className="grid grid-cols-2 gap-2">
            {CONFIRMABLE_CATEGORIES.map((key) => {
              const meta = INCIDENT_CATEGORY_META[key];
              const Icon = meta.icon;
              const active = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-xs font-bold transition-colors ${
                    active ? 'border-2' : 'border-slate-300 text-slate-500 hover:text-slate-900'
                  }`}
                  style={active ? { borderColor: meta.color, color: meta.color, backgroundColor: `${meta.color}12` } : undefined}
                >
                  <Icon className="w-5 h-5" />
                  {t(`enums.category.${key}`)}
                </button>
              );
            })}
          </div>
        </Section>

        <Section step={4} label={t('liveMap.create.sectionSeverity')} required error={shown('severity')}>
          <div className="grid grid-cols-3 gap-1.5">
            {([1, 2, 3] as SeverityLevel[]).map((level) => {
              const active = severity === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverity(level)}
                  aria-pressed={active}
                  className={`py-2 rounded-lg border text-xs font-bold transition-colors ${
                    active ? `${SEVERITY_LEVEL_META[level].badgeClass} ring-2 ring-offset-1 ring-current` : 'border-slate-300 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {t(`enums.severity.level${level}`)}
                </button>
              );
            })}
          </div>
        </Section>

        <Section step={5} label={t('liveMap.create.notes')} required error={shown('notes')}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder={t('liveMap.create.notesPlaceholder')}
            className={`${validatedInputClass(!!shown('notes'))} resize-none`}
          />
          {!shown('notes') && <p className="text-[11px] text-slate-500">{t('liveMap.create.notesHint')}</p>}
        </Section>

        {/* Người báo tin */}
        <div className="rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setReporterOpen((v) => !v)}
            aria-expanded={reporterOpen}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-slate-700"
          >
            <span>
              {t('liveMap.create.reporter')} <span className="font-normal text-slate-400">· {t('liveMap.create.optional')}</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${reporterOpen ? 'rotate-180' : ''}`} />
          </button>
          {reporterOpen && (
            <div className="px-3 pb-3 space-y-2.5">
              <input
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                maxLength={200}
                placeholder={t('liveMap.create.reporterNamePlaceholder')}
                aria-label={t('liveMap.create.reporterName')}
                className={validatedInputClass(false)}
              />
              <div className="space-y-1">
                <input
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value.replace(/[^\d+]/g, ''))}
                  inputMode="tel"
                  maxLength={12}
                  placeholder={t('liveMap.create.reporterPhonePlaceholder')}
                  aria-label={t('liveMap.create.reporterPhone')}
                  aria-invalid={!!shown('phone')}
                  className={`${validatedInputClass(!!shown('phone'))} font-mono-data`}
                />
                {shown('phone') && (
                  <p role="alert" className="text-[11px] font-medium text-red-600">
                    {shown('phone')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Thông tin thêm */}
        <div className="rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-slate-700"
          >
            <span>
              {t('liveMap.create.more')} <span className="font-normal text-slate-400">· {t('liveMap.create.optional')}</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
          </button>
          {moreOpen && (
            <div className="px-3 pb-3 space-y-2.5">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={TITLE_MAX_LENGTH}
                placeholder={t('liveMap.create.titlePlaceholder')}
                aria-label={t('liveMap.create.titleLabel')}
                className={validatedInputClass(false)}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={DESCRIPTION_MAX_LENGTH}
                placeholder={t('liveMap.create.descriptionPlaceholder')}
                aria-label={t('liveMap.create.description')}
                className={`${validatedInputClass(false)} resize-none`}
              />
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-600">
                  {t('liveMap.create.media', { count: mediaUrls.length, max: MAX_MEDIA })}
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {mediaUrls.map((url) => (
                    <div key={url} className="relative aspect-square rounded-md overflow-hidden bg-slate-100 group">
                      {/\.(mp4|mov|webm)(\?|$)/i.test(url) ? (
                        <video src={url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => setMediaUrls((prev) => prev.filter((u) => u !== url))}
                        aria-label={t('liveMap.create.removeMedia')}
                        className="absolute top-0.5 right-0.5 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {mediaUrls.length < MAX_MEDIA && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      aria-label={t('liveMap.create.addMedia')}
                      title={t('liveMap.create.addMedia')}
                      className="aspect-square rounded-md border border-dashed border-slate-300 text-slate-400 hover:text-slate-700 hover:border-slate-400 flex items-center justify-center disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  hidden
                  onChange={(e) => handleFiles(e.target.files)}
                />
                {uploadError && <p className="text-[11px] text-red-600">{uploadError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 p-3 border-t border-slate-200 grid grid-cols-[auto_1fr_1fr] gap-2">
        <button
          type="button"
          onClick={requestClose}
          disabled={!!submitting}
          className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={() => submit('create')}
          disabled={!!submitting || uploading}
          className="py-2.5 rounded-xl border border-red-600 text-red-700 hover:bg-red-50 font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {submitting === 'create' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {t('liveMap.create.submit')}
        </button>
        <button
          type="button"
          onClick={() => submit('dispatch')}
          disabled={!!submitting || uploading}
          className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {submitting === 'dispatch' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {t('liveMap.create.submitAndDispatch')}
        </button>
      </div>

      {/* Xác nhận bỏ dữ liệu đang nhập */}
      {confirmDiscard && (
        <div className="absolute inset-0 z-10 bg-slate-900/40 flex items-end" role="dialog" aria-modal="true">
          <div className="w-full bg-white rounded-t-2xl p-4 space-y-3 shadow-2xl">
            <p className="text-sm font-bold text-slate-900">{t('liveMap.create.discardTitle')}</p>
            <p className="text-xs text-slate-500">{t('liveMap.create.discardBody')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmDiscard(false)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                {t('liveMap.create.keepEditing')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                {t('liveMap.create.discard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
