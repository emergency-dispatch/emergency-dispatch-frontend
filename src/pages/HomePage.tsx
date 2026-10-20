import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { HeroSection } from '../components/landing/HeroSection';
import { LiveTelemetryBar } from '../components/landing/LiveTelemetryBar';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { AiHighlightSection } from '../components/landing/AiHighlightSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { RoleSolutionsSection } from '../components/landing/RoleSolutionsSection';
import { HotlineBannerSection } from '../components/landing/HotlineBannerSection';
import { Footer } from '../components/layout/Footer';
import { SosModal, CitizenReportsModal } from '../components/citizen';
import { BackToTop } from '../components/common/BackToTop';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth';
import { mapboxService } from '../services/mapboxService';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);

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
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-red-600 selection:text-white flex flex-col">
      {/* Sticky Navbar */}
      <Navbar
        onOpenSos={() => setSosModalOpen(true)}
        onOpenReports={() => setReportsModalOpen(true)}
      />

      {/* Main Landing Flow */}
      <main className="flex-grow">
        {/* Hero Section */}
        <HeroSection onOpenSos={() => setSosModalOpen(true)} />

        {/* Real-Time Telemetry Bar */}
        <LiveTelemetryBar />

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

      {/* Floating Back to Top Button */}
      <BackToTop />
    </div>
  );
};
