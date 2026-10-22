import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CircleCheck,
  RefreshCw,
  Truck,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Notice } from '../../components/admin/common/ui';
import { useServiceQuery } from '../../components/admin/common/hooks';
import { ROLE_META } from '../../components/admin/accounts/accountMeta';
import { RESCUE_UNIT_STATUS_META } from '../../components/admin/fleetMeta';
import {
  LONG_MAINTENANCE_DAYS,
  overviewAdminService,
  type AdminOverview,
  type OverviewVehicleGroup,
} from '../../services/admin/overviewAdminService';
import { UserRole } from '../../types/auth';

const VEHICLE_GROUPS: { key: OverviewVehicleGroup; label: string; color: string }[] = [
  { key: 'Available', label: RESCUE_UNIT_STATUS_META.Available.label, color: RESCUE_UNIT_STATUS_META.Available.color },
  { key: 'on_mission', label: 'Đang làm nhiệm vụ', color: RESCUE_UNIT_STATUS_META.Dispatched.color },
  { key: 'CoolDown', label: RESCUE_UNIT_STATUS_META.CoolDown.label, color: RESCUE_UNIT_STATUS_META.CoolDown.color },
  { key: 'Maintenance', label: RESCUE_UNIT_STATUS_META.Maintenance.label, color: RESCUE_UNIT_STATUS_META.Maintenance.color },
  {
    key: 'OutOfService',
    label: RESCUE_UNIT_STATUS_META.OutOfService.label,
    color: RESCUE_UNIT_STATUS_META.OutOfService.color,
  },
];

const vehicleLink = (plate: string) => `/admin/vehicles?search=${encodeURIComponent(plate)}`;
const stationLink = (name: string) => `/admin/stations?search=${encodeURIComponent(name)}`;

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour12: false });
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

const OverviewPage: React.FC = () => {
  const query = useServiceQuery(() => overviewAdminService.getOverview(), 'overview');
  const data = query.data;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 font-mono-data">
          {data ? `Cập nhật lúc ${formatTime(data.generatedAt)}` : 'Đang tải...'}
        </p>
        <button
          onClick={query.reload}
          disabled={query.loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${query.loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {query.error && <Notice notice={{ kind: 'error', message: query.error }} />}

      {data && (
        <div className={`space-y-6 transition-opacity ${query.loading ? 'opacity-60' : ''}`}>
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-red-600" />
              Đội xe
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {VEHICLE_GROUPS.map((g) => (
                <StatCard
                  key={g.key}
                  to={`/admin/vehicles?status=${g.key}`}
                  label={g.label}
                  value={data.vehicleCounts[g.key]}
                  dotColor={g.color}
                />
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard to="/admin/stations" label="Trạm đang hoạt động" value={data.activeStationCount} icon={Building2} />
            <StatCard
              to={`/admin/accounts?role=${UserRole.Operator}`}
              label={ROLE_META[UserRole.Operator].label}
              value={data.accountCounts[UserRole.Operator]}
              icon={Users}
            />
            <StatCard
              to={`/admin/accounts?role=${UserRole.RescueStaff}`}
              label={ROLE_META[UserRole.RescueStaff].label}
              value={data.accountCounts[UserRole.RescueStaff]}
              icon={Users}
            />
            <StatCard to="/admin/citizens" label="Tài khoản Citizen" value={data.citizenCount} icon={UserRound} />
          </section>

          <ActionItems items={data.actionItems} />
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ to: string; label: string; value: number; dotColor?: string; icon?: LucideIcon }> = ({
  to,
  label,
  value,
  dotColor,
  icon: Icon,
}) => (
  <Link
    to={to}
    className="group p-4 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-red-300 hover:shadow-sm transition-all"
  >
    <div className="flex items-center gap-2 text-xs text-slate-500">
      {dotColor && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />}
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span className="truncate">{label}</span>
    </div>
    <div className="mt-2 flex items-end justify-between">
      <span className="text-2xl font-black text-slate-900 font-mono-data">{value}</span>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 transition-colors" />
    </div>
  </Link>
);

const ActionItems: React.FC<{ items: AdminOverview['actionItems'] }> = ({ items }) => {
  const groups: { title: string; icon: LucideIcon; rows: React.ReactNode[] }[] = [
    {
      title: 'Trạm không còn xe Sẵn sàng',
      icon: Building2,
      rows: items.stationsWithoutAvailableVehicle.map((s) => (
        <ActionRow key={s.id} to={stationLink(s.name)} primary={s.name} secondary={s.vehicleCount === 0 ? 'Trạm chưa có xe nào' : `${s.vehicleCount} xe, không xe nào Sẵn sàng`} />
      )),
    },
    {
      title: `Xe bảo trì quá ${LONG_MAINTENANCE_DAYS} ngày`,
      icon: Wrench,
      rows: items.longMaintenanceVehicles.map((v) => (
        <ActionRow
          key={v.id}
          to={vehicleLink(v.plate)}
          primary={v.plate}
          mono
          secondary={`${v.stationName} · cập nhật lần cuối ${formatDate(v.maintenanceSince)} (${v.days} ngày)`}
        />
      )),
    },
    {
      title: 'Xe ngừng hoạt động chờ chuyển trạm',
      icon: Truck,
      rows: items.outOfServiceVehicles.map((v) => (
        <ActionRow
          key={v.id}
          to={vehicleLink(v.plate)}
          primary={v.plate}
          mono
          secondary={v.stationName ? `Trạm cũ: ${v.stationName}` : 'Trạm cũ đã bị xóa'}
        />
      )),
    },
  ].filter((g) => g.rows.length > 0);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-slate-900">Cần xử lý</h2>
      {groups.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-300 bg-white text-center">
          <CircleCheck className="w-7 h-7 text-emerald-500 mx-auto" />
          <p className="mt-2 text-sm font-semibold text-slate-600">Không có việc cần xử lý</p>
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
    </section>
  );
};

const ActionRow: React.FC<{ to: string; primary: string; secondary: string; mono?: boolean; action?: React.ReactNode }> = ({
  to,
  primary,
  secondary,
  mono,
  action,
}) => (
  <li className="flex items-center gap-3 px-4 py-2.5">
    <Link to={to} className="group flex-1 min-w-0">
      <span className={`block text-sm font-semibold text-slate-900 group-hover:text-red-600 truncate ${mono ? 'font-mono-data' : ''}`}>
        {primary}
      </span>
      <span className="block text-[11px] text-slate-500 truncate">{secondary}</span>
    </Link>
    {action ?? (
      <Link to={to} aria-label={`Mở ${primary}`} className="text-slate-300 hover:text-red-500">
        <ArrowRight className="w-4 h-4" />
      </Link>
    )}
  </li>
);

export default OverviewPage;
