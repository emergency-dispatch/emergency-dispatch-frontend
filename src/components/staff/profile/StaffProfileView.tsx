import React from 'react';
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
} from 'lucide-react';
import type { StaffProfile } from '../../../types/staff';

interface StaffProfileViewProps {
  profile: StaffProfile;
}

export const StaffProfileView: React.FC<StaffProfileViewProps> = ({ profile }) => {
  return (
    <div className="space-y-5 p-1">
      {/* Profile Card Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-red-600 text-white font-black text-2xl flex items-center justify-center shadow-sm font-mono-data shrink-0">
          AN
        </div>

        <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900">{profile.name}</h2>
            <span className="px-2 py-0.5 rounded text-xs font-mono-data font-bold bg-red-50 text-red-700 border border-red-200">
              SỐ HIỆU: {profile.badgeNumber}
            </span>
          </div>
          <div className="text-xs text-slate-600 font-semibold">{profile.role}</div>
          <div className="text-xs text-slate-500 font-mono-data flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              {profile.stationName}
            </span>
            <span className="flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-slate-500" />
              Xe trực: {profile.vehiclePlate}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Contact Info & Certifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Contact Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-mono-data font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-red-600" />
            Thông Tin Liên Hệ & Định Danh Quân Số
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Số điện thoại nghiệp vụ:</span>
              <span className="font-mono-data font-bold text-slate-900">{profile.phone || '0908 774 901'}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Email hệ thống điều phối:</span>
              <span className="font-mono-data text-red-600 font-semibold">{profile.email || 'nguyenvanan@resq.gov.vn'}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Tình trạng kíp trực:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono-data font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                SẴN SÀNG CHIẾN ĐẤU (ON DUTY)
              </span>
            </div>
          </div>
        </div>

        {/* Certifications & Licences */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-mono-data font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            Chứng Chỉ & Giấy Phép Nghiệp Vụ
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
          </div>
        </div>
      </div>
    </div>
  );
};
