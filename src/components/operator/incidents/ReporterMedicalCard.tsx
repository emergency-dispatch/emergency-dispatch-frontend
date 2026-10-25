import React from 'react';
import { HeartPulse, MessageSquareWarning, Phone } from 'lucide-react';
import type { ReporterMedicalProfile } from '../../../types/incident';
import { useTranslation } from '../../../i18n';

/** "A_Positive" → "A+"; Unknown/không có → null. */
const formatBloodType = (value: string | null) =>
  !value || value === 'Unknown' ? null : value.replace('_Positive', '+').replace('_Negative', '−');

const InfoRow: React.FC<{ label: string; value: string | null }> = ({ label, value }) =>
  value ? (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
      <dd className="text-slate-800 min-w-0">{value}</dd>
    </div>
  ) : null;

interface ReporterMedicalCardProps {
  profile: ReporterMedicalProfile | null;
  smsLog: string | null;
}

/** Hồ sơ y tế khẩn cấp của người báo — để Operator dặn đội cứu hộ trước khi xuất phát. */
export const ReporterMedicalCard: React.FC<ReporterMedicalCardProps> = ({ profile, smsLog }) => {
  const { t } = useTranslation();
  if (!profile && !smsLog) return null;

  const join = (items: string[]) => (items.length > 0 ? items.join(', ') : null);
  const rows = profile
    ? [
        { label: t('incidents.medical.bloodType'), value: formatBloodType(profile.bloodType) },
        { label: t('incidents.medical.chronicConditions'), value: join(profile.chronicConditions) },
        { label: t('incidents.medical.allergies'), value: join(profile.allergies) },
        { label: t('incidents.medical.medications'), value: join(profile.currentMedications) },
        { label: t('incidents.medical.mobility'), value: join(profile.mobilityLimitations) },
        { label: t('incidents.medical.notes'), value: profile.medicalNotes },
        { label: t('incidents.medical.language'), value: profile.preferredLanguage },
        {
          label: t('incidents.medical.household'),
          value: profile.householdMembersCount > 0 ? t('incidents.medical.householdCount', { count: profile.householdMembersCount }) : null,
        },
        { label: t('incidents.medical.dependents'), value: profile.dependentsNote },
      ]
    : [];
  const hasMedicalInfo = rows.some((r) => r.value);

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5 space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-mono-data uppercase tracking-widest text-rose-700 font-bold">
        <HeartPulse className="w-3.5 h-3.5 shrink-0" />
        {t('incidents.medical.title')}
      </p>

      {profile &&
        (hasMedicalInfo ? (
          <dl className="space-y-1.5 text-xs">
            {rows.map((row) => (
              <InfoRow key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
        ) : (
          <p className="text-xs text-slate-500">{t('incidents.medical.empty')}</p>
        ))}

      {profile && profile.iceContacts.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-600">{t('incidents.medical.ice')}</p>
          <ul className="space-y-1">
            {profile.iceContacts.map((contact) => (
              <li key={contact.id} className="flex items-center gap-2 text-xs text-slate-700 min-w-0">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">
                  {contact.name}
                  {contact.relationship && <span className="text-slate-500"> ({contact.relationship})</span>}
                </span>
                <span className="ml-auto font-mono-data text-slate-500 shrink-0">{contact.phoneNumber}</span>
                {contact.isPrimary && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-100 text-[10px] font-bold text-rose-700 shrink-0">
                    {t('incidents.medical.primary')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {smsLog && (
        <p className="flex items-start gap-1.5 text-[11px] text-slate-600 border-t border-rose-100 pt-2">
          <MessageSquareWarning className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
          <span>{smsLog}</span>
        </p>
      )}
    </div>
  );
};
