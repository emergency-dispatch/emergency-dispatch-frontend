import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { AiHighlightSection } from '../components/landing/AiHighlightSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { RoleSolutionsSection } from '../components/landing/RoleSolutionsSection';
import { HotlineBannerSection } from '../components/landing/HotlineBannerSection';
import { Footer } from '../components/layout/Footer';
import { PhoneCall, ShieldAlert } from 'lucide-react';
import { SosModal, CitizenReportsModal, CitizenPhoneModal } from '../components/citizen';
import { BackToTop } from '../components/common/BackToTop';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth';
import { mapboxService } from '../services/mapboxService';

export const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  const roleClean = String(user?.role || '').toLowerCase();
  const isCitizen = !user?.role || roleClean === 'citizen' || user?.role === UserRole.Citizen;
  const hasNoPhone = !user?.phoneNumber || user.phoneNumber.trim() === '';
  const isCitizenWithoutPhone = Boolean((isAuthenticated || !!user) && isCitizen && hasNoPhone);

  // Yêu cầu lấy vị trí ngay lập tức khi mở web nếu người dùng là Citizen (hoặc vãng lai)
  useEffect(() => {
    if (!navigator.geolocation) return;
    const isCitizen = !user || user.role === UserRole.Citizen;
    if (isCitizen) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const addr = await mapboxService.reverseGeocode(lng, lat);
            localStorage.setItem(
              'resq_citizen_coords',
              JSON.stringify({ lat, lng, address: addr, updatedAt: Date.now() })
            );
          } catch {
            localStorage.setItem(
              'resq_citizen_coords',
              JSON.stringify({ lat, lng, updatedAt: Date.now() })
            );
          }
        },
        (err) => {
          console.info('Citizen geolocation prompt notice:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [user?.id, user?.role]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-red-600 selection:text-white flex flex-col">
      {/* Sticky Navbar */}
      <Navbar
        onOpenSos={() => setSosModalOpen(true)}
        onOpenReports={() => setReportsModalOpen(true)}
      />

      {/* Persistent Citizen Phone Alert Widget (Top Right - Không 3 chấm, xuống dòng tự nhiên không để chữ mồ côi) */}
      {isCitizenWithoutPhone && (
        <aside
          aria-label="Cảnh báo bổ sung số điện thoại"
          className="fixed top-[74px] right-3 sm:right-6 z-40 sm:max-w-md w-auto animate-fadeIn"
        >
          <div className="relative bg-white/95 backdrop-blur-md border border-amber-300 rounded-2xl shadow-xl hover:shadow-2xl hover:border-amber-400 p-3 sm:p-3.5 text-slate-900 transition-all duration-300">
            <div className="flex items-center gap-3">
              {/* Emergency Pulse Icon */}
              <div className="relative p-2.5 rounded-xl bg-amber-500/15 border border-amber-300/80 text-amber-600 shrink-0">
                <PhoneCall className="w-4 h-4 text-amber-600" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                </span>
              </div>

              {/* Text Info - Không dùng 3 chấm, xuống dòng tự nhiên không để chữ mồ côi */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Chưa có số điện thoại
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed text-pretty">
                  Bổ sung SĐT để lực lượng cứu hộ liên hệ xác minh hiện trường khi&nbsp;gửi&nbsp;SOS.
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => setPhoneModalOpen(true)}
                className="shrink-0 py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Cập nhật</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Landing Flow */}
      <main className="flex-grow">
        {/* Hero Section */}
        <HeroSection
          onOpenSos={() => setSosModalOpen(true)}
          onOpenReports={() => setReportsModalOpen(true)}
        />

        {/* Features Section */}
        <FeaturesSection />

        {/* AI Highlight Section (Interactive VLM Showcase) */}
        <AiHighlightSection />

        {/* How It Works (4-Step Horizontal Stepper) */}
        <HowItWorksSection />

        {/* Role-Based Solution Cards */}
        <RoleSolutionsSection onOpenSos={() => setSosModalOpen(true)} />

        {/* National Hotlines Direct Contact Banner */}
        <HotlineBannerSection onOpenSos={() => setSosModalOpen(true)} />
      </main>

      {/* Footer */}
      <Footer onOpenSos={() => setSosModalOpen(true)} />

      {/* Emergency SOS Modal with Mapbox */}
      <SosModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        onOpenReports={() => setReportsModalOpen(true)}
      />

      {/* Citizen Report History Modal */}
      <CitizenReportsModal
        isOpen={reportsModalOpen}
        onClose={() => setReportsModalOpen(false)}
      />

      {/* Citizen Quick Phone Setup Modal */}
      <CitizenPhoneModal
        isOpen={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
      />

      {/* Floating Back to Top Button */}
      <BackToTop />
    </div>
  );
};
