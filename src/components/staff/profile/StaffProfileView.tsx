import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UserCircle,
  ShieldAlert,
  Award,
  Calendar,
  Phone,
  Mail,
  Building2,
  Car,
  BadgeCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Edit3,
  HeartPulse,
  CreditCard,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import type { StaffProfile } from '../../../types/staff';
import type { UserResponseDto } from '../../../types/auth';
import { userService } from '../../../services/userService';
import { useAuth } from '../../../hooks/useAuth';
import { UserProfileModal } from '../../profile/UserProfileModal';

interface StaffProfileViewProps {
  profile: StaffProfile;
  onProfileUpdated?: (updatedUser: UserResponseDto) => void;
}

const formatBloodType = (bt?: string) => {
  if (!bt) return 'Chưa cập nhật';
  const map: Record<string, string> = {
    A_Positive: 'A+',
    A_Negative: 'A-',
    B_Positive: 'B+',
    B_Negative: 'B-',
    AB_Positive: 'AB+',
    AB_Negative: 'AB-',
    O_Positive: 'O+',
    O_Negative: 'O-',
    Unknown: 'Chưa xác định',
  };
  return map[bt] || bt;
};

export const StaffProfileView: React.FC<StaffProfileViewProps> = ({ profile, onProfileUpdated }) => {
  const { user, refreshProfile } = useAuth();
  const [userData, setUserData] = useState<UserResponseDto | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Keep ref to avoid infinite re-render loops
  const onProfileUpdatedRef = useRef(onProfileUpdated);
  useEffect(() => {
    onProfileUpdatedRef.current = onProfileUpdated;
  }, [onProfileUpdated]);

  // Fetch live profile from Backend API /Users/me
  const fetchLiveProfile = useCallback(async () => {
    setError(null);
    try {
      const res = await userService.getMe();
      if (res && res.data) {
        setUserData(res.data);
        if (onProfileUpdatedRef.current) {
          onProfileUpdatedRef.current(res.data);
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch profile from backend API, using cached auth user/profile:', err);
      setError('Đang sử dụng dữ liệu bộ nhớ đệm (không kết nối được tới máy chủ).');
    }
  }, []);

  // Run only once on mount
  useEffect(() => {
    fetchLiveProfile();
  }, [fetchLiveProfile]);

  // Manual refresh handler - ONLY spins when explicitly pressed
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchLiveProfile();
      await refreshProfile();
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  // Combined fallback: BE API data > Auth context user > mockStaffProfile
  const displayName = userData?.fullName || user?.fullName || profile.name || 'Đ/c Nguyễn Văn An';
  const displayRole =
    userData?.role === 'RescueStaff'
      ? 'Chỉ Huy Xe Phản Ứng Cứu Hộ'
      : userData?.role || user?.role || profile.role || 'Chỉ Huy Xe Phản Ứng Cứu Hộ';
  const displayPhone = userData?.phoneNumber || user?.phoneNumber || profile.phone || '0908 774 901';
  const displayEmail = userData?.email || user?.email || profile.email || 'nguyenvanan.pccc@resq-cad.gov.vn';
  const displayStation = userData?.stationName || user?.stationName || profile.stationName || 'Trạm PCCC & CNCH Q.1';
  const displayBadge = userData?.citizenIdNumber
    ? `ED-${userData.citizenIdNumber.slice(-4)}`
    : userData?.id
    ? `ED-${userData.id.slice(-4).toUpperCase()}`
    : profile.badgeNumber || 'ED-7749';
  const displayVehicle = profile.vehiclePlate || '51D-123.45';

  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'AN';

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    fetchLiveProfile();
    refreshProfile();
  };

  return (
    <div className="space-y-5 p-1">
      {/* Status banner when error */}
      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleManualRefresh}
            className="text-xs font-bold text-amber-900 underline hover:no-underline ml-2 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Profile Card Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex flex-col sm:flex-row items-center gap-5 min-w-0 flex-1 text-center sm:text-left">
          {/* Avatar */}
          {userData?.avatarUrl ? (
            <img
              src={userData.avatarUrl}
              alt={displayName}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-red-500 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-red-600 text-white font-black text-2xl flex items-center justify-center shadow-sm font-mono-data shrink-0">
              {initials}
            </div>
          )}

          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900">{displayName}</h2>
              <span className="px-2 py-0.5 rounded text-xs font-mono-data font-bold bg-red-50 text-red-700 border border-red-200">
                SỐ HIỆU: {displayBadge}
              </span>
            </div>
            <div className="text-xs text-slate-600 font-semibold">{displayRole}</div>
            <div className="text-xs text-slate-500 font-mono-data flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {displayStation}
              </span>
              <span className="flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-slate-500" />
                Xe trực: {displayVehicle}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons: Edit & Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Làm mới thông tin từ máy chủ Backend"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-red-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Làm Mới</span>
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Chỉnh Sửa Hồ Sơ</span>
          </button>
        </div>
      </div>

      {/* Grid: Contact Info & Certifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Contact Info & Personnel Details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-mono-data font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-red-600" />
            Thông Tin Liên Hệ &amp; Định Danh Quân Số
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Số điện thoại nghiệp vụ:</span>
              <span className="font-mono-data font-bold text-slate-900">{displayPhone}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Email hệ thống điều phối:</span>
              <span className="font-mono-data text-red-600 font-semibold">{displayEmail}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Tình trạng kíp trực:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono-data font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                SẴN SÀNG CHIẾN ĐẤU (ON DUTY)
              </span>
            </div>

            {/* Additional Backend Fields if available */}
            {userData?.bloodType && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                  Nhóm máu y tế:
                </span>
                <span className="font-mono-data font-bold text-red-600">
                  {formatBloodType(userData.bloodType)}
                </span>
              </div>
            )}

            {userData?.citizenIdNumber && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  Số CCCD / Định danh:
                </span>
                <span className="font-mono-data font-bold text-slate-900">{userData.citizenIdNumber}</span>
              </div>
            )}

            {userData?.address && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  Địa bàn thường trú:
                </span>
                <span className="text-slate-900 font-medium truncate max-w-[200px] text-right">
                  {userData.address}
                </span>
              </div>
            )}

            {userData?.emergencyContactName && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500">Liên hệ khẩn cấp:</span>
                <span className="font-medium text-slate-900">
                  {userData.emergencyContactName} ({userData.emergencyContactPhone || 'N/A'})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Certifications & Licences */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-mono-data font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            Chứng Chỉ &amp; Giấy Phép Nghiệp Vụ
          </h3>

          <div className="space-y-2.5">
            {(profile.certifications || []).map((cert, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{cert.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono-data font-bold border ${
                      cert.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {cert.status === 'active' ? 'CÒN HẠN' : 'SẮP HẾT HẠN'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">{cert.issuedBy}</div>
                <div className="text-[10px] font-mono-data text-slate-400">
                  Hạn sử dụng: {cert.expiryDate}
                </div>
              </div>
            ))}

            {/* Account Creation Date from Backend */}
            {userData?.createdAt && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Ngày kích hoạt tài khoản:
                </span>
                <span className="font-mono-data text-slate-900 font-semibold">
                  {new Date(userData.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Profile Modal for Live Edits */}
      <UserProfileModal
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
};
