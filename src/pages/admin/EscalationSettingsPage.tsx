import React, { useState } from 'react';
import { BellRing } from 'lucide-react';
import { NumberSettingField, SettingsForm } from '../../components/admin/settings/SettingsForm';
import {
  draftToEscalation,
  escalationToDraft,
  sameSettings,
  type EscalationDraft,
} from '../../components/admin/settings/settingsDraft';
import { Notice, type NoticeState } from '../../components/admin/common/ui';
import { inputClass, labelClass } from '../../components/admin/common/styles';
import { useServiceQuery, useUnsavedChangesGuard } from '../../components/admin/common/hooks';
import {
  adminSettingsService,
  validateEscalationSettings,
  type EscalationSettings,
  type SettingsRecord,
} from '../../services/admin/adminSettingsService';
import { getApiErrorMessage } from '../../services/apiClient';

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

const EscalationSettingsPage: React.FC = () => {
  const query = useServiceQuery(async () => {
    const [escalation, dispatch] = await Promise.all([
      adminSettingsService.getEscalationSettings(),
      adminSettingsService.getDispatchSettings(),
    ]);
    return { escalation, dispatch };
  }, 'escalation-settings');
  // Thông báo "đã lưu" giữ ở cấp trang vì form được dựng lại sau khi lưu.
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
  const dirty = !sameSettings(values, record.values);
  const canSave = dirty && Object.keys(errors).length === 0;
  useUnsavedChangesGuard(dirty);

  const set = (key: keyof EscalationDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await adminSettingsService.updateEscalationSettings(values);
      onSaved('Đã lưu cấu hình leo thang.'); // nạp lại → form mới (key = updatedAt) với giá trị vừa lưu
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
          <span className="font-bold">Áp dụng cho sự cố Cấp 3.</span> Sự cố Cấp 3 chưa có đội nhận quá ngưỡng chờ sẽ
          chuyển sang trạng thái leo thang: gửi cảnh báo và mở rộng bán kính tìm xe.
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
          <span className={labelClass}>Khung giờ ban đêm</span>
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

      <section className="space-y-2 pt-5 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">Người nhận cảnh báo</h3>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">
          <BellRing className="w-4 h-4 text-red-600 shrink-0" />
          Trưởng trạm của các trạm trong bán kính tìm xe
        </div>
        <p className="text-[11px] text-slate-500">Cố định theo quy trình, không chỉnh được. Admin không nhận cảnh báo leo thang.</p>
      </section>
    </SettingsForm>
  );
};

export default EscalationSettingsPage;
