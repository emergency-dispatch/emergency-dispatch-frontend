import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Camera,
  Loader2,
  Users,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { mediaService } from '../../services/mediaService';
import { getApiErrorMessage } from '../../services/apiClient';
import { BloodType, Gender, UserRole, UserResponseDto } from '../../types/auth';
import { getAvatarUrl, DEFAULT_AVATAR } from '../../utils/avatar';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'general' | 'medical' | 'ice' | 'security';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // General state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [citizenIdNumber, setCitizenIdNumber] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.Male);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Medical state
  const [bloodType, setBloodType] = useState<BloodType>(BloodType.Unknown);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [mobilityLimitations, setMobilityLimitations] = useState('');

  // Emergency contact (ICE) state
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('');

  // Special Info & Personal state
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('Tiếng Việt');
  const [householdMembersCount, setHouseholdMembersCount] = useState('');
  const [dependentsNote, setDependentsNote] = useState('');

  // Password change state
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
      document.body.style.overflow = 'hidden';
      setErrorMsg('');
      setSuccessMsg('');
      if (user) {
        setFullName(user.fullName || '');
        setPhoneNumber(user.phoneNumber || '');
        setBloodType(user.bloodType || BloodType.Unknown);
        setAvatarUrl(user.avatarUrl || '');

        const fullUser = user as UserResponseDto;
        setAddress(fullUser.address || '');
        setCitizenIdNumber(fullUser.citizenIdNumber || '');
        setGender(fullUser.gender || Gender.Male);
        setDateOfBirth(fullUser.dateOfBirth ? fullUser.dateOfBirth.split('T')[0] : '');
        setMedicalNotes(fullUser.medicalNotes || '');
        setChronicConditions((fullUser.chronicConditions || []).join(', '));
        setAllergies((fullUser.allergies || []).join(', '));
        setCurrentMedications((fullUser.currentMedications || []).join(', '));
        setMobilityLimitations((fullUser.mobilityLimitations || []).join(', '));
        setEmergencyContactName(fullUser.emergencyContactName || '');
        setEmergencyContactPhone(fullUser.emergencyContactPhone || '');
        setEmergencyContactRelationship(fullUser.emergencyContactRelationship || '');
        setPreferredLanguage(fullUser.preferredLanguage || 'Tiếng Việt');
        setHouseholdMembersCount(
          fullUser.householdMembersCount !== undefined && fullUser.householdMembersCount !== null
            ? String(fullUser.householdMembersCount)
            : ''
        );
        setDependentsNote(fullUser.dependentsNote || '');
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      setErrorMsg('');
      const uploadedUrl = await mediaService.upload(file);
      setAvatarUrl(uploadedUrl);
      await updateProfile({
        fullName: fullName.trim(),
        avatarUrl: uploadedUrl,
      });
      setSuccessMsg('Cập nhật ảnh đại diện thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Không thể tải ảnh đại diện lên.'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const splitClean = (str: string) =>
        str
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

      const cleanPhone = phoneNumber.trim();
      if (cleanPhone && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanPhone)) {
        setErrorMsg('Số điện thoại cá nhân không đúng định dạng Việt Nam (ví dụ: 0912345678).');
        setIsLoading(false);
        return;
      }

      const cleanIcePhone = emergencyContactPhone.trim();
      if (cleanIcePhone && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanIcePhone)) {
        setErrorMsg('Số điện thoại người thân không đúng định dạng Việt Nam (ví dụ: 0912345678).');
        setIsLoading(false);
        return;
      }

      await updateProfile({
        fullName: fullName.trim(),
        phoneNumber: cleanPhone ? cleanPhone : null,
        avatarUrl: avatarUrl.trim() || undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
        address: address.trim() || undefined,
        citizenIdNumber: citizenIdNumber.trim() || undefined,
        gender,
        bloodType,
        medicalNotes: medicalNotes.trim() || undefined,
        chronicConditions: splitClean(chronicConditions),
        allergies: splitClean(allergies),
        currentMedications: splitClean(currentMedications),
        mobilityLimitations: splitClean(mobilityLimitations),
        preferredLanguage: preferredLanguage.trim() || undefined,
        dependentsNote: dependentsNote.trim() || undefined,
        householdMembersCount: householdMembersCount ? parseInt(householdMembersCount, 10) : undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: cleanIcePhone ? cleanIcePhone : undefined,
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
      await authService.changePassword({
        currentPassword,
        newPassword,
      });

      setSuccessMsg('Đổi mật khẩu bảo mật thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.'));
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

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <img
                src={getAvatarUrl(avatarUrl, fullName || user?.fullName)}
                alt={fullName}
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_AVATAR;
                }}
                className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-sm"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-800 text-white hover:bg-red-600 transition-colors shadow-xs cursor-pointer"
                title="Thay đổi ảnh đại diện"
              >
                {isUploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{user?.fullName || 'Hồ sơ người dân'}</span>
                <span className="text-[10px] font-mono-data uppercase px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 font-bold">
                  {user?.role || UserRole.Citizen}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-mono-data">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('general');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono-data font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'general' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Thông tin cá nhân</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('medical');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono-data font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'medical' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Hồ sơ y tế cứu hộ</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ice');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono-data font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'ice' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Danh bạ khẩn cấp (ICE)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('security');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono-data font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'security' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Bảo mật</span>
          </button>
        </div>

        {/* Alerts */}
        <div className="px-6 pt-3 shrink-0">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
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
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Email tài khoản (Không thể đổi)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-sm font-mono-data cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                      Số điện thoại
                    </label>
                    {phoneNumber && (
                      <button
                        type="button"
                        onClick={() => setPhoneNumber('')}
                        className="text-[11px] text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        title="Xóa số điện thoại"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa số</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="0912345678 (để trống nếu muốn xóa)"
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                    />
                    {phoneNumber && (
                      <button
                        type="button"
                        onClick={() => setPhoneNumber('')}
                        className="absolute right-2.5 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Xóa trắng số điện thoại"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Để trống và bấm &ldquo;Lưu thay đổi&rdquo; nếu bạn muốn gỡ bỏ số điện thoại khỏi hồ sơ.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Số CCCD / CMND
                  </label>
                  <input
                    type="text"
                    value={citizenIdNumber}
                    onChange={(e) => setCitizenIdNumber(e.target.value)}
                    placeholder="012345678901"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Giới tính
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  >
                    <option value={Gender.Male}>Nam</option>
                    <option value={Gender.Female}>Nữ</option>
                    <option value={Gender.Other}>Khác</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Ngôn ngữ ưu tiên giao tiếp
                  </label>
                  <input
                    type="text"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    placeholder="VD: Tiếng Việt, Tiếng Anh..."
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Số thành viên hộ gia đình
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={householdMembersCount}
                    onChange={(e) => setHouseholdMembersCount(e.target.value)}
                    placeholder="VD: 4"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Đơn vị / Trạm trực
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      disabled
                      value={user?.stationName || 'Công dân tự do (Không trực thuộc trạm)'}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-sm font-mono-data cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  Ghi chú người phụ thuộc (trẻ nhỏ, người già, người khuyết tật)
                </label>
                <textarea
                  rows={2}
                  value={dependentsNote}
                  onChange={(e) => setDependentsNote(e.target.value)}
                  placeholder="VD: Gia đình có 1 bé sơ sinh 6 tháng và người già 80 tuổi đi lại khó khăn..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  Địa chỉ thường trú / Cư trú
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wider uppercase font-mono-data shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 border border-red-600 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Đang lưu...' : 'Lưu thông tin'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Medical Profile */}
          {activeTab === 'medical' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed font-mono-data">
                Hồ sơ y tế giúp lực lượng cứu hộ và bác sĩ cấp cứu 115 nắm bắt tiền sử bệnh lý tức thì khi bạn phát tín hiệu SOS tại hiện trường.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Nhóm máu y tế
                  </label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value as BloodType)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  >
                    {Object.values(BloodType).map((bt) => (
                      <option key={bt} value={bt}>
                        {bloodTypeLabels[bt] || bt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Bệnh lý mãn tính (cách nhau bằng dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={chronicConditions}
                    onChange={(e) => setChronicConditions(e.target.value)}
                    placeholder="Huyết áp cao, Tim mạch, Tiểu đường..."
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Tiền sử dị ứng thuốc / thức ăn
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="Dị ứng Penicillin, Aspirin, Hải sản..."
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Thuốc đang điều trị định kỳ
                  </label>
                  <input
                    type="text"
                    value={currentMedications}
                    onChange={(e) => setCurrentMedications(e.target.value)}
                    placeholder="Insulin, Thuốc hạ áp, Kháng đông..."
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  Hạn chế vận động (nếu có)
                </label>
                <input
                  type="text"
                  value={mobilityLimitations}
                  onChange={(e) => setMobilityLimitations(e.target.value)}
                  placeholder="Khó đi lại, Dùng xe lăn, Tổn thương cột sống..."
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  Ghi chú y tế cứu nạn bổ sung
                </label>
                <textarea
                  rows={2}
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="Bất kỳ lưu ý đặc biệt nào khác cho nhân viên cứu nạn..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wider uppercase font-mono-data shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 border border-red-600 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Đang lưu...' : 'Lưu hồ sơ y tế'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Emergency Contact (ICE) */}
          {activeTab === 'ice' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed font-mono-data">
                Thông tin người thân khẩn cấp (In Case of Emergency) giúp tổng đài và đội cứu hộ liên hệ trực tiếp người nhà của bạn khi bạn gặp nạn hoặc bất tỉnh tại hiện trường.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Họ và tên người thân
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="VD: Nguyễn Văn B"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    Số điện thoại người thân
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="0912345678"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  Mối quan hệ với bạn
                </label>
                <input
                  type="text"
                  value={emergencyContactRelationship}
                  onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                  placeholder="VD: Bố, Mẹ, Vợ, Chồng, Anh/Chị/Em, Bạn thân..."
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                />
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wider uppercase font-mono-data shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 border border-red-600 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Đang lưu...' : 'Lưu người thân khẩn cấp'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Change Password */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed font-mono-data flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  Để bảo mật hệ thống điều phối, sau khi đổi mật khẩu thành công, toàn bộ phiên đăng nhập cũ sẽ bị thu hồi và một email cảnh báo bảo mật thời gian thực sẽ được gửi tới hòm thư của bạn.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  Mật khẩu mới (Tối thiểu 6 ký tự)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wider uppercase font-mono-data shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 border border-red-600 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isLoading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
