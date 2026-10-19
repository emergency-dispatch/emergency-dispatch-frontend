import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarX,
  CircleCheck,
  KeyRound,
  RefreshCw,
  Truck,
  UserX,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Notice, type NoticeState } from '../../components/admin/common/ui';
import { useServiceQuery } from '../../components/admin/common/hooks';
import { ROLE_META } from '../../components/admin/accounts/accountMeta';
import { ADMIN_VEHICLE_STATUS_META } from '../../components/admin/fleetMeta';
import { accountAdminService } from '../../services/admin/accountAdminService';
import {
  LONG_MAINTENANCE_DAYS,
  overviewAdminService,
  type AdminOverview,
  type OverviewVehicleGroup,
} from '../../services/admin/overviewAdminService';
import { getApiErrorMessage } from '../../services/apiClient';
import { useNow } from '../../hooks/useNow';
import { formatCountdown } from '../../utils/incidentFormat';
import { UserRole } from '../../types/auth';
import { SHIFT_DEFINITIONS } from '../../types/shift';

const VEHICLE_GROUPS: { key: OverviewVehicleGroup; label: string; color: string }[] = [
  { key: 'available', label: 'Sẵn sàng', color: ADMIN_VEHICLE_STATUS_META.available.color },
  { key: 'on_mission', label: 'Đang làm nhiệm vụ', color: ADMIN_VEHICLE_STATUS_META.en_route.color },
  { key: 'recovering', label: 'Hồi sức', color: ADMIN_VEHICLE_STATUS_META.recovering.color },
  { key: 'maintenance', label: 'Bảo trì', color: ADMIN_VEHICLE_STATUS_META.maintenance.color },
  { key: 'out_of_service', label: 'Ngừng hoạt động', color: ADMIN_VEHICLE_STATUS_META.out_of_service.color },
];

const vehicleLink = (plate: string) => `/admin/vehicles?search=${encodeURIComponent(plate)}`;
const stationLink = (name: string) => `/admin/stations?search=${encodeURIComponent(name)}`;
const accountLink = (email: string) => `/admin/accounts?search=${encodeURIComponent(email)}`;

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour12: false });
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

const OverviewPage: React.FC = () => {
  const query = useServiceQuery(() => overviewAdminService.getOverview(), 'overview');
  const [notice, setNotice] = useState<NoticeState>(null);
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

      <Notice notice={notice} onClose={() => setNotice(null)} />
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

          <ActionItems
            items={data.actionItems}
            onUnlocked={(name) => {
              setNotice({ kind: 'success', message: `Đã mở khóa tài khoản ${name}.` });
              query.reload();
            }}
            onError={(message) => setNotice({ kind: 'error', message })}
          />
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

const ActionItems: React.FC<{
  items: AdminOverview['actionItems'];
  onUnlocked: (name: string) => void;
  onError: (message: string) => void;
}> = ({ items, onUnlocked, onError }) => {
  const now = useNow(1000);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const handleQuickUnlock = async (id: string, name: string) => {
    setUnlockingId(id);
    try {
      await accountAdminService.unlock(id);
      onUnlocked(name);
    } catch (err) {
      onError(getApiErrorMessage(err));
    } finally {
      setUnlockingId(null);
    }
  };

  // Khóa tạm hết hạn ngay trên màn hình thì ẩn khỏi danh sách.
  const failedLogin = items.failedLoginAccounts.filter((a) => new Date(a.lockedUntil).getTime() > now);

  const groups: { title: string; icon: LucideIcon; rows: React.ReactNode[] }[] = [
    {
      title: 'Trạm không còn xe Sẵn sàng',
      icon: Building2,
      rows: items.stationsWithoutAvailableVehicle.map((s) => (
        <ActionRow key={s.id} to={stationLink(s.name)} primary={s.name} secondary={`${s.vehicleCount} xe, không xe nào Sẵn sàng`} />
      )),
    },
    {
      title: 'Trạm chưa có trưởng trạm',
      icon: Building2,
      rows: items.stationsWithoutHead.map((s) => (
        <ActionRow key={s.id} to={stationLink(s.name)} primary={s.name} secondary="Gán một Operator làm trưởng trạm" />
      )),
    },
    {
      title: 'Tài khoản khóa tạm do sai mật khẩu',
      icon: KeyRound,
      rows: failedLogin.map((a) => (
        <ActionRow
          key={a.id}
          to={accountLink(a.email)}
          primary={a.fullName}
          secondary={`${ROLE_META[a.role].label} · còn ${formatCountdown(new Date(a.lockedUntil).getTime() - now)}`}
          action={
            <button
              onClick={() => handleQuickUnlock(a.id, a.fullName)}
              disabled={unlockingId === a.id}
              className="px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold whitespace-nowrap disabled:opacity-50"
            >
              {unlockingId === a.id ? 'Đang mở...' : 'Mở khóa nhanh'}
            </button>
          }
        />
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
          secondary={`${v.stationName} · bảo trì từ ${formatDate(v.maintenanceSince)} (${v.days} ngày)`}
        />
      )),
    },
    {
      title: 'Xe chưa có người phụ trách',
      icon: UserX,
      rows: items.vehiclesWithoutCrew.map((v) => (
        <ActionRow key={v.id} to={vehicleLink(v.plate)} primary={v.plate} mono secondary={v.stationName} />
      )),
    },
    {
      title: 'Trạm chưa có ca trực hôm nay',
      icon: CalendarX,
      rows: items.stationsMissingShiftsToday.map((s) => (
        <ActionRow
          key={s.id}
          to={`/admin/shifts?station=${encodeURIComponent(s.id)}`}
          primary={s.name}
          secondary={`Chưa có người trực: ${s.missing.map((t) => SHIFT_DEFINITIONS[t].label).join(', ')}`}
        />
      )),
    },
    {
      title: 'Ca sắp tới có người bị khóa',
      icon: UserX,
      rows: items.upcomingShiftsWithLockedStaff.map((s) => (
        <ActionRow
          key={s.assignmentId}
          to={`/admin/shifts?station=${encodeURIComponent(s.stationId)}&date=${s.date}`}
          primary={s.staffName}
          secondary={`${s.stationName} · ${s.rowLabel} · ${SHIFT_DEFINITIONS[s.shiftType].label} ${formatDate(`${s.date}T12:00:00`)}`}
        />
      )),
    },
    {
      title: 'Xe Ngừng hoạt động chờ chuyển trạm',
      icon: Truck,
      rows: items.outOfServiceVehicles.map((v) => (
        <ActionRow
          key={v.id}
          to={vehicleLink(v.plate)}
          primary={v.plate}
          mono
          secondary={`Trạm cũ "${v.formerStationName}" đã bị xóa`}
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
