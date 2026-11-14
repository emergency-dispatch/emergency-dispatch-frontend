import React, { useState } from 'react';
import { Check, CircleAlert, Plus, X } from 'lucide-react';
import { NumberSettingField, SettingsForm } from './SettingsForm';
import {
  dispatchToDraft,
  draftToDispatch,
  sameSettings,
  toNumber,
  type DispatchDraft,
} from './settingsDraft';
import { Notice, type NoticeState } from '../common/ui';
import { inputClass, labelClass } from '../common/styles';
import { useServiceQuery, useUnsavedChangesGuard } from '../common/hooks';
import {
  AUTO_EXPIRE_HOURS,
  WEIGHT_SUM_TOLERANCE,
  adminSettingsService,
  validateDispatchSettings,
  type DispatchSettings,
  type SettingsRecord,
} from '../../../services/admin/adminSettingsService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { useTranslation } from '../../../i18n';

const WEIGHT_FIELDS = ['distance', 'stationLoad', 'activeMissions'] as const;
// Màu từng đoạn trên thanh tỷ lệ (chấm cùng màu ở nhãn ô nhập). Dùng sắc xám trung tính —
// chỉ chữ "Tổng" mang màu đúng/sai, để thanh không trông như một thông báo.
const WEIGHT_SEGMENT_CLASS: Record<(typeof WEIGHT_FIELDS)[number], string> = {
  distance: 'bg-slate-700 text-white',
  stationLoad: 'bg-slate-400 text-white',
  activeMissions: 'bg-slate-300 text-slate-700',
};

/**
 * Tham số gợi ý điều phối xe (GET/PUT /api/settings/dispatch). Nằm chung trang với cấu hình leo thang
 * (EscalationSettingsPage) vì nấc bán kính cuối bị chặn bởi bán kính tối đa khi leo thang.
 * reloadKey đổi (khung leo thang vừa lưu) → tải lại để kiểm tra theo bán kính tối đa mới; bản nháp được giữ.
 */
export const DispatchSettingsSection: React.FC<{ reloadKey?: number; onSaved?: () => void }> = ({
  reloadKey = 0,
  onSaved,
}) => {
  const { t } = useTranslation();
  // Nấc bán kính cuối không được vượt bán kính tối đa của cấu hình leo thang → tải cả hai.
  const query = useServiceQuery(async () => {
    const [dispatch, escalation] = await Promise.all([
      adminSettingsService.getDispatchSettings(),
      adminSettingsService.getEscalationSettings(),
    ]);
    return { dispatch, escalation };
  }, `dispatch-settings|${reloadKey}`);
  // Thông báo "đã lưu" giữ ở đây vì form được dựng lại sau khi lưu.
  const [flash, setFlash] = useState<NoticeState>(null);

  if (query.error && !query.data) return <Notice notice={{ kind: 'error', message: query.error }} />;
  if (!query.data) return <div className="text-sm text-slate-400">{t('admin.common.settings.loading')}</div>;

  return (
    <DispatchForm
      key={query.data.dispatch.updatedAt ?? 'default'}
      record={query.data.dispatch}
      maxRadiusKm={query.data.escalation.values.maxRadiusKm}
      initialNotice={flash}
      onSaved={(message) => {
        setFlash({ kind: 'success', message });
        query.reload();
        onSaved?.();
      }}
    />
  );
};

