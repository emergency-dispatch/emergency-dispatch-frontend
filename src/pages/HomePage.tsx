import React, { useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { HeroSection } from '../components/landing/HeroSection';
import { LiveTelemetryBar } from '../components/landing/LiveTelemetryBar';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { AiHighlightSection } from '../components/landing/AiHighlightSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { RoleSolutionsSection } from '../components/landing/RoleSolutionsSection';
import { HotlineBannerSection } from '../components/landing/HotlineBannerSection';
import { Footer } from '../components/layout/Footer';
import { SosModal } from '../components/landing/SosModal';
import { BackToTop } from '../components/common/BackToTop';

export const HomePage: React.FC = () => {
  const [sosModalOpen, setSosModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 selection:bg-red-600 selection:text-white flex flex-col">
      {/* Sticky Navbar */}
      <Navbar onOpenSos={() => setSosModalOpen(true)} />

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

      {/* Emergency SOS Modal */}
      <SosModal 
        isOpen={sosModalOpen} 
        onClose={() => setSosModalOpen(false)} 
      />

      {/* Floating Back to Top Button */}
      <BackToTop />
    </div>
  );
};
