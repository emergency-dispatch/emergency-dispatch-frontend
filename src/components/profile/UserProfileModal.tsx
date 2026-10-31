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
import { useTranslation } from 'react-i18next';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'general' | 'medical' | 'ice' | 'security';

const now = new Date();
const maxBirthYear = now.getFullYear() - 18;
const maxBirthDate = `${maxBirthYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const minBirthDate = `${now.getFullYear() - 120}-01-01`;

const calculateAge = (dobString: string): number | null => {
  if (!dobString) return null;
  const parts = dobString.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age--;
  }
  return age;
};

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
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
      setSuccessMsg(t('profile.messages.avatarSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, t('profile.messages.avatarError')));
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

      if (!fullName.trim()) {
        setErrorMsg(t('profile.messages.nameRequired'));
        setIsLoading(false);
        return;
      }

      const cleanPhone = phoneNumber.trim();
      if (cleanPhone && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanPhone)) {
        setErrorMsg(t('profile.messages.invalidPhone'));
        setIsLoading(false);
        return;
      }

      const cleanIdCard = citizenIdNumber.trim();
      if (cleanIdCard && !/^[0-9]{9}([0-9]{3})?$/.test(cleanIdCard)) {
        setErrorMsg(t('profile.messages.invalidCitizenId'));
        setIsLoading(false);
        return;
      }

      if (dateOfBirth) {
        const parts = dateOfBirth.split('T')[0].split('-');
        if (parts.length !== 3) {
          setErrorMsg(t('profile.messages.invalidDobFormat'));
          setIsLoading(false);
          return;
        }
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        const today = new Date();
        const curY = today.getFullYear();
        const curM = today.getMonth() + 1;
        const curD = today.getDate();

        const isFuture = y > curY || (y === curY && (m > curM || (m === curM && d > curD)));
        if (isFuture) {
          setErrorMsg(t('profile.messages.dobFutureError', { year: y }));
          setIsLoading(false);
          return;
        }

        const age = calculateAge(dateOfBirth);
        if (age !== null && age < 18) {
          setErrorMsg(t('profile.messages.under18Error', { age }));
          setIsLoading(false);
          return;
        }

        if (age !== null && age > 120) {
          setErrorMsg(t('profile.messages.over120Error'));
          setIsLoading(false);
          return;
        }
      }

      const cleanIcePhone = emergencyContactPhone.trim();
      if (cleanIcePhone && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanIcePhone)) {
        setErrorMsg(t('profile.messages.invalidIcePhone'));
        setIsLoading(false);
        return;
      }

      if (householdMembersCount) {
        const count = parseInt(householdMembersCount, 10);
        if (isNaN(count) || count < 1) {
          setErrorMsg(t('profile.messages.invalidHouseholdCount'));
          setIsLoading(false);
          return;
        }
      }

      await updateProfile({
        fullName: fullName.trim(),
        phoneNumber: cleanPhone ? cleanPhone : null,
        avatarUrl: avatarUrl.trim() || undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
        address: address.trim() || undefined,
        citizenIdNumber: cleanIdCard || undefined,
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

      setSuccessMsg(t('profile.messages.updateSuccess'));
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, t('profile.messages.updateError')));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setErrorMsg(t('profile.messages.passwordRequired'));
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg(t('profile.messages.passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(t('profile.messages.passwordMismatch'));
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

      setSuccessMsg(t('profile.messages.changePasswordSuccess'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, t('profile.messages.changePasswordError')));
    } finally {
      setIsLoading(false);
    }
  };

  const bloodTypeLabels: Record<BloodType, string> = {
    [BloodType.Unknown]: t('profile.medical.bloodTypeLabels.unknown'),
    [BloodType.O_Positive]: t('profile.medical.bloodTypeLabels.oPositive'),
    [BloodType.O_Negative]: t('profile.medical.bloodTypeLabels.oNegative'),
    [BloodType.A_Positive]: t('profile.medical.bloodTypeLabels.aPositive'),
    [BloodType.A_Negative]: t('profile.medical.bloodTypeLabels.aNegative'),
    [BloodType.B_Positive]: t('profile.medical.bloodTypeLabels.bPositive'),
    [BloodType.B_Negative]: t('profile.medical.bloodTypeLabels.bNegative'),
    [BloodType.AB_Positive]: t('profile.medical.bloodTypeLabels.abPositive'),
    [BloodType.AB_Negative]: t('profile.medical.bloodTypeLabels.abNegative'),
  };

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[90vh] rounded-none sm:rounded-2xl bg-white border-0 sm:border border-slate-200 shadow-2xl text-slate-900 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative group">
              <img
                src={getAvatarUrl(avatarUrl, fullName || user?.fullName)}
                alt={fullName}
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_AVATAR;
                }}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-slate-200 shadow-sm"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-800 text-white hover:bg-red-600 transition-colors shadow-xs cursor-pointer"
                title={t('profile.header.changeAvatar')}
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
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2">
                <span>{user?.fullName || t('profile.header.fallbackTitle')}</span>
                <span className="text-[9px] sm:text-[10px] font-mono-data uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 font-bold">
                  {user?.role || UserRole.Citizen}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-mono-data">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title={t('profile.header.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-6 gap-2 pt-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('general');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono-data font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'general' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{t('profile.tabs.general')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('medical');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono-data font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'medical' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>{t('profile.tabs.medical')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ice');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono-data font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'ice' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('profile.tabs.ice')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('security');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-mono-data font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'security' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t('profile.tabs.security')}</span>
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
                    {t('profile.general.fullName')}
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
                    {t('profile.general.accountEmail')}
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
                      {t('profile.general.phoneNumber')}
                    </label>
                    {phoneNumber && (
                      <button
                        type="button"
                        onClick={() => setPhoneNumber('')}
                        className="text-[11px] text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        title={t('profile.general.clearPhoneTitle')}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t('profile.general.clearPhone')}</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="0123456789"
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                    />
                    {phoneNumber && (
                      <button
                        type="button"
                        onClick={() => setPhoneNumber('')}
                        className="absolute right-2.5 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title={t('profile.general.clearPhoneInputTitle')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    {t('profile.general.citizenId')}
                  </label>
                  <input
                    type="text"
                    value={citizenIdNumber}
                    onChange={(e) => setCitizenIdNumber(e.target.value)}
                    placeholder={t('profile.general.citizenIdPlaceholder')}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                      {t('profile.general.dob')}
                    </label>
                    {dateOfBirth && (
                      (() => {
                        const parts = dateOfBirth.split('T')[0].split('-');
                        const y = parseInt(parts[0], 10);
                        const m = parseInt(parts[1], 10);
                        const d = parseInt(parts[2], 10);
                        const today = new Date();
                        const isFuture = y > today.getFullYear() || (y === today.getFullYear() && (m > today.getMonth() + 1 || (m === today.getMonth() + 1 && d > today.getDate())));
                        if (isFuture) {
                          return (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-mono">
                              {t('profile.general.dobFuture')}
                            </span>
                          );
                        }
                        const age = calculateAge(dateOfBirth);
                        if (age !== null && age < 18) {
                          return (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-mono">
                              {t('profile.general.dobUnder18', { age })}
                            </span>
                          );
                        }
                        if (age !== null && age >= 18) {
                          return (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono">
                              {t('profile.general.dobValid', { age })}
                            </span>
                          );
                        }
                        return null;
                      })()
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateOfBirth}
                      max={maxBirthDate}
                      min={minBirthDate}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl bg-white border text-slate-900 text-sm focus:outline-none font-mono-data ${dateOfBirth && calculateAge(dateOfBirth) !== null && calculateAge(dateOfBirth)! < 18
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-slate-300 focus:border-red-500'
                        }`}
                    />
                    {dateOfBirth && (
                      <button
                        type="button"
                        onClick={() => setDateOfBirth('')}
                        className="absolute right-8 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title={t('profile.general.clearDobTitle')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {t('profile.general.dobRequirement')}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    {t('profile.general.gender')}
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  >
                    <option value={Gender.Male}>{t('profile.general.genderOptions.male')}</option>
                    <option value={Gender.Female}>{t('profile.general.genderOptions.female')}</option>
                    <option value={Gender.Other}>{t('profile.general.genderOptions.other')}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    {t('profile.general.preferredLanguage')}
                  </label>
                  <input
                    type="text"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    placeholder={t('profile.general.preferredLanguagePlaceholder')}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    {t('profile.general.householdMembers')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={householdMembersCount}
                    onChange={(e) => setHouseholdMembersCount(e.target.value)}
                    placeholder={t('profile.general.householdMembersPlaceholder')}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    {t('profile.general.station')}
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      disabled
                      value={user?.stationName || t('profile.general.independentCitizen')}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-sm font-mono-data cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  {t('profile.general.dependentsNote')}
                </label>
                <textarea
                  rows={2}
                  value={dependentsNote}
                  onChange={(e) => setDependentsNote(e.target.value)}
                  placeholder={t('profile.general.dependentsNotePlaceholder')}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  {t('profile.general.address')}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t('profile.general.addressPlaceholder')}
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
                  <span>{isLoading ? t('profile.messages.saving') : t('profile.general.saveBtn')}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Medical Profile */}
          {activeTab === 'medical' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed font-mono-data">
                {t('profile.medical.notice')}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    {t('profile.medical.bloodType')}
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
                    {t('profile.medical.chronicConditions')}
                  </label>
                  <input
                    type="text"
                    value={chronicConditions}
                    onChange={(e) => setChronicConditions(e.target.value)}
                    placeholder={t('profile.medical.chronicConditionsPlaceholder')}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    {t('profile.medical.allergies')}
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder={t('profile.medical.allergiesPlaceholder')}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    {t('profile.medical.medications')}
                  </label>
                  <input
                    type="text"
                    value={currentMedications}
                    onChange={(e) => setCurrentMedications(e.target.value)}
                    placeholder={t('profile.medical.medicationsPlaceholder')}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  {t('profile.medical.mobility')}
                </label>
                <input
                  type="text"
                  value={mobilityLimitations}
                  onChange={(e) => setMobilityLimitations(e.target.value)}
                  placeholder={t('profile.medical.mobilityPlaceholder')}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  {t('profile.medical.medicalNotes')}
                </label>
                <textarea
                  rows={2}
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder={t('profile.medical.medicalNotesPlaceholder')}
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
                  <span>{isLoading ? t('profile.messages.saving') : t('profile.medical.saveBtn')}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Emergency Contact (ICE) */}
          {activeTab === 'ice' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed font-mono-data">
                {t('profile.ice.notice')}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    {t('profile.ice.contactName')}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder={t('profile.ice.contactNamePlaceholder')}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                    {t('profile.ice.contactPhone')}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder={t('profile.ice.contactPhonePlaceholder')}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono-data"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  {t('profile.ice.relationship')}
                </label>
                <input
                  type="text"
                  value={emergencyContactRelationship}
                  onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                  placeholder={t('profile.ice.relationshipPlaceholder')}
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
                  <span>{isLoading ? t('profile.messages.saving') : t('profile.ice.saveBtn')}</span>
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
                  {t('profile.security.notice')}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-700 font-bold">
                  {t('profile.security.currentPassword')}
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
                  {t('profile.security.newPassword')}
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
                  {t('profile.security.confirmPassword')}
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
                  <span>{isLoading ? t('profile.messages.processing') : t('profile.security.saveBtn')}</span>
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
