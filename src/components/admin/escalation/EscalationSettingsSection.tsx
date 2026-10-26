import React, { useState } from 'react';
import { NumberSettingField, SettingsForm } from '../settings/SettingsForm';
import { draftToEscalation, escalationToDraft, sameSettings, type EscalationDraft } from '../settings/settingsDraft';
import { Notice, type NoticeState } from '../common/ui';
import { inputClass, labelClass } from '../common/styles';
import { useServiceQuery, useUnsavedChangesGuard } from '../common/hooks';
import {
  adminSettingsService,
  validateEscalationSettings,
  type EscalationSettings,
  type SettingsRecord,
} from '../../../services/admin/adminSettingsService';
import { getApiErrorMessage } from '../../../services/apiClient';

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Mô tả khung giờ đêm, nhận biết khung qua nửa đêm. */
function describeNightWindow(start: string, end: string): string | null {
  if (!start || !end || start === end) return null;
  return toMinutes(start) > toMinutes(end)
    ? `Từ ${start} hôm nay đến ${end} sáng hôm sau (qua nửa đêm).`
    : `Từ ${start} đến ${end} cùng ngày.`;
}

/** Ngưỡng chờ + mở rộng bán kính khi leo thang (GET/PUT /api/settings/escalation). */
export const EscalationSettingsSection: React.FC = () => {
  // Bán kính tối đa không được nhỏ hơn nấc cuối của tham số điều phối → tải cả hai.
  const query = useServiceQuery(async () => {
    const [escalation, dispatch] = await Promise.all([
      adminSettingsService.getEscalationSettings(),
      adminSettingsService.getDispatchSettings(),
    ]);
    return { escalation, dispatch };
  }, 'escalation-settings');
  // Thông báo "đã lưu" giữ ở đây vì form được dựng lại sau khi lưu.
  const [flash, setFlash] = useState<NoticeState>(null);

  if (query.error && !query.data) return <div className="p-4 sm:p-6"><Notice notice={{ kind: 'error', message: query.error }} /></div>;
  if (!query.data) return <div className="p-4 sm:p-6 text-sm text-slate-400">Đang tải cấu hình...</div>;

  return (
    <EscalationForm
      key={query.data.escalation.updatedAt ?? 'default'}
      record={query.data.escalation}
      dispatchStepsKm={query.data.dispatch.values.radiusStepsKm}
      initialNotice={flash}
      onSaved={(message) => {
        setFlash({ kind: 'success', message });
        query.reload();
      }}
    />
  );
};

const EscalationForm: React.FC<{
  record: SettingsRecord<EscalationSettings>;
  dispatchStepsKm: number[];
  initialNotice: NoticeState;
  onSaved: (message: string) => void;
}> = ({ record, dispatchStepsKm, initialNotice, onSaved }) => {
  const [draft, setDraft] = useState<EscalationDraft>(() => escalationToDraft(record.values));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(initialNotice);

  const values = draftToEscalation(draft);
  const errors = validateEscalationSettings(values, dispatchStepsKm);
  // So với bản đã qua draft (cùng thứ tự key, bỏ field thừa) — so thẳng record.values từ API luôn lệch.
  const dirty = !sameSettings(values, draftToEscalation(escalationToDraft(record.values)));
  const canSave = dirty && Object.keys(errors).length === 0;
  useUnsavedChangesGuard(dirty);

  const set = (key: keyof EscalationDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await adminSettingsService.updateEscalationSettings(values);
      onSaved('Đã lưu cấu hình leo thang.');
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    try {
      const defaults = await adminSettingsService.getDefaults();
      setDraft(escalationToDraft(defaults.escalation));
      setNotice({ kind: 'success', message: 'Đã điền giá trị mặc định. Bấm “Lưu cấu hình” để áp dụng.' });
    } catch (err) {
      setNotice({ kind: 'error', message: getApiErrorMessage(err) });
    }
  };

  const nightWindow = describeNightWindow(draft.nightStart, draft.nightEnd);

  return (
    <SettingsForm
      scopeNote={
        <>
          Escalation Daemon quét định kỳ: sự cố thuộc phạm vi của quy tắc đang bật mà chưa có đội nhận quá{' '}
          <span className="font-bold">ngưỡng chờ</span> dưới đây sẽ chuyển sang Leo thang, báo động tới Command Center và
          mở rộng bán kính tìm xe.
        </>
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
        setDraft(escalationToDraft(record.values));
        setNotice(null);
      }}
      onRestoreDefaults={handleRestoreDefaults}
    >
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Ngưỡng chờ đội nhận</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberSettingField
            label="Ban ngày"
            unit="phút"
            value={draft.dayThresholdMinutes}
            onChange={set('dayThresholdMinutes')}
            error={errors.dayThresholdMinutes}
            hint="Bước 0.5 phút."
          />
          <NumberSettingField
            label="Ban đêm"
            unit="phút"
            value={draft.nightThresholdMinutes}
            onChange={set('nightThresholdMinutes')}
            error={errors.nightThresholdMinutes}
            hint="Bước 0.5 phút."
          />
        </div>

        <div className="space-y-1.5">
          <span className={labelClass}>Khung giờ ban đêm (giờ Việt Nam)</span>
          <div className="flex items-center gap-2 max-w-sm">
            <input
              type="time"
              value={draft.nightStart}
              onChange={(e) => set('nightStart')(e.target.value)}
              aria-label="Giờ bắt đầu khung đêm"
              className={`${inputClass} font-mono-data ${errors.nightStart ? 'border-red-400' : ''}`}
            />
            <span className="text-slate-400">→</span>
            <input
              type="time"
              value={draft.nightEnd}
              onChange={(e) => set('nightEnd')(e.target.value)}
              aria-label="Giờ kết thúc khung đêm"
              className={`${inputClass} font-mono-data ${errors.nightEnd ? 'border-red-400' : ''}`}
            />
          </div>
          {errors.nightStart || errors.nightEnd ? (
            <p className="text-[11px] text-red-600">{errors.nightStart ?? errors.nightEnd}</p>
          ) : (
            nightWindow && <p className="text-[11px] text-slate-500">{nightWindow}</p>
          )}
        </div>
      </section>

      <section className="space-y-4 pt-5 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">Mở rộng bán kính khi leo thang</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberSettingField
            label="Hệ số mở rộng"
            unit="×"
            step={0.1}
            value={draft.radiusMultiplier}
            onChange={set('radiusMultiplier')}
            error={errors.radiusMultiplier}
            hint="Nhân với từng nấc bán kính tìm xe."
          />
          <NumberSettingField
            label="Bán kính tối đa"
            unit="km"
            value={draft.maxRadiusKm}
            onChange={set('maxRadiusKm')}
            error={errors.maxRadiusKm}
            hint="Bán kính sau khi nhân không vượt giá trị này."
          />
        </div>
      </section>
    </SettingsForm>
  );
};
