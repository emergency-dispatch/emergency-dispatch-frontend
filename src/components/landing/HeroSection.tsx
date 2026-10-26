import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Radio,
  Compass,
  Flame,
  ShieldCheck,
  Truck,
  Clock,
  ArrowRight,
  MapPin,
  Zap
} from 'lucide-react';
import { HeroRadarMap } from './HeroRadarMap';
import { useSosCooldown } from '../../hooks/useSosCooldown';
import { useTranslation } from '../../i18n';

interface HeroSectionProps {
  onOpenSos: () => void;
  onOpenReports?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenSos, onOpenReports }) => {
  const { t } = useTranslation();
  const { isCooldown, cooldownLabel } = useSosCooldown();
  const [etaTime, setEtaTime] = useState(135); // seconds
  const [radarStats, setRadarStats] = useState<{
    stationCount: number;
    unitCount: number;
    activeEtaMinutes: number | null;
  }>({
    stationCount: 0,
    unitCount: 0,
    activeEtaMinutes: null,
  });

  // ETA countdown simulator
  useEffect(() => {
    const timer = setInterval(() => {
      setEtaTime((prev) => (prev > 45 ? prev - 1 : 135));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatEta = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <section className="relative min-h-[680px] lg:h-screen pt-20 pb-4 sm:pt-22 sm:pb-5 overflow-hidden bg-slate-50 cad-grid-bg flex flex-col justify-between">
      {/* Subtle Warm Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-red-100/50 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full flex-1 flex flex-col justify-between">

        {/* 1. Headline */}
        <div className="text-center pt-1 pb-1 shrink-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-5xl mx-auto">
            <span className="text-red-600">AI Emergency</span> Dispatch &amp; Real-Time{' '}
            <span className="text-slate-900">Rescue Coordination</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-4xl mx-auto mt-1.5 font-medium">
            {t('citizen.landing.heroSubtitle')}
          </p>
        </div>

        {/* 2. Full-Width Tactical Map Card - Radar Map bự ra thêm */}
        <div className="w-full relative flex-1 flex flex-col my-2.5 sm:my-3 min-h-[280px] lg:min-h-[360px]">
          <div className="relative rounded-2xl bg-white p-3 sm:p-4 shadow-xl border border-slate-200 overflow-hidden group flex-1 flex flex-col justify-between">
            {/* Top HUD Header Bar */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs font-mono-data shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                <span className="text-red-600 font-bold tracking-wider">LIVE CAD INCIDENT RADAR</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-[11px] sm:text-xs">
                <span className="flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  <span>FREQ: 148.25 MHz</span>
                </span>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <span className="text-slate-700 font-semibold hidden sm:inline">GRID: SHTP-TP-THUDUC</span>
              </div>
            </div>

            {/* Interactive Real Mapbox CAD Tactical Radar Screen */}
            <HeroRadarMap
              etaTime={etaTime}
              formatEta={formatEta}
              onOpenReports={onOpenReports}
              onStatsUpdate={setRadarStats}
            />

            {/* Bottom Telemetry Strip */}
            <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono-data text-slate-600 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">DISPATCH STATUS:</span>
                <span className="text-red-600 font-bold">
                  {radarStats.stationCount > 0
                    ? t('citizen.landing.dispatchUnitsReady', { stations: radarStats.stationCount, units: radarStats.unitCount })
                    : t('citizen.landing.dispatchStatusReady')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600" />
                <span>
                  {t('citizen.landing.etaApproach')}{' '}
                  <strong className="text-slate-900">
                    {radarStats.activeEtaMinutes != null
                      ? `~${radarStats.activeEtaMinutes}m`
                      : formatEta(etaTime)}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Action Area */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 pt-1.5 pb-1 sm:pb-2 shrink-0">

          {/* Left Guide Note: How to Report */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 text-left w-full md:w-auto md:flex-1 max-w-md shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-red-600">
              <MapPin className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{t('citizen.landing.guideOneTouchTitle')}</span>
                <span className="text-[9px] font-mono-data px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 font-bold">{t('citizen.landing.guideOneTouchTag')}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                {t('citizen.landing.guideOneTouchDesc')}
              </p>
            </div>
          </div>

          {/* Center Main Action: Emergency SOS Button */}
          <button
            onClick={onOpenSos}
            disabled={isCooldown}
            className={`group relative px-8 py-3.5 sm:py-4 rounded-xl text-white font-black text-sm sm:text-base tracking-wide transition-all duration-300 border flex items-center justify-center gap-2.5 overflow-hidden whitespace-nowrap shrink-0 w-full sm:w-auto min-w-[220px] ${isCooldown
                ? 'bg-slate-400 border-slate-400 opacity-60 cursor-not-allowed shadow-none'
                : 'bg-red-600 hover:bg-red-700 border-red-600 shadow-lg shadow-red-500/30 hover:scale-[1.03] active:scale-[0.98] cursor-pointer'
              }`}
            id="hero-submit-sos-btn"
          >
            <AlertOctagon className={`w-5 h-5 text-white shrink-0 ${isCooldown ? '' : 'animate-bounce'}`} />
            <span>{isCooldown ? t('citizen.layout.cooldownLabel', { time: cooldownLabel }) : t('citizen.layout.reportSos')}</span>
            {!isCooldown && <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform shrink-0" />}
          </button>

          {/* Right Guide Note: AI Coordination */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 text-left w-full md:w-auto md:flex-1 max-w-md shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-red-600">
              <Zap className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{t('citizen.landing.guideAiTitle')}</span>
                <span className="text-[9px] font-mono-data px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 font-bold">{t('citizen.landing.guideAiTag')}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                {t('citizen.landing.guideAiDesc')}
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
