import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  ChevronRight,
  CircleCheck,
  Package,
  RefreshCw,
  Siren,
  Truck,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Notice } from '../../components/admin/common/ui';
import { useServiceQuery } from '../../components/admin/common/hooks';
import { RESCUE_UNIT_STATUS_META } from '../../components/admin/fleetMeta';
import { severityLabel } from '../../components/admin/escalation/escalationMeta';
import { SEVERITY_LEVEL_META } from '../../data/incidentMock';
import {
  LONG_MAINTENANCE_DAYS,
  overviewAdminService,
  type AdminOverview,
  type OverviewVehicleGroup,
} from '../../services/admin/overviewAdminService';
import { UserRole } from '../../types/auth';
import type { RecentIncidentSummaryDto } from '../../types/adminDashboard';
import { dateLocale, useTranslation } from '../../i18n';

// Nhãn: on_mission → admin.monitoring.overview.onMission, còn lại → enums.unitStatus.*
const VEHICLE_GROUPS: { key: OverviewVehicleGroup; color: string }[] = [
  { key: 'Available', color: RESCUE_UNIT_STATUS_META.Available.color },
  { key: 'on_mission', color: RESCUE_UNIT_STATUS_META.Dispatched.color },
  { key: 'CoolDown', color: RESCUE_UNIT_STATUS_META.CoolDown.color },
  { key: 'Maintenance', color: RESCUE_UNIT_STATUS_META.Maintenance.color },
  { key: 'OutOfService', color: RESCUE_UNIT_STATUS_META.OutOfService.color },
];

// Sự cố đang mở theo giai đoạn xử lý. Nhãn: admin.monitoring.overview.incident*.
const INCIDENT_GROUPS = [
  { key: 'pending', labelKey: 'incidentPending', dotClass: 'bg-sky-500' },
  { key: 'verified', labelKey: 'incidentVerified', dotClass: 'bg-indigo-400' },
  { key: 'dispatched', labelKey: 'incidentDispatched', dotClass: 'bg-emerald-500' },
  { key: 'escalated', labelKey: 'incidentEscalated', dotClass: 'bg-red-600' },
] as const satisfies readonly { key: keyof AdminOverview['incidents']; labelKey: string; dotClass: string }[];

// Mọi hàng thẻ cùng một lưới 5 cột để các cột thẳng hàng.
const STAT_GRID = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3';

