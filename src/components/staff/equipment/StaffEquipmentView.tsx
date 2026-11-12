import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wrench,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Building2,
  PackageOpen,
  Filter,
  Check,
  AlertCircle,
  X,
  ShieldCheck,
  Flame,
  HeartPulse,
  LifeBuoy,
  HardHat,
  Radio,
  Package,
} from 'lucide-react';
import { equipmentService } from '../../../services/equipmentService';
import { getApiErrorMessage } from '../../../services/apiClient';
import type { EquipmentCategory, EquipmentDto, EquipmentStatus } from '../../../types/equipment';
import { EQUIPMENT_CATEGORY_META } from '../../equipment/equipmentMeta';
import { EquipmentStatusDialog } from '../../equipment/EquipmentStatusDialog';
import type { StaffProfile } from '../../../types/staff';

interface StaffEquipmentViewProps {
  profile?: StaffProfile;
}

const CATEGORY_NAMES: Record<EquipmentCategory, string> = {
  FireFighting: 'Chữa cháy',
  Medical: 'Y tế cấp cứu',
  Rescue: 'Cứu nạn',
  Protective: 'Bảo hộ cá nhân',
  Communication: 'Bộ đàm / Liên lạc',
  Other: 'Khác',
};

export const StaffEquipmentView: React.FC<StaffEquipmentViewProps> = ({ profile }) => {
  const [equipmentList, setEquipmentList] = useState<EquipmentDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [locationTab, setLocationTab] = useState<'all' | 'team_vehicle' | 'stock'>('all');
  const [selectedCategory, setSelectedCategory] = useState<EquipmentCategory | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<EquipmentStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dialog State
  const [targetEquipment, setTargetEquipment] = useState<EquipmentDto | null>(null);

  // Team vehicle plates for quick matching
  const myTeamPlates = useMemo(() => {
    const plates = new Set<string>();
    if (profile?.vehiclePlate) plates.add(profile.vehiclePlate);
    if (profile?.teamPlates) {
      profile.teamPlates.forEach((p) => plates.add(p));
    }
    return plates;
  }, [profile]);

  const fetchEquipment = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      // Bỏ trống stationId -> backend tự lọc theo trạm của RescueStaff (GET /api/equipment)
      const data = await equipmentService.list();
      setEquipmentList(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải danh mục trang thiết bị của trạm.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  // Dismiss toast message after 4s
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  // Statistics
  const stats = useMemo(() => {
    const total = equipmentList.length;
    const totalQty = equipmentList.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const available = equipmentList.filter((e) => e.status === 'Available').length;
    const maintenance = equipmentList.filter((e) => e.status === 'Maintenance').length;
    const onTeamVehicle = equipmentList.filter(
      (e) => e.rescueUnitPlate && myTeamPlates.has(e.rescueUnitPlate)
    ).length;

    return { total, totalQty, available, maintenance, onTeamVehicle };
  }, [equipmentList, myTeamPlates]);

  // Filtered Items
  const filteredList = useMemo(() => {
    return equipmentList.filter((item) => {
      // 1. Filter by location
      if (locationTab === 'team_vehicle') {
        if (!item.rescueUnitPlate || !myTeamPlates.has(item.rescueUnitPlate)) {
          return false;
        }
      } else if (locationTab === 'stock') {
        if (item.rescueUnitId !== null && item.rescueUnitPlate !== null) {
          return false;
        }
      }

      // 2. Filter by category
      if (selectedCategory && item.category !== selectedCategory) {
        return false;
      }

      // 3. Filter by status
      if (selectedStatus && item.status !== selectedStatus) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchPlate = item.rescueUnitPlate?.toLowerCase().includes(q) ?? false;
        const matchNote = item.notes?.toLowerCase().includes(q) ?? false;
        const matchStatusNote = item.statusNote?.toLowerCase().includes(q) ?? false;
        const matchCat = (CATEGORY_NAMES[item.category] || '').toLowerCase().includes(q);
        if (!matchName && !matchPlate && !matchNote && !matchStatusNote && !matchCat) {
          return false;
        }
      }

      return true;
    });
  }, [equipmentList, locationTab, selectedCategory, selectedStatus, searchQuery, myTeamPlates]);

  const handleStatusDone = (updated: EquipmentDto) => {
    setEquipmentList((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    setTargetEquipment(null);
    if (updated.status === 'Maintenance') {
      setSuccessMsg(`Đã ghi nhận báo hỏng thiết bị "${updated.name}" sang chế độ Bảo trì.`);
    } else {
      setSuccessMsg(`Thiết bị "${updated.name}" đã được khôi phục trạng thái Sẵn sàng.`);
    }
  };

  const handleEquipmentGone = () => {
    if (targetEquipment) {
      setEquipmentList((prev) => prev.filter((item) => item.id !== targetEquipment.id));
      setTargetEquipment(null);
      setError('Thiết bị này đã bị xóa hoặc không còn tồn tại trên hệ thống.');
    }
  };

  return (
    <div className="space-y-5 p-1 max-w-6xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-200">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono font-bold text-red-600 tracking-wider">
                QUẢN LÝ &amp; BÁO HỎNG THIẾT BỊ (MỤC 25)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3" />
                Kiểm định ca trực
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Danh Mục Trang Thiết Bị Cứu Nạn Trạm &amp; Kíp Trực
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Trạm: <span className="font-semibold text-slate-700">{profile?.stationName || 'Trạm trực chiến'}</span>
              {profile?.vehiclePlate && (
                <> &bull; Xe kíp: <span className="font-semibold text-red-600">{profile.vehiclePlate}</span></>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => fetchEquipment(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
            title="Làm mới danh mục trang thiết bị"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
            <span>{refreshing ? 'Đang đồng bộ...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button
            onClick={() => setSuccessMsg(null)}
            className="p-1 text-emerald-600 hover:text-emerald-900 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-1 text-red-600 hover:text-red-900 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Quick Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Toàn bộ thiết bị</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-500">mục ({stats.totalQty} cái/bộ)</span>
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold">Sẵn sàng (Tác chiến)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">{stats.available}</span>
            <span className="text-xs text-emerald-600">hoạt động tốt</span>
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-white to-amber-50/40">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold">Báo hỏng / Bảo trì</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-700">{stats.maintenance}</span>
            <span className="text-xs text-amber-600">cần xử lý</span>
          </div>
        </div>

        <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-semibold">Gắn trên xe kíp trực</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-blue-700">{stats.onTeamVehicle}</span>
            <span className="text-xs text-blue-600">mục theo xe</span>
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Location Tabs + Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
        {/* Row 1: Location Segment Control */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1">
            <button
              onClick={() => setLocationTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                locationTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Toàn trạm ({equipmentList.length})
            </button>
            <button
              onClick={() => setLocationTab('team_vehicle')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                locationTab === 'team_vehicle'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Xe kíp trực {profile?.vehiclePlate ? `(${profile.vehiclePlate})` : ''}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                locationTab === 'team_vehicle' ? 'bg-red-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {stats.onTeamVehicle}
              </span>
            </button>
            <button
              onClick={() => setLocationTab('stock')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                locationTab === 'stock'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Kho trạm</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm thiết bị, biển số, ghi chú..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Category Chips & Status Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedCategory === ''
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả nhóm
            </button>
            {(Object.keys(CATEGORY_NAMES) as EquipmentCategory[]).map((cat) => {
              const meta = EQUIPMENT_CATEGORY_META[cat];
              const Icon = meta.icon;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(isSelected ? '' : cat)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    isSelected
                      ? `${meta.activeBg} text-white border-transparent shadow-xs`
                      : `${meta.bg} ${meta.border} ${meta.text} hover:opacity-80`
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{CATEGORY_NAMES[cat]}</span>
                </button>
              );
            })}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Trạng thái:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as EquipmentStatus | '')}
              aria-label="Lọc theo trạng thái thiết bị"
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Available">Sẵn sàng (Tác chiến)</option>
              <option value="Maintenance">Đang bảo trì / Báo hỏng</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Equipment Card Grid */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-red-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Đang đồng bộ dữ liệu trang thiết bị...</p>
          <p className="text-xs text-slate-400 mt-1">Đang tải danh mục từ máy chủ trung tâm cứu nạn</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
            <PackageOpen className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {searchQuery || selectedCategory || selectedStatus || locationTab !== 'all'
              ? 'Không tìm thấy thiết bị phù hợp'
              : 'Chưa có trang thiết bị nào được cấp'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {searchQuery || selectedCategory || selectedStatus || locationTab !== 'all'
              ? 'Thử thay đổi bộ lọc tìm kiếm, nhóm danh mục hoặc vị trí thiết bị để xem kết quả.'
              : 'Trạm chưa được phân bổ danh mục thiết bị tác chiến hoặc hệ thống đang cập nhật. Vui lòng liên hệ quản lý trạm.'}
          </p>
          {(searchQuery || selectedCategory || selectedStatus || locationTab !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('');
                setSelectedStatus('');
                setLocationTab('all');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              Xóa tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((item) => {
            const meta = EQUIPMENT_CATEGORY_META[item.category];
            const CategoryIcon = meta.icon;
            const isMaintenance = item.status === 'Maintenance';
            const isOnTeamVehicle = item.rescueUnitPlate && myTeamPlates.has(item.rescueUnitPlate);

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-2xl p-4.5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${
                  isMaintenance
                    ? 'border-amber-300 ring-1 ring-amber-200/50 bg-gradient-to-b from-amber-50/20 to-white'
                    : isOnTeamVehicle
                    ? 'border-blue-200'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top: Category Tag + Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${meta.bg} ${meta.border} ${meta.text}`}
                    >
                      <CategoryIcon className="w-3.5 h-3.5" />
                      {CATEGORY_NAMES[item.category]}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        isMaintenance
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {isMaintenance ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Bảo trì
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Sẵn sàng
                        </>
                      )}
                    </span>
                  </div>

                  {/* Name & Quantity */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {item.name}
                    </h3>
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                      x{item.quantity}
                    </span>
                  </div>

                  {/* Location Info */}
                  <div className="flex items-center gap-2 mb-3">
                    {item.rescueUnitPlate ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border ${
                          isOnTeamVehicle
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        <span>Xe: {item.rescueUnitPlate}</span>
                        {isOnTeamVehicle && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded">
                            Xe tổ
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Kho trạm</span>
                      </span>
                    )}
                  </div>

                  {/* Maintenance Reason / Status Note Box */}
                  {isMaintenance && item.statusNote && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mb-3 space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
                        <Wrench className="w-3 h-3 text-amber-600" />
                        <span>Lý do hỏng / bảo trì:</span>
                      </div>
                      <p className="font-medium text-slate-800 break-words pl-4">
                        {item.statusNote}
                      </p>
                      {item.statusChangedAt && (
                        <div className="text-[10px] text-amber-700 font-mono pl-4">
                          Ghi nhận: {new Date(item.statusChangedAt).toLocaleString('vi-VN')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Normal Notes if any */}
                  {item.notes && !isMaintenance && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                      Ghi chú: {item.notes}
                    </p>
                  )}
                </div>

                {/* Bottom Action Button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  {isMaintenance ? (
                    <button
                      onClick={() => setTargetEquipment(item)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đã sửa / Khôi phục Sẵn sàng</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setTargetEquipment(item)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Báo hỏng thiết bị</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Status Dialog Modal */}
      {targetEquipment && (
        <EquipmentStatusDialog
          equipment={targetEquipment}
          onCancel={() => setTargetEquipment(null)}
          onDone={handleStatusDone}
          onGone={handleEquipmentGone}
        />
      )}
    </div>
  );
};
