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
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 border-2 border-cyan-400 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-cyan-950/60 font-mono-data shrink-0">
          AN
        </div>

        <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-lg sm:text-xl font-black text-white">{profile.name}</h2>
            <span className="px-2 py-0.5 rounded text-xs font-mono-data font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              SỐ HIỆU: {profile.badgeNumber}
            </span>
          </div>
          <div className="text-xs text-slate-300 font-semibold">{profile.role}</div>
          <div className="text-xs text-slate-400 font-mono-data flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              {profile.stationName}
            </span>
            <span className="flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-cyan-400" />
              Xe trực: {profile.vehiclePlate}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Contact Info & Certifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Contact Info */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-mono-data font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-cyan-400" />
            Thông Tin Liên Hệ & Định Danh Quân Số
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Số điện thoại nghiệp vụ:</span>
              <span className="font-mono-data font-bold text-white">{profile.phone || '0908 774 901'}</span>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Email hệ thống điều phối:</span>
              <span className="font-mono-data text-cyan-400">{profile.email || 'nguyenvanan@resq.gov.vn'}</span>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Tình trạng kíp trực:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono-data font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                SẴN SÀNG CHIẾN ĐẤU (ON DUTY)
              </span>
            </div>
          </div>
        </div>

        {/* Certifications & Licences */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-mono-data font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-yellow-400" />
            Chứng Chỉ & Giấy Phép Nghiệp Vụ
          </h3>

          <div className="space-y-2.5">
            {(profile.certifications || []).map((cert, idx) => (
              <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{cert.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono-data font-bold border ${
                      cert.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {cert.status === 'active' ? 'CÒN HẠN' : 'SẮP HẾT HẠN'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">{cert.issuedBy}</div>
                <div className="text-[10px] font-mono-data text-slate-500">
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
