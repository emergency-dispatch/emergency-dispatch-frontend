import React, { useState } from 'react';
import { FlaskConical, Plus, X } from 'lucide-react';
import { NumberSettingField, SettingsForm } from '../../components/admin/settings/SettingsForm';
import {
  dispatchToDraft,
  draftToDispatch,
  sameSettings,
  toNumber,
  type DispatchDraft,
} from '../../components/admin/settings/settingsDraft';
import { Notice, type NoticeState } from '../../components/admin/common/ui';
import { inputClass, labelClass } from '../../components/admin/common/styles';
import { useServiceQuery, useUnsavedChangesGuard } from '../../components/admin/common/hooks';
import {
  WEIGHT_SUM_TOLERANCE,
  adminSettingsService,
  validateDispatchSettings,
  type DispatchSettings,
  type SettingsRecord,
} from '../../services/admin/adminSettingsService';
import { getApiErrorMessage } from '../../services/apiClient';
import { MAX_SEARCH_RADIUS_KM } from '../../data/dispatchConfig';

const WEIGHT_FIELDS: { key: 'distance' | 'stationLoad' | 'activeMissions'; label: string }[] = [
  { key: 'distance', label: 'Khoảng cách' },
  { key: 'stationLoad', label: 'Tải trạm' },
  { key: 'activeMissions', label: 'Nhiệm vụ đang chạy' },
];

const DispatchSettingsPage: React.FC = () => {
  const query = useServiceQuery(async () => ({ dispatch: await adminSettingsService.getDispatchSettings() }), 'dispatch-settings');
  // Thông báo "đã lưu" giữ ở cấp trang vì form được dựng lại sau khi lưu.
  const [flash, setFlash] = useState<NoticeState>(null);

  if (query.error && !query.data) return <div className="p-4 sm:p-6"><Notice notice={{ kind: 'error', message: query.error }} /></div>;
  if (!query.data) return <div className="p-4 sm:p-6 text-sm text-slate-400">Đang tải cấu hình...</div>;

  return (
    <DispatchForm
      key={query.data.dispatch.updatedAt ?? 'default'}
      record={query.data.dispatch}
      maxRadiusKm={MAX_SEARCH_RADIUS_KM}
      initialNotice={flash}
      onSaved={(message) => {
        setFlash({ kind: 'success', message });
        query.reload();
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
  const [draft, setDraft] = useState<DispatchDraft>(() => dispatchToDraft(record.values));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(initialNotice);

  const values = draftToDispatch(draft);
  const errors = validateDispatchSettings(values, maxRadiusKm);
  const dirty = !sameSettings(values, record.values);
  const canSave = dirty && Object.keys(errors).length === 0;
  useUnsavedChangesGuard(dirty);

  const weightSum = WEIGHT_FIELDS.reduce((sum, f) => sum + (toNumber(draft[f.key]) || 0), 0);
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
      onSaved('Đã lưu tham số điều phối.');
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    try {
      const defaults = await adminSettingsService.getDefaults();
      setDraft(dispatchToDraft(defaults.dispatch));
      setNotice({ kind: 'success', message: 'Đã điền giá trị mặc định. Bấm “Lưu cấu hình” để áp dụng.' });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    }
  };

  return (
    <SettingsForm
      scopeNote={
        <span className="inline-flex items-start gap-1.5">
          <FlaskConical className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Tham số gợi ý điều phối xe. Dùng cho thí nghiệm so sánh thuật toán Nearest-Available và Load-Aware (RQ2).
          </span>
        </span>
      }
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
    >
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Trọng số Load-Aware</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono-data">
            Cost = w₁ × khoảng cách + w₂ × tải trạm + w₃ × nhiệm vụ đang chạy
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {WEIGHT_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label className={labelClass}>{f.label}</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={1}
                step={0.05}
                value={draft[f.key]}
                onChange={(e) => set(f.key)(e.target.value)}
                className={`${inputClass} font-mono-data ${errors.weights ? 'border-red-400' : ''}`}
              />
            </div>
          ))}
        </div>
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-mono-data ${
            weightSumOk ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span>Tổng trọng số</span>
          <span className="font-bold">{Number(weightSum.toFixed(3))} / 1</span>
        </div>
        {errors.weights && <p className="text-[11px] text-red-600">{errors.weights}</p>}
      </section>

      <section className="space-y-3 pt-5 border-t border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Các nấc mở rộng bán kính tìm xe</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Không có xe phù hợp ở nấc hiện tại thì tìm ở nấc tiếp theo. Nấc cuối tối đa {maxRadiusKm} km (bán kính tìm
            xe tối đa của hệ thống).
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
                    aria-label={`Nấc ${i + 1} (km)`}
                    className={`${inputClass} rounded-r-none font-mono-data ${errors.radiusStepsKm ? 'border-red-400' : ''}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  disabled={draft.radiusStepsKm.length <= 1}
                  aria-label={`Bỏ nấc ${i + 1}`}
                  title="Bỏ nấc này"
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
            Thêm nấc
          </button>
          <span className="text-xs text-slate-500">km</span>
        </div>
        {errors.radiusStepsKm && <p className="text-[11px] text-red-600">{errors.radiusStepsKm}</p>}
      </section>

      <section className="space-y-4 pt-5 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">Thời gian</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberSettingField
            label="Chờ đội phản hồi"
            unit="giây"
            step={1}
            value={draft.crewAckTimeoutSeconds}
            onChange={set('crewAckTimeoutSeconds')}
            error={errors.crewAckTimeoutSeconds}
            hint="Quá hạn chưa Chấp nhận/Từ chối thì xe trả về trung tâm."
          />
          <NumberSettingField
            label="Hồi sức sau nhiệm vụ"
            unit="phút"
            value={draft.recoveryMinutes}
            onChange={set('recoveryMinutes')}
            error={errors.recoveryMinutes}
            hint="Sau khi nộp báo cáo, xe ở trạng thái Hồi sức trước khi Sẵn sàng."
          />
        </div>
      </section>
    </SettingsForm>
  );
};

export default DispatchSettingsPage;
