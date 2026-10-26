import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, PhoneCall, AlertCircle, CheckCircle2, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/apiClient';
import { useTranslation } from '../../i18n';

interface CitizenPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (phoneNumber: string) => void;
}

export const CitizenPhoneModal: React.FC<CitizenPhoneModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPhoneNumber(user?.phoneNumber || '');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearPhone = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      const u = user as any;
      await updateProfile({
        fullName: user?.fullName || 'Người dân',
        phoneNumber: null,
        avatarUrl: user?.avatarUrl,
        address: u?.address,
        citizenIdNumber: u?.citizenIdNumber,
        gender: u?.gender,
        bloodType: user?.bloodType,
        medicalNotes: u?.medicalNotes,
      });

      setSuccessMsg(t('citizen.sos.phoneModalDeleteSuccess'));
      onSuccess?.('');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Không thể xóa số điện thoại. Vui lòng thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone) {
      // Người dùng để trống -> xóa SĐT khỏi hồ sơ
      await handleClearPhone();
      return;
    }

    if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanPhone)) {
      setErrorMsg(t('citizen.sos.phoneModalInvalidError'));
      return;
    }

    try {
      setIsLoading(true);
      const u = user as any;
      await updateProfile({
        fullName: user?.fullName || 'Người dân',
        phoneNumber: cleanPhone,
        avatarUrl: user?.avatarUrl,
        address: u?.address,
        citizenIdNumber: u?.citizenIdNumber,
        gender: u?.gender,
        bloodType: user?.bloodType,
        medicalNotes: u?.medicalNotes,
      });

      setSuccessMsg(t('citizen.sos.phoneModalSaveSuccess'));
      onSuccess?.(cleanPhone);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Không thể cập nhật số điện thoại. Vui lòng thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 sm:p-6 text-slate-900 animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title={t('citizen.sos.btnDismiss')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Icon & Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-200 text-amber-600 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {t('citizen.sos.phoneModalTitle')}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {t('citizen.sos.phoneModalDesc')}
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase text-slate-700 mb-1.5">
              {t('citizen.sos.phoneModalFieldLabel')}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t('citizen.sos.phoneModalPlaceholder')}
                className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-red-500 font-mono shadow-xs"
                autoFocus
                disabled={isLoading}
              />
              {phoneNumber && (
                <button
                  type="button"
                  onClick={() => setPhoneNumber('')}
                  className="absolute right-2.5 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {t('citizen.sos.phoneModalHint')}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {user?.phoneNumber && (
              <button
                type="button"
                onClick={handleClearPhone}
                disabled={isLoading}
                className="py-2.5 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title={t('citizen.sos.phoneModalBtnDelete')}
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>{t('citizen.sos.phoneModalBtnDelete')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              {t('citizen.sos.phoneModalBtnLater')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('citizen.sos.phoneModalProcessing')}</span>
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4" />
                  <span>{phoneNumber.trim() ? t('citizen.sos.phoneModalBtnSave') : t('citizen.sos.phoneModalBtnRemove')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