const DispatchForm: React.FC<{
  record: SettingsRecord<DispatchSettings>;
  maxRadiusKm: number;
  initialNotice: NoticeState;
  onSaved: (message: string) => void;
}> = ({ record, maxRadiusKm, initialNotice, onSaved }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<DispatchDraft>(() => dispatchToDraft(record.values));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(initialNotice);

  const values = draftToDispatch(draft);
  const errors = validateDispatchSettings(values, maxRadiusKm);
  // So với bản đã qua draft (cùng thứ tự key, bỏ field thừa) — so thẳng record.values từ API luôn lệch.
  const dirty = !sameSettings(values, draftToDispatch(dispatchToDraft(record.values)));
  const canSave = dirty && Object.keys(errors).length === 0;
  useUnsavedChangesGuard(dirty);

  const weightSum = WEIGHT_FIELDS.reduce((sum, key) => sum + (toNumber(draft[key]) || 0), 0);
  const weightSumOk = Math.abs(weightSum - 1) <= WEIGHT_SUM_TOLERANCE;

  const set = (key: Exclude<keyof DispatchDraft, 'radiusStepsKm'>) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const setStep = (index: number, value: string) =>
    setDraft((d) => ({ ...d, radiusStepsKm: d.radiusStepsKm.map((r, i) => (i === index ? value : r)) }));
  const removeStep = (index: number) =>
    setDraft((d) => ({ ...d, radiusStepsKm: d.radiusStepsKm.filter((_, i) => i !== index) }));
  const addStep = () =>
    setDraft((d) => {
      const last = toNumber(d.radiusStepsKm[d.radiusStepsKm.length - 1] ?? '') || 0;
      return { ...d, radiusStepsKm: [...d.radiusStepsKm, String(Math.min(maxRadiusKm, last + 5))] };
    });

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await adminSettingsService.updateDispatchSettings(values);
      onSaved(t('admin.settings.dispatch.saved'));
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    try {
      const defaults = await adminSettingsService.getDefaults();
      setDraft(dispatchToDraft(defaults.dispatch));
      setNotice({ kind: 'success', message: t('admin.common.settings.defaultsFilled') });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    }
  };

  return (
    <SettingsForm
      title={t('admin.settings.dispatch.sectionTitle')}
      embedded
      updatedAt={record.updatedAt}
      updatedByName={record.updatedByName}
      notice={notice}
      onCloseNotice={() => setNotice(null)}
      dirty={dirty}
      canSave={canSave}
      saving={saving}
      onSave={handleSave}
      onDiscard={() => {
        setDraft(dispatchToDraft(record.values));
        setNotice(null);
      }}
      onRestoreDefaults={handleRestoreDefaults}
      wide
    >
      {/* ≥ xl: hàng 1 = Trọng số (2/3) | Thời gian (1/3; ≥ 2xl: 3/5 | 2/5 để 2 ô thời gian nằm ngang); hàng 2 = dãy nấc bán kính rộng hết để không xuống dòng.
          Thứ tự DOM giữ như cũ cho màn hẹp (Trọng số → Nấc → Thời gian). */}
      <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-5 gap-5 xl:gap-0">
        <section className="space-y-3 xl:col-span-2 2xl:col-span-3 xl:row-start-1 xl:pr-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('admin.settings.dispatch.weightsTitle')}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono-data">
              {t('admin.settings.dispatch.weightsFormula')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {WEIGHT_FIELDS.map((key) => (
              <div key={key} className="space-y-1.5">
                <label className={`${labelClass} flex items-center gap-1.5`}>
                  <span aria-hidden className={`w-2 h-2 rounded-sm shrink-0 ${WEIGHT_SEGMENT_CLASS[key]}`} />
                  {t(`admin.settings.dispatch.weights.${key}`)}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={1}
                  step={0.05}
                  value={draft[key]}
                  onChange={(e) => set(key)(e.target.value)}
                  className={`${inputClass} font-mono-data ${errors.weights ? 'border-red-400' : ''}`}
                />
              </div>
            ))}
          </div>
          {/* Thanh tỷ lệ 3 trọng số: tổng < 1 → phần thiếu để trống; tổng > 1 → co lại cho vừa thanh. */}
          <div className="flex items-center gap-3">
            <div aria-hidden className="flex-1 flex h-4 rounded-full overflow-hidden bg-slate-100">
              {WEIGHT_FIELDS.map((key) => {
                const pct = (Math.max(0, toNumber(draft[key]) || 0) / Math.max(weightSum, 1)) * 100;
                return (
                  <div
                    key={key}
                    style={{ width: `${pct}%` }}
                    title={`${t(`admin.settings.dispatch.weights.${key}`)}: ${Math.round(pct)}%`}
                    className={`flex items-center justify-center text-[10px] font-mono-data font-semibold transition-[width] ${WEIGHT_SEGMENT_CLASS[key]}`}
                  >
                    {pct >= 10 && `${Math.round(pct)}%`}
                  </div>
                );
              })}
            </div>
            <span
              className={`flex items-center gap-1 shrink-0 text-xs font-mono-data font-bold ${
                weightSumOk ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {weightSumOk ? <Check className="w-3.5 h-3.5" /> : <CircleAlert className="w-3.5 h-3.5" />}
              {t('admin.settings.dispatch.weightSum')} {Number(weightSum.toFixed(3))} / 1
            </span>
          </div>
          {errors.weights && <p className="text-[11px] text-red-600">{errors.weights}</p>}
        </section>

        <section className="space-y-3 pt-5 border-t border-slate-100 xl:col-span-3 2xl:col-span-5 xl:row-start-2 xl:mt-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('admin.settings.dispatch.stepsTitle')}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('admin.settings.dispatch.stepsHint', { km: maxRadiusKm })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {draft.radiusStepsKm.map((step, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-slate-400">→</span>}
                <div className="flex items-stretch">
                  <div className="w-20">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      value={step}
                      onChange={(e) => setStep(i, e.target.value)}
                      aria-label={t('admin.settings.dispatch.stepLabel', { n: i + 1 })}
                      className={`${inputClass} rounded-r-none font-mono-data ${errors.radiusStepsKm ? 'border-red-400' : ''}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    disabled={draft.radiusStepsKm.length <= 1}
                    aria-label={t('admin.settings.dispatch.removeStep', { n: i + 1 })}
                    title={t('admin.settings.dispatch.removeStepTitle')}
                    className="px-2 rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 text-slate-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </React.Fragment>
            ))}
            <button
              type="button"
              onClick={addStep}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:border-red-400 hover:text-red-600"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('admin.settings.dispatch.addStep')}
            </button>
            <span className="text-xs text-slate-500">km</span>
          </div>
          {errors.radiusStepsKm && <p className="text-[11px] text-red-600">{errors.radiusStepsKm}</p>}
        </section>

        <section className="space-y-4 pt-5 border-t border-slate-100 xl:col-start-3 2xl:col-start-4 2xl:col-span-2 xl:row-start-1 xl:pt-0 xl:border-t-0 xl:pl-6 xl:border-l">
          <h3 className="text-sm font-bold text-slate-900">{t('admin.settings.dispatch.timeTitle')}</h3>
          {/* ≥ 2xl hai ô nằm ngang: subgrid để nhãn dài (xuống dòng, nhất là bản en) không làm lệch hàng ô nhập. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4 2xl:gap-y-0 2xl:[&>div]:grid 2xl:[&>div]:grid-rows-subgrid 2xl:[&>div]:row-span-3">
            <NumberSettingField
              label={t('admin.settings.dispatch.recovery')}
              unit={t('admin.settings.dispatch.minutesUnit')}
              value={draft.recoveryMinutes}
              onChange={set('recoveryMinutes')}
              error={errors.recoveryMinutes}
              hint={t('admin.settings.dispatch.recoveryHint')}
            />
            <NumberSettingField
              label={t('admin.settings.dispatch.autoExpire')}
              unit={t('admin.settings.dispatch.hoursUnit')}
              step={1}
              value={draft.autoExpireHours}
              onChange={set('autoExpireHours')}
              error={errors.autoExpireHours}
              hint={t('admin.settings.dispatch.autoExpireHint', AUTO_EXPIRE_HOURS)}
            />
          </div>
        </section>
      </div>
    </SettingsForm>
  );
};
