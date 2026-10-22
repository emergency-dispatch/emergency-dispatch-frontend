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
  Users,
  Trash2,
  Plus,
  Loader2,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { mediaService } from '../../services/mediaService';
import { getApiErrorMessage } from '../../services/apiClient';
import { BloodType, Gender, UserRole, UserResponseDto, IceContactDto } from '../../types/auth';
import { getAvatarUrl } from '../../utils/avatar';

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

  // ICE state
  const [autoSendSmsOnSos, setAutoSendSmsOnSos] = useState<boolean>(true);
  const [smsTemplate, setSmsTemplate] = useState<string>('');
  const [iceContacts, setIceContacts] = useState<IceContactDto[]>([]);
  const [isLoadingIce, setIsLoadingIce] = useState<boolean>(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRel, setNewContactRel] = useState('');
  const [newContactPrimary, setNewContactPrimary] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);

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

  const loadIceContacts = async () => {
    try {
      setIsLoadingIce(true);
      const res = await userService.getIceContacts();
      if (res.success && res.data) {
        setIceContacts(res.data);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingIce(false);
    }
  };

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
        setMedicalNotes(fullUser.medicalNotes || '');
        setChronicConditions((fullUser.chronicConditions || []).join(', '));
        setAllergies((fullUser.allergies || []).join(', '));
        setCurrentMedications((fullUser.currentMedications || []).join(', '));
        setMobilityLimitations((fullUser.mobilityLimitations || []).join(', '));
        setAutoSendSmsOnSos(fullUser.autoSendSmsOnSos ?? true);
        setSmsTemplate(fullUser.smsTemplate || 'CẤP CỨU: Tôi vừa bấm SOS tại tọa độ {lat},{lng}. Cần hỗ trợ khẩn cấp!');
      }

      loadIceContacts();
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
        setErrorMsg('Số điện thoại không đúng định dạng Việt Nam (ví dụ: 0912345678).');
        setIsLoading(false);
        return;
      }

      await updateProfile({
        fullName: fullName.trim(),
        phoneNumber: cleanPhone ? cleanPhone : null,
        avatarUrl: avatarUrl.trim() || undefined,
        address: address.trim() || undefined,
        citizenIdNumber: citizenIdNumber.trim() || undefined,
        gender,
        bloodType,
        medicalNotes: medicalNotes.trim() || undefined,
        chronicConditions: splitClean(chronicConditions),
        allergies: splitClean(allergies),
        currentMedications: splitClean(currentMedications),
        mobilityLimitations: splitClean(mobilityLimitations),
        autoSendSmsOnSos,
        smsTemplate: smsTemplate.trim() || undefined,
      });

      setSuccessMsg('Cập nhật thông tin hồ sơ thành công!');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Không thể cập nhật hồ sơ. Vui lòng thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIceContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim() || !newContactRel.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ tên, số điện thoại và mối quan hệ của người thân.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await userService.createIceContact({
        name: newContactName.trim(),
        phoneNumber: newContactPhone.trim(),
        relationship: newContactRel.trim(),
        isPrimary: newContactPrimary,
      });

      if (res.success && res.data) {
        setIceContacts((prev) => [...prev, res.data]);
        setNewContactName('');
        setNewContactPhone('');
        setNewContactRel('');
        setNewContactPrimary(false);
        setIsAddingContact(false);
        setSuccessMsg('Thêm người thân khẩn cấp thành công!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Không thể thêm người thân khẩn cấp.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteIceContact = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người thân này khỏi danh bạ khẩn cấp?')) return;
    try {
      setIsLoading(true);
      await userService.deleteIceContact(id);
      setIceContacts((prev) => prev.filter((c) => c.id !== id));
      setSuccessMsg('Xóa người thân khẩn cấp thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Không thể xóa người thân.'));
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
                src={getAvatarUrl(avatarUrl)}
                alt={fullName}
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

          {/* TAB 3: ICE Contacts & SOS SMS */}
          {activeTab === 'ice' && (
            <div className="space-y-6">
              {/* SMS SOS Automated Notification Config */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 font-mono-data">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-bold text-slate-800">Tự động gửi SMS toạ độ khi nhấn SOS</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSendSmsOnSos}
                      onChange={(e) => setAutoSendSmsOnSos(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                {autoSendSmsOnSos && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[11px] uppercase text-slate-500 font-bold">
                      Mẫu tin nhắn SMS khẩn cấp gửi người thân:
                    </label>
                    <input
                      type="text"
                      value={smsTemplate}
                      onChange={(e) => setSmsTemplate(e.target.value)}
                      placeholder="CẤP CỨU: Tôi vừa bấm SOS tại tọa độ {lat},{lng}. Cần hỗ trợ khẩn cấp!"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-red-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">
                      Toạ độ thực tế sẽ được tự động điền vào tham số {'{lat}'} và {'{lng}'}.
                    </p>
                  </div>
                )}
              </div>

              {/* Contacts List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono-data uppercase font-bold text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-red-600" />
                    <span>Danh bạ người thân khẩn cấp (ICE) ({iceContacts.length})</span>
                  </h3>
                  {!isAddingContact && (
                    <button
                      type="button"
                      onClick={() => setIsAddingContact(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-mono-data font-bold cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm người thân</span>
                    </button>
                  )}
                </div>

                {/* Add new contact form */}
                {isAddingContact && (
                  <form onSubmit={handleAddIceContact} className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-3">
                    <h4 className="text-xs font-bold text-red-700 font-mono-data uppercase">
                      Thêm người liên hệ khẩn cấp mới
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        required
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        placeholder="Họ tên người thân"
                        className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-red-500 font-mono"
                      />
                      <input
                        type="tel"
                        required
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        placeholder="Số điện thoại"
                        className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-red-500 font-mono"
                      />
                      <input
                        type="text"
                        required
                        value={newContactRel}
                        onChange={(e) => setNewContactRel(e.target.value)}
                        placeholder="Mối quan hệ (Bố/Mẹ/Vợ...)"
                        className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-600 font-mono cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newContactPrimary}
                          onChange={(e) => setNewContactPrimary(e.target.checked)}
                          className="rounded text-red-600 focus:ring-red-500"
                        />
                        <span>Đặt làm người liên hệ ưu tiên hàng đầu</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingContact(false)}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold font-mono hover:bg-red-700"
                        >
                          Lưu người thân
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* List items */}
                {isLoadingIce ? (
                  <div className="py-6 text-center text-xs text-slate-400 font-mono">Đang tải danh bạ ICE...</div>
                ) : iceContacts.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 font-mono">
                    Chưa có người thân nào trong danh bạ ICE. Hãy thêm người thân để hệ thống tự động thông báo khi có sự cố.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {iceContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between font-mono-data text-xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                            {contact.name.substring(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{contact.name}</span>
                              <span className="text-[10px] text-slate-500">({contact.relationship})</span>
                              {contact.isPrimary && (
                                <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-bold">
                                  Chính
                                </span>
                              )}
                            </div>
                            <span className="text-slate-500 text-[11px]">{contact.phoneNumber}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteIceContact(contact.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Xóa người thân"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleUpdateProfile}
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wider uppercase font-mono-data shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 border border-red-600 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Đang lưu...' : 'Lưu cấu hình SMS SOS'}</span>
                </button>
              </div>
            </div>
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