const vehicleLink = (plate: string) => `/admin/vehicles?search=${encodeURIComponent(plate)}`;
const stationLink = (name: string) => `/admin/stations?search=${encodeURIComponent(name)}`;
// Admin không có màn chi tiết sự cố → mở diễn biến sự cố trong Nhật ký.
const incidentTimelineLink = (id: string) => `/admin/audit-trail?incident=${id}`;

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale(), { hour12: false });
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(dateLocale());
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(dateLocale(), { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', hour12: false });

const OverviewPage: React.FC = () => {
  const { t } = useTranslation();
  const query = useServiceQuery(() => overviewAdminService.getOverview(), 'overview');
  const data = query.data;
  const vehicleTotal = data ? VEHICLE_GROUPS.reduce((sum, g) => sum + data.vehicleCounts[g.key], 0) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 font-mono-data">
          {data ? t('admin.monitoring.overview.updatedAt', { time: formatTime(data.generatedAt) }) : t('admin.common.loading')}
        </p>
        <button
          onClick={query.reload}
          disabled={query.loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${query.loading ? 'animate-spin' : ''}`} />
          {t('admin.monitoring.refresh')}
        </button>
      </div>

      {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}

      {data && (
        <div className={`space-y-6 transition-opacity ${query.loading ? 'opacity-60' : ''}`}>
          <Section title={t('admin.monitoring.overview.openIncidents')} hint={t('admin.monitoring.overview.openIncidentsHint')}>
            <div className={STAT_GRID}>
              <StatCard icon={Siren} label={t('admin.monitoring.overview.openTotal')} value={data.incidents.active} strong />
              {INCIDENT_GROUPS.map((g) => (
                <StatCard
                  key={g.key}
                  dotClass={g.dotClass}
                  label={t(`admin.monitoring.overview.${g.labelKey}`)}
                  value={data.incidents[g.key]}
                  alert={g.key === 'escalated'}
                />
              ))}
            </div>
          </Section>

          <Section title={t('admin.monitoring.overview.fleet')} count={t('admin.monitoring.overview.vehicleTotal', { count: vehicleTotal })}>
            <div className={STAT_GRID}>
              {VEHICLE_GROUPS.map((g) => (
                <StatCard
                  key={g.key}
                  to={`/admin/vehicles?status=${g.key}`}
                  dotColor={g.color}
                  label={g.key === 'on_mission' ? t('admin.monitoring.overview.onMission') : t(`enums.unitStatus.${g.key}`)}
                  value={data.vehicleCounts[g.key]}
                />
              ))}
            </div>
          </Section>

          <Section title={t('admin.monitoring.overview.system')}>
            <div className={STAT_GRID}>
              <StatCard
                to="/admin/stations"
                icon={Building2}
                label={t('admin.monitoring.overview.activeStations')}
                value={data.activeStationCount}
              />
              <StatCard
                to="/admin/equipment"
                icon={Package}
                label={t('admin.monitoring.overview.equipment')}
                value={data.equipment?.total ?? null}
                note={
                  data.equipment?.maintenance
                    ? t('admin.monitoring.overview.equipmentMaintenance', { count: data.equipment.maintenance })
                    : undefined
                }
              />
              <StatCard
                to={`/admin/accounts?role=${UserRole.Operator}`}
                icon={Users}
                label={t(`admin.users.roles.${UserRole.Operator}.label`)}
                value={data.accountCounts[UserRole.Operator]}
              />
              <StatCard
                to={`/admin/accounts?role=${UserRole.RescueStaff}`}
                icon={Users}
                label={t(`admin.users.roles.${UserRole.RescueStaff}.label`)}
                value={data.accountCounts[UserRole.RescueStaff]}
              />
              <StatCard to="/admin/citizens" icon={UserRound} label={t('admin.monitoring.overview.citizenAccounts')} value={data.citizenCount} />
            </div>
          </Section>

          <ActionItems items={data.actionItems} />
          <RecentIncidents items={data.recentIncidents} />
        </div>
      )}
    </div>
  );
};

/** Tiêu đề nhóm thống nhất: nhãn nhỏ in hoa, số / ghi chú phụ, nội dung bên dưới. */
const Section: React.FC<{ title: string; count?: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  count,
  hint,
  children,
}) => (
  <section className="space-y-2.5">
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <h2 className="text-[11px] font-bold font-mono-data uppercase tracking-wider text-slate-500">{title}</h2>
      {count !== undefined && <span className="text-[11px] font-bold font-mono-data text-slate-700">· {count}</span>}
      {hint && <div className="text-[11px] text-slate-400 sm:ml-auto">{hint}</div>}
    </div>
    {children}
  </section>
);

/**
 * Thẻ số liệu gọn. `to` → bấm được (mũi tên hiện ở góc). Số 0 làm mờ để thẻ có số nổi lên;
 * `alert` → tô đỏ khi > 0; `strong` → số luôn đậm (thẻ tổng); `value` null → "—" (không tải được).
 */
const StatCard: React.FC<{
  to?: string;
  label: string;
  value: number | null;
  icon?: LucideIcon;
  dotColor?: string;
  dotClass?: string;
  alert?: boolean;
  strong?: boolean;
  note?: string;
}> = ({ to, label, value, icon: Icon, dotColor, dotClass, alert, strong, note }) => {
  const hot = alert && !!value;
  const numberClass = hot ? 'text-red-600' : value || strong ? 'text-slate-900' : 'text-slate-300';
  const body = (
    <>
      <div className={`flex items-center gap-2 pr-4 text-xs ${hot ? 'font-semibold text-red-700' : 'text-slate-500'}`}>
        {(dotColor || dotClass) && (
          <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass ?? ''}`} style={dotColor ? { backgroundColor: dotColor } : undefined} />
        )}
        {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2 min-w-0">
        <span className={`text-xl font-black font-mono-data tabular-nums ${numberClass}`}>{value ?? '—'}</span>
        {note && <span className="text-[11px] font-semibold text-amber-700 truncate">{note}</span>}
      </div>
      {to && (
        <ChevronRight className="absolute top-3 right-2.5 w-4 h-4 text-slate-300 group-hover:text-red-500 transition-colors" />
      )}
    </>
  );
  const frame = `relative px-4 py-3 rounded-xl border shadow-xs ${hot ? 'border-red-300 bg-red-50/60' : 'border-slate-200 bg-white'}`;
  return to ? (
    <Link to={to} className={`group block ${frame} hover:border-red-300 hover:shadow-sm transition-all`}>
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
};

const ActionItems: React.FC<{ items: AdminOverview['actionItems'] }> = ({ items }) => {
  const { t } = useTranslation();
  const groups: { title: string; icon: LucideIcon; rows: React.ReactNode[] }[] = [
    {
      title: t('admin.monitoring.overview.noAvailableVehicle'),
      icon: Building2,
      rows: items.stationsWithoutAvailableVehicle.map((s) => (
        <ActionRow
          key={s.id}
          to={stationLink(s.name)}
          primary={s.name}
          secondary={
            s.vehicleCount === 0
              ? t('admin.monitoring.overview.stationNoVehicles')
              : t('admin.monitoring.overview.stationNoneAvailable', { count: s.vehicleCount })
          }
        />
      )),
    },
    {
      title: t('admin.monitoring.overview.longMaintenance', { days: LONG_MAINTENANCE_DAYS }),
      icon: Wrench,
      rows: items.longMaintenanceVehicles.map((v) => (
        <ActionRow
          key={v.id}
          to={vehicleLink(v.plate)}
          primary={v.plate}
          mono
          secondary={t('admin.monitoring.overview.maintenanceSince', {
            station: v.stationName,
            date: formatDate(v.maintenanceSince),
            days: v.days,
          })}
        />
      )),
    },
    {
      title: t('admin.monitoring.overview.outOfService'),
      icon: Truck,
      rows: items.outOfServiceVehicles.map((v) => (
        <ActionRow
          key={v.id}
          to={vehicleLink(v.plate)}
          primary={v.plate}
          mono
          secondary={
            v.stationName ? t('admin.monitoring.overview.previousStation', { station: v.stationName }) : t('admin.monitoring.overview.previousStationDeleted')
          }
        />
      )),
    },
  ].filter((g) => g.rows.length > 0);
  const total = groups.reduce((sum, g) => sum + g.rows.length, 0);

  return (
    <Section title={t('admin.monitoring.overview.actionItems')} count={total || undefined}>
      {groups.length === 0 ? (
        // Không có việc → một dòng mảnh, không chiếm chỗ.
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-xs font-semibold text-emerald-800">
          <CircleCheck className="w-4 h-4 shrink-0" />
          {t('admin.monitoring.overview.nothingToDo')}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {groups.map((g) => (
            <div key={g.title} className="rounded-xl border border-amber-200 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-xs font-bold text-amber-800">
                <g.icon className="w-3.5 h-3.5" />
                <span className="flex-1">{g.title}</span>
                <span className="px-1.5 rounded-full bg-amber-200/70 font-mono-data">{g.rows.length}</span>
              </div>
              <ul className="divide-y divide-slate-100">{g.rows}</ul>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
};

const ActionRow: React.FC<{ to: string; primary: string; secondary: string; mono?: boolean }> = ({ to, primary, secondary, mono }) => {
  const { t } = useTranslation();
  return (
    <li>
      <Link
        to={to}
        aria-label={t('admin.monitoring.overview.open', { name: primary })}
        className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
      >
        <span className="flex-1 min-w-0">
          <span className={`block text-sm font-semibold text-slate-900 group-hover:text-red-600 truncate ${mono ? 'font-mono-data' : ''}`}>
            {primary}
          </span>
          <span className="block text-[11px] text-slate-500 truncate">{secondary}</span>
        </span>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500" />
      </Link>
    </li>
  );
};

/** 8 sự cố tạo gần nhất (mọi trạng thái) — bấm để xem diễn biến trong Nhật ký. */
const RecentIncidents: React.FC<{ items: RecentIncidentSummaryDto[] }> = ({ items }) => {
  const { t } = useTranslation();
  return (
    <Section
      title={t('admin.monitoring.overview.recentIncidents')}
      hint={
        <Link to="/admin/reports" className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-red-600">
          {t('admin.layout.nav.reports')}
          <ArrowRight className="w-3 h-3" />
        </Link>
      }
    >
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">{t('admin.monitoring.overview.noRecentIncidents')}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((i) => {
              const level = i.severity === 'Unclassified' ? null : (Math.min(Number(i.severity.replace('Level', '')), 3) as 1 | 2 | 3);
              const closed = i.status === 'Completed' || i.status === 'Cancelled' || i.status === 'Linked';
              return (
                <li key={i.id}>
                  <Link to={incidentTimelineLink(i.id)} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <span
                      className={`shrink-0 w-[92px] truncate text-center px-1.5 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap ${
                        level ? SEVERITY_LEVEL_META[level].badgeClass : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      {severityLabel(i.severity)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={`block text-sm font-semibold truncate group-hover:text-red-600 ${closed ? 'text-slate-500' : 'text-slate-900'}`}
                      >
                        {i.title}
                      </span>
                      <span className="block text-[11px] text-slate-500 truncate">
                        <span
                          className={
                            i.status === 'Escalated' ? 'font-bold text-red-600' : closed ? 'text-slate-400' : 'font-semibold text-slate-700'
                          }
                        >
                          {t(`admin.monitoring.incident.status.${i.status}`, { defaultValue: i.status })}
                        </span>
                        {i.locationAddress && <> · {i.locationAddress}</>}
                      </span>
                    </span>
                    <time className="shrink-0 text-[11px] font-mono-data text-slate-400" dateTime={i.createdAt}>
                      {formatDateTime(i.createdAt)}
                    </time>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400">
          {t('admin.monitoring.overview.recentIncidentsHint')}
        </p>
      </div>
    </Section>
  );
};

export default OverviewPage;
