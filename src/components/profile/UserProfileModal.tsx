import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Heart,
  Lock,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { getApiErrorMessage } from '../../services/apiClient';
import { BloodType, Gender, UserRole, UserResponseDto } from '../../types/auth';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'general' | 'medical' | 'security';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // General & Medical form states
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [citizenIdNumber, setCitizenIdNumber] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.Male);
  const [bloodType, setBloodType] = useState<BloodType>(BloodType.Unknown);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('');

  // Password change form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      // Populate fields from user
      if (user) {
        setFullName(user.fullName || '');
        setPhoneNumber(user.phoneNumber || '');
        setBloodType(user.bloodType || BloodType.Unknown);

        const fullUser = user as UserResponseDto;
        setAddress(fullUser.address || '');
        setCitizenIdNumber(fullUser.citizenIdNumber || '');
        setGender(fullUser.gender || Gender.Male);
        setMedicalNotes(fullUser.medicalNotes || '');
        setEmergencyContactName(fullUser.emergencyContactName || '');
        setEmergencyContactPhone(fullUser.emergencyContactPhone || '');
        setEmergencyContactRelationship(fullUser.emergencyContactRelationship || '');
      }
      // Refresh profile to have latest detailed fields
      refreshProfile().catch(() => {});
    }
  }, [isOpen, user, refreshProfile]);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      await updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        address: address.trim() || undefined,
        citizenIdNumber: citizenIdNumber.trim() || undefined,
        gender,
        bloodType,
        medicalNotes: medicalNotes.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        emergencyContactRelationship: emergencyContactRelationship.trim() || undefined,
      });

      setSuccessMsg('Cập nhật thông tin hồ sơ thành công!');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Không thể cập nhật hồ sơ. Vui lòng thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setErrorMsg('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
      });
      if (res.success) {
        setSuccessMsg('Đổi mật khẩu thành công. Thông báo bảo mật đã được gửi tới email.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(res.message || 'Đổi mật khẩu thất bại.');
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Lỗi đổi mật khẩu. Vui lòng kiểm tra mật khẩu hiện tại.'));
    } finally {
      setIsLoading(false);
    }
  };

  const bloodTypeLabels: Record<BloodType, string> = {
    [BloodType.Unknown]: 'Chưa xác định',
    [BloodType.O_Positive]: 'O+ (Phổ biến)',
    [BloodType.O_Negative]: 'O- (Hiến tặng toàn năng)',
    [BloodType.A_Positive]: 'A+',
    [BloodType.A_Negative]: 'A-',
    [BloodType.B_Positive]: 'B+',
    [BloodType.B_Negative]: 'B-',
    [BloodType.AB_Positive]: 'AB+ (Nhận toàn năng)',
    [BloodType.AB_Negative]: 'AB-',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-[#0F172A] border border-slate-700 shadow-2xl text-slate-100 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {user?.fullName?.substring(0, 2).toUpperCase() || 'US'}
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{user?.fullName || 'Hồ sơ người dùng'}</span>
                <span className="text-[10px] font-mono-data uppercase px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-400 font-semibold">
                  {user?.role || UserRole.Citizen}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono-data">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('general');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono-data font-semibold border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Thông tin chung</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('medical');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono-data font-semibold border-b-2 transition-colors ${
              activeTab === 'medical'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Y tế &amp; Khẩn cấp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('security');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono-data font-semibold border-b-2 transition-colors ${
              activeTab === 'security'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Bảo mật &amp; Đổi mật khẩu</span>
          </button>
        </div>

        {/* Alerts */}
        <div className="px-6 pt-4 shrink-0">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: General Info */}
          {activeTab === 'general' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 font-mono-data"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                    Email tài khoản (Không thể đổi)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-sm font-mono-data cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+84 ..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 font-mono-data"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                    Số CCCD / CMND
                  </label>
                  <input
                    type="text"
                    value={citizenIdNumber}
                    onChange={(e) => setCitizenIdNumber(e.target.value)}
                    placeholder="012345678901"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                    Giới tính
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 font-mono-data"
                  >
                    <option value={Gender.Male}>Nam</option>
                    <option value={Gender.Female}>Nữ</option>
                    <option value={Gender.Other}>Khác</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                    Đơn vị / Trạm trực
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      disabled
                      value={user?.stationName || 'Chưa phân bổ trạm'}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-sm font-mono-data cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                  Địa chỉ thường trú / Cư trú
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 font-mono-data"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wider uppercase font-mono-data shadow-glow-blue transition-all disabled:opacity-50 flex items-center gap-2 border border-blue-500"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Đang lưu...' : 'Lưu thông tin'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Medical & Emergency Contact */}
          {activeTab === 'medical' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-300 leading-relaxed font-mono-data">
                Thông tin nhóm máu và bệnh lý giúp đội ngũ cứu hộ cơ động và y tế chuẩn bị phác đồ sơ cấp cứu tức thời khi bạn gặp sự cố nguy cấp.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                    Nhóm máu y tế
                  </label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value as BloodType)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  >
                    {Object.values(BloodType).map((bt) => (
                      <option key={bt} value={bt}>
                        {bloodTypeLabels[bt] || bt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                    Tên người liên hệ khẩn cấp
                  </label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Họ tên người thân (vd: Bố/Mẹ/Vợ)"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                    SĐT người liên hệ khẩn cấp
                  </label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="+84 ..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                    Mối quan hệ
                  </label>
                  <input
                    type="text"
                    value={emergencyContactRelationship}
                    onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                    placeholder="Bố, Mẹ, Vợ/Chồng, Anh/Chị..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                  Ghi chú bệnh nền / Dị ứng thuốc
                </label>
                <textarea
                  rows={3}
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="Dị ứng kháng sinh Penicillin, tiền sử tim mạch, huyết áp cao, hen suyễn..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-red-500 font-mono-data resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs tracking-wider uppercase font-mono-data shadow-glow-red transition-all disabled:opacity-50 flex items-center gap-2 border border-red-500"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Đang lưu...' : 'Lưu hồ sơ y tế'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Change Password */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 text-xs text-slate-300 leading-relaxed font-mono-data flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Để bảo mật hệ thống điều phối, sau khi đổi mật khẩu thành công, toàn bộ phiên đăng nhập cũ sẽ bị thu hồi và một email cảnh báo bảo mật thời gian thực sẽ được gửi tới hòm thư của bạn.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono-data"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                  Mật khẩu mới (Tối thiểu 6 ký tự)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono-data"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-300 font-semibold">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono-data"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs tracking-wider uppercase font-mono-data shadow-glow-blue transition-all disabled:opacity-50 flex items-center gap-2 border border-indigo-500"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isLoading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
