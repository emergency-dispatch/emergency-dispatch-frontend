import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Shield,
  Truck,
  Phone,
  MapPin,
  RefreshCw,
  AlertCircle,
  Radio,
  Flame,
  UserCheck,
  Building2,
  Navigation,
  Mail,
  User,
} from 'lucide-react';
import { userService } from '../../../services/userService';
import { getApiErrorMessage } from '../../../services/apiClient';
import type { StaffTeamResponseDto, TeamMemberSummaryDto, StationVehicleSummaryDto } from '../../../types/dispatch';
import { useAuth } from '../../../hooks/useAuth';

export const StaffTeamView: React.FC = () => {
  const { user } = useAuth();
  const [teamData, setTeamData] = useState<StaffTeamResponseDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'my_team'>('all');

  const fetchTeam = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await userService.getMyTeam();
      if (res.success && res.data) {
        setTeamData(res.data);
      } else {
        setError(res.message || 'Không thể tải thông tin Tổ làm việc.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Lỗi kết nối máy chủ khi lấy dữ liệu Tổ làm việc.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const rawTeamName = teamData?.myTeamName || (user as any)?.teamName || null;
  const members = teamData?.teamMembers || [];
  const vehicles = teamData?.stationVehicles || [];

  // Filter members only if user has a real team assigned
  const hasDistinctTeam = Boolean(rawTeamName && members.some((m) => m.teamName === rawTeamName));
  const filteredMembers = hasDistinctTeam && activeFilter === 'my_team'
    ? members.filter((m) => m.teamName === rawTeamName)
    : members;

  const availableVehiclesCount = vehicles.filter(
    (v) => v.status?.toLowerCase() === 'available'
  ).length;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'RescueStaff':
        return { label: 'Cán bộ Cứu hộ', color: 'bg-red-50 text-red-700 border-red-200' };
      case 'Operator':
        return { label: 'Điều phối viên', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'Admin':
        return { label: 'Quản trị viên', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: role || 'Thành viên', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getMemberStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return { label: 'Hoạt động', dot: 'bg-emerald-500', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'inactive':
        return { label: 'Ngoại tuyến', dot: 'bg-slate-400', color: 'text-slate-600 bg-slate-50 border-slate-200' };
      case 'suspended':
        return { label: 'Tạm ngưng', dot: 'bg-rose-500', color: 'text-rose-700 bg-rose-50 border-rose-200' };
      default:
        return { label: status || 'Không rõ', dot: 'bg-slate-400', color: 'text-slate-600 bg-slate-100 border-slate-200' };
    }
  };

  const getVehicleTypeBadge = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'firetruck':
      case 'fire_truck':
        return { label: 'Xe Chữa Cháy', bg: 'bg-red-50 text-red-700 border-red-200', icon: Flame };
      case 'laddertruck':
      case 'ladder_truck':
        return { label: 'Xe Thang Cứu Nạn', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Truck };
      case 'ambulance':
        return { label: 'Xe Cấp Cứu 115', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Shield };
      case 'rescueboat':
      case 'rescue_boat':
        return { label: 'Cano Cứu Nạn', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: Navigation };
      case 'heavyrescuevehicle':
      case 'heavy_rescue_vehicle':
        return { label: 'Xe Cứu Nạn Đặc Chủng', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Truck };
      case 'policepatrol':
      case 'police_patrol':
        return { label: 'Xe Tuần Tra Phản Ứng', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Shield };
      case 'commandvehicle':
      case 'command_vehicle':
        return { label: 'Xe Chỉ Huy', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: Radio };
      default:
        return { label: type || 'Xe Cứu Hộ', bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: Truck };
    }
  };

  const getVehicleStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return { label: 'Sẵn sàng', dot: 'bg-emerald-500', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'dispatched':
        return { label: 'Đã điều động', dot: 'bg-amber-500', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'enroute':
        return { label: 'Đang di chuyển', dot: 'bg-amber-500 animate-pulse', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'onscene':
        return { label: 'Tại hiện trường', dot: 'bg-rose-500 animate-pulse', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'returning':
        return { label: 'Đang về trạm', dot: 'bg-blue-500', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'maintenance':
        return { label: 'Bảo trì', dot: 'bg-slate-400', color: 'bg-slate-100 text-slate-600 border-slate-200' };
      case 'offduty':
        return { label: 'Nghỉ trực', dot: 'bg-slate-400', color: 'bg-slate-100 text-slate-600 border-slate-200' };
      default:
        return { label: status || 'Chưa cập nhật', dot: 'bg-slate-400', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-red-600 text-white">
              ĐƠN VỊ TÁC CHIẾN
            </span>
            {teamData?.stationId && (
              <span className="text-xs font-mono text-slate-500">
                Mã trạm: {teamData.stationId.slice(0, 8)}
              </span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-red-600" />
            Tổ Làm Việc &amp; Đội Ngũ Trạm
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Thông tin đơn vị, danh sách cán bộ kíp trực và phương tiện cứu hộ của trạm.
          </p>
        </div>

        <button
          onClick={() => fetchTeam(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Đang cập nhật...' : 'Làm mới dữ liệu'}
        </button>
      </div>

      {/* Error notification if any */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold">Lỗi tải dữ liệu</div>
            <div className="mt-0.5 text-amber-700">{error}</div>
          </div>
          <button
            onClick={() => fetchTeam()}
            className="text-xs underline font-bold text-amber-900 hover:text-amber-700 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Top Balanced Cards: Station Info & Working Group */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Trạm Trực Thuộc */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-600">
                  TRẠM TRỰC THUỘC
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  {teamData?.stationName || 'Chưa gán trạm'}
                </h2>
              </div>
            </div>

            <div className="space-y-3 mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">Địa chỉ</div>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">
                    {teamData?.stationAddress || 'Chưa cập nhật địa chỉ'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">Đường dây nóng</div>
                  <div className="text-xs font-bold text-red-600 font-mono mt-0.5">
                    {teamData?.stationPhoneNumber ? (
                      <a href={`tel:${teamData.stationPhoneNumber}`} className="hover:underline">
                        {teamData.stationPhoneNumber}
                      </a>
                    ) : (
                      'Chưa có số hotline'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Tổ Làm Việc & Thống Kê Nhân Lực / Phương Tiện */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    TỔ LÀM VIỆC
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                    {rawTeamName || 'Chưa phân tổ'}
                  </h2>
                </div>
              </div>

              {rawTeamName ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  Đã biên chế
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                  Danh sách chung
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[11px] text-slate-500 font-semibold">Cán bộ tại trạm</div>
                <div className="text-lg font-black font-mono text-slate-900 mt-1">
                  {members.length} <span className="text-xs font-normal text-slate-500">người</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[11px] text-slate-500 font-semibold">Phương tiện trạm</div>
                <div className="text-lg font-black font-mono text-slate-900 mt-1">
                  {vehicles.length} <span className="text-xs font-normal text-slate-500">xe</span>
                  {availableVehiclesCount > 0 && (
                    <span className="text-[11px] font-bold text-emerald-600 font-sans ml-1.5">
                      ({availableVehiclesCount} sẵn sàng)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs (Only shown if user has a distinct team assigned) */}
      {hasDistinctTeam && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveFilter('my_team')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'my_team'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Tổ của tôi ({members.filter((m) => m.teamName === rawTeamName).length})
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Toàn bộ nhân sự trạm ({members.length})
          </button>
        </div>
      )}

      {/* Team Members Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-red-600" />
            Danh Sách Cán Bộ Trực Ban
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {filteredMembers.length} cán bộ
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 bg-white rounded-2xl border border-slate-200 animate-pulse p-5" />
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">Chưa có cán bộ nào trong danh sách</div>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Chưa có cán bộ nào được gán vào đơn vị này. Quản trị viên có thể phân công cán bộ trong phân hệ Quản lý tài khoản.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMembers.map((member) => {
              const isCurrentUser = member.id === user?.id;
              const roleMeta = getRoleBadge(member.role);
              const statusMeta = getMemberStatusBadge(member.status);
              const initials = member.fullName
                .split(' ')
                .map((w) => w[0])
                .slice(-2)
                .join('')
                .toUpperCase() || 'CB';

              return (
                <div
                  key={member.id}
                  className={`bg-white rounded-2xl border p-5 transition-all shadow-xs hover:shadow-sm flex flex-col justify-between ${
                    isCurrentUser
                      ? 'border-red-400 bg-red-50/10 ring-1 ring-red-400'
                      : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Member Top Bar: Avatar, Name & Current User Badge */}
                    <div className="flex items-start gap-3.5">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.fullName}
                          className="w-11 h-11 rounded-full object-cover shrink-0 border border-slate-200 shadow-xs"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center font-mono text-sm shrink-0 shadow-xs">
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-sm text-slate-900 truncate">
                            {member.fullName}
                          </h4>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-600 text-white shrink-0">
                              Tôi
                            </span>
                          )}
                        </div>

                        {/* Real Team Tag if present */}
                        {member.teamName && (
                          <div className="text-[11px] text-slate-600 font-semibold truncate mt-0.5">
                            Tổ: {member.teamName}
                          </div>
                        )}

                        {/* Badges: Role & Real Status */}
                        <div className="flex items-center flex-wrap gap-1.5 mt-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleMeta.color}`}>
                            {roleMeta.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusMeta.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                            {statusMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Member Footer: Email & Click-to-call Phone */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono truncate min-w-0">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>

                    {member.phoneNumber ? (
                      <a
                        href={`tel:${member.phoneNumber}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-mono font-bold text-[11px] transition-colors shrink-0"
                        title="Gọi điện trực tiếp"
                      >
                        <Phone className="w-3 h-3" />
                        {member.phoneNumber}
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic shrink-0">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Station Vehicles Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-red-600" />
            Phương Tiện Cứu Hộ Tại Trạm
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {vehicles.length} phương tiện
          </span>
        </div>

        {vehicles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">Chưa có phương tiện nào tại trạm</div>
            <p className="text-xs text-slate-400 mt-1">
              Trạm chưa được phân bổ phương tiện cứu hộ trong hệ thống.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((veh) => {
              const typeBadge = getVehicleTypeBadge(veh.unitType);
              const statusBadge = getVehicleStatusBadge(veh.status);
              const Icon = typeBadge.icon;

              return (
                <div
                  key={veh.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${typeBadge.bg}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-black font-mono tracking-wider text-slate-900 leading-tight truncate">
                          {veh.plateNumber}
                        </div>
                        <div className="text-xs font-semibold text-slate-600 mt-0.5 truncate">
                          {typeBadge.label}
                        </div>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${statusBadge.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                      {statusBadge.label}
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>GPS: {veh.currentLat.toFixed(4)}, {veh.currentLng.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
