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
  LayoutGrid,
  List,
  Sparkles,
  Layers,
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

  // Filters & View Mode
  const [locationTab, setLocationTab] = useState<'all' | 'team_vehicle' | 'stock'>('all');
  const [selectedCategory, setSelectedCategory] = useState<EquipmentCategory | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<EquipmentStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

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
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
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
            className="p-1 text-emerald-600 hover:text-emerald-900 rounded cursor-pointer"
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
            className="p-1 text-red-600 hover:text-red-900 rounded cursor-pointer"
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                locationTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Toàn trạm ({equipmentList.length})
            </button>
            <button
              onClick={() => setLocationTab('team_vehicle')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                locationTab === 'team_vehicle'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Xe kíp trực {profile?.vehiclePlate ? `(${profile.vehiclePlate})` : ''}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                locationTab === 'team_vehicle' ? 'bg-red-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {stats.onTeamVehicle}
              </span>
            </button>
            <button
              onClick={() => setLocationTab('stock')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Category Chips & Status Filter & View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === ''
                  ? 'bg-slate-800 text-white shadow-xs'
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
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? `${meta.activeBg} text-white border-transparent shadow-xs`
                      : `${meta.bg} ${meta.border} ${meta.text} hover:opacity-85`
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{CATEGORY_NAMES[cat]}</span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: Status Selector & View Mode Switcher */}
          <div className="flex items-center gap-2">
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

            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Dạng lưới thẻ (Grid)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Dạng bảng danh sách (Table)"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Equipment Display (Grid or Table) */}
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Xóa tất cả bộ lọc
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ================== GRID CARD VIEW ================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredList.map((item) => {
            const meta = EQUIPMENT_CATEGORY_META[item.category];
            const CategoryIcon = meta.icon;
            const isMaintenance = item.status === 'Maintenance';
            const isOnTeamVehicle = item.rescueUnitPlate && myTeamPlates.has(item.rescueUnitPlate);

            return (
              <div
                key={item.id}
                className={`group bg-white rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  isMaintenance
                    ? 'border-amber-300 ring-1 ring-amber-300/40 bg-gradient-to-b from-amber-50/25 via-white to-white'
                    : isOnTeamVehicle
                    ? 'border-slate-200 hover:border-blue-400/80 hover:ring-2 hover:ring-blue-500/10'
                    : 'border-slate-200 hover:border-slate-300 hover:ring-2 hover:ring-slate-500/5'
                }`}
              >
                {/* Card Main Body */}
                <div className="p-4 sm:p-5 space-y-3.5">
                  {/* 1. Header: Category Avatar Box + Title & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Category Icon Avatar */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${meta.bg} ${meta.border} ${meta.text}`}
                      >
                        <CategoryIcon className="w-5 h-5" />
                      </div>

                      {/* Title and Category Tag */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.text}`}>
                            {CATEGORY_NAMES[item.category]}
                          </span>
                        </div>
                        <h3
                          className="text-base font-bold text-slate-900 leading-snug truncate group-hover:text-red-600 transition-colors"
                          title={item.name}
                        >
                          {item.name}
                        </h3>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isMaintenance ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                          <Wrench className="w-3.5 h-3.5 text-amber-600" />
                          <span>Bảo trì</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Sẵn sàng</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2. Metadata Grid: Quantity & Location */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Quantity Pill */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">Số lượng</span>
                      <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                        x{item.quantity} cái
                      </span>
                    </div>

                    {/* Location Pill */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between min-w-0">
                      <span className="text-[11px] font-medium text-slate-500 shrink-0">Vị trí</span>
                      {item.rescueUnitPlate ? (
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-xs font-mono font-bold text-slate-800 truncate" title={item.rescueUnitPlate}>
                            {item.rescueUnitPlate}
                          </span>
                          {isOnTeamVehicle && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700 shrink-0">
                              Xe tổ
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          Kho trạm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3. Maintenance Reason Box (if in maintenance) */}
                  {isMaintenance && item.statusNote && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Lý do báo hỏng / sự cố:</span>
                      </div>
                      <p className="font-semibold text-slate-900 break-words pl-5 leading-relaxed">
                        "{item.statusNote}"
                      </p>
                      {item.statusChangedAt && (
                        <div className="text-[10px] text-amber-700 font-mono pl-5 pt-0.5">
                          Báo hỏng lúc: {new Date(item.statusChangedAt).toLocaleString('vi-VN')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Normal Notes if any */}
                  {item.notes && !isMaintenance && (
                    <p className="text-xs text-slate-500 line-clamp-2 italic px-1">
                      Ghi chú: {item.notes}
                    </p>
                  )}
                </div>

                {/* 4. Footer Action Button */}
                <div className="p-3 sm:px-5 sm:py-3.5 bg-slate-50/70 border-t border-slate-100">
                  {isMaintenance ? (
                    <button
                      onClick={() => setTargetEquipment(item)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác Nhận Đã Sửa Xong (Sẵn sàng)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setTargetEquipment(item)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 text-xs font-bold shadow-2xs hover:shadow-xs transition-all active:scale-[0.99] cursor-pointer group/btn"
                    >
                      <Wrench className="w-4 h-4 text-slate-400 group-hover/btn:text-amber-600 transition-colors" />
                      <span>Báo Hỏng / Yêu Cầu Bảo Trì</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================== TABLE LIST VIEW ================== */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Thiết bị</th>
                  <th className="py-3 px-4">Nhóm</th>
                  <th className="py-3 px-4 text-center">Số lượng</th>
                  <th className="py-3 px-4">Vị trí</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => {
                  const meta = EQUIPMENT_CATEGORY_META[item.category];
                  const CategoryIcon = meta.icon;
                  const isMaintenance = item.status === 'Maintenance';
                  const isOnTeamVehicle = item.rescueUnitPlate && myTeamPlates.has(item.rescueUnitPlate);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>
                          <span>{item.name}</span>
                          {item.notes && (
                            <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs">{item.notes}</p>
                          )}
                          {isMaintenance && item.statusNote && (
                            <p className="text-[11px] text-amber-700 font-normal">Lý do: {item.statusNote}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${meta.bg} ${meta.border} ${meta.text}`}>
                          <CategoryIcon className="w-3 h-3" />
                          <span>{CATEGORY_NAMES[item.category]}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        x{item.quantity}
                      </td>
                      <td className="py-3 px-4">
                        {item.rescueUnitPlate ? (
                          <div className="inline-flex items-center gap-1.5 font-mono text-slate-700 font-bold">
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.rescueUnitPlate}</span>
                            {isOnTeamVehicle && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700 font-sans">
                                Xe tổ
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-medium flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            Kho trạm
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isMaintenance ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <Wrench className="w-3 h-3 text-amber-600" />
                            Bảo trì
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Sẵn sàng
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isMaintenance ? (
                          <button
                            onClick={() => setTargetEquipment(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Khôi phục Sẵn sàng</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setTargetEquipment(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 font-bold transition-colors cursor-pointer shadow-2xs"
                          >
                            <Wrench className="w-3.5 h-3.5 text-amber-600" />
                            <span>Báo hỏng</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
