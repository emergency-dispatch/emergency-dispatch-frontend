import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  X,
  LogIn,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  User,
  LogOut,
  LayoutDashboard,
  Radio,
  Settings,
  Layers,
  Bot,
  Activity,
  Users,
  PhoneCall,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSosCooldown } from '../../hooks/useSosCooldown';
import { UserRole } from '../../types/auth';
import { UserProfileModal } from '../profile/UserProfileModal';
import { getAvatarUrl, DEFAULT_AVATAR } from '../../utils/avatar';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { useTranslation } from '../../i18n';

interface NavbarProps {
  onOpenSos: () => void;
  onOpenReports?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSos, onOpenReports }) => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const { isCooldown, cooldownLabel } = useSosCooldown();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);
  const [isHeroMapExpanded, setIsHeroMapExpanded] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      setIsHeroMapExpanded(Boolean((e as CustomEvent<boolean>).detail));
    };
    window.addEventListener('resq_hero_map_fullscreen', handler);
    return () => window.removeEventListener('resq_hero_map_fullscreen', handler);
  }, []);

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const featuresDropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (featuresDropdownRef.current && !featuresDropdownRef.current.contains(e.target as Node)) {
        setFeaturesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const featureItems = [
    {
      name: t('citizen.layout.navCadTitle'),
      href: '#features',
      desc: t('citizen.layout.navCadDesc'),
      icon: Layers,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      name: t('citizen.layout.navAiTitle'),
      href: '#ai-technology',
      desc: t('citizen.layout.navAiDesc'),
      icon: Bot,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      name: t('citizen.layout.navWorkflowTitle'),
      href: '#workflow',
      desc: t('citizen.layout.navWorkflowDesc'),
      icon: Activity,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      name: t('citizen.layout.navRolesTitle'),
      href: '#roles',
      desc: t('citizen.layout.navRolesDesc'),
      icon: Users,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  ];

  const handleFeaturesMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setFeaturesDropdownOpen(true);
  };

  const handleFeaturesMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setFeaturesDropdownOpen(false);
    }, 150);
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logout('/');
  };

  const getRolePortal = () => {
    if (!user) return null;
    if (user.role === UserRole.RescueStaff) {
      return { label: t('citizen.layout.staffPortal'), path: '/staff', icon: Radio };
    }
    if (user.role === UserRole.Operator) {
      return { label: t('citizen.layout.cadPortal'), path: '/dashboard', icon: LayoutDashboard };
    }
    if (user.role === UserRole.Admin) {
      return { label: t('citizen.layout.adminPortal'), path: '/admin/overview', icon: LayoutDashboard };
    }
    return null;
  };

  const portal = getRolePortal();

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${isHeroMapExpanded
            ? '-translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
          } ${isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm py-3'
            : 'bg-white/90 backdrop-blur-sm border-b border-slate-200/60 py-3.5'
          }`}
      >
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex items-center justify-between h-11">
            {/* Clean Brand Logo */}
            <Link
              to="/"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center group shrink-0 whitespace-nowrap mr-4 xl:mr-8"
            >
              <img
                src="/brand-logo.png"
                alt="ResQ-AI"
                className="h-9 xl:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </Link>

            {/* Desktop Navigation: Clutter-free with grouped Features Dropdown */}
            <nav className="hidden lg:flex items-center justify-center gap-6 xl:gap-8 text-xs xl:text-sm font-medium whitespace-nowrap px-2">
              {/* Features & Solutions Dropdown */}
              <div
                className="relative"
                ref={featuresDropdownRef}
                onMouseEnter={handleFeaturesMouseEnter}
                onMouseLeave={handleFeaturesMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setFeaturesDropdownOpen((v) => !v)}
                  className={`flex items-center gap-1.5 py-1.5 transition-colors duration-200 tracking-wide font-semibold ${featuresDropdownOpen ? 'text-red-600' : 'text-slate-700 hover:text-red-600'
                    }`}
                >
                  <span>{t('citizen.layout.features')}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${featuresDropdownOpen ? 'rotate-180 text-red-600' : ''
                      }`}
                  />
                </button>

                {/* Dropdown Card */}
                {featuresDropdownOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2.5 w-80 xl:w-96 z-50">
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-xl p-2 overflow-hidden animate-fadeIn">
                      <div className="grid grid-cols-1 gap-1">
                        {featureItems.map((item) => (
                          <a
                            key={item.name}
                            href={item.href}
                            onClick={() => setFeaturesDropdownOpen(false)}
                            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-all duration-200 group/item"
                          >
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border bg-red-50 text-red-600 border-red-100 group-hover/item:scale-105 transition-transform"
                            >
                              <item.icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 group-hover/item:text-red-600 transition-colors">
                                  {item.name}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0.5 transition-all" />
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                                {item.desc}
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Hotline Anchor Link */}
              <a
                href="#hotlines"
                className="text-slate-700 hover:text-red-600 transition-colors duration-200 relative group py-1.5 flex items-center gap-1.5 tracking-wide font-semibold"
              >
                <PhoneCall className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>{t('citizen.layout.hotlines')}</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
            </nav>

            {/* Right Action Area: Portal (if any) -> SOS CTA -> Language Switcher -> Profile / Sign In */}
            <div className="hidden sm:flex items-center gap-2.5 xl:gap-3 shrink-0 whitespace-nowrap ml-auto">
              {/* Dedicated Portal Button if Operator/Staff/Admin */}
              {isAuthenticated && user && portal && (
                <Link
                  to={portal.path}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-red-600 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 font-mono-data shadow-xs"
                >
                  <portal.icon className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span className="hidden md:inline">{portal.label}</span>
                </Link>
              )}

              {/* Language Switcher */}
              <LanguageSwitcher label={t('citizen.layout.language')} className="rounded-xl shadow-xs" />

              {/* Clean Red Emergency SOS CTA */}
              <button
                onClick={onOpenSos}
                disabled={isCooldown}
                className={`relative group px-4 xl:px-5 py-2 rounded-xl text-white font-bold text-xs xl:text-sm tracking-wide transition-all duration-200 flex items-center gap-2 overflow-hidden whitespace-nowrap shrink-0 ${isCooldown
                  ? 'bg-slate-400 opacity-60 cursor-not-allowed shadow-none'
                  : 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                  }`}
                id="nav-emergency-sos-btn"
                title={isCooldown ? t('citizen.layout.cooldownLabel', { time: cooldownLabel }) : t('citizen.layout.reportSos')}
              >
                <AlertTriangle className={`w-4 h-4 text-white shrink-0 ${isCooldown ? '' : 'animate-bounce'}`} />
                <span>{isCooldown ? t('citizen.layout.cooldownLabel', { time: cooldownLabel }) : t('citizen.layout.reportSos')}</span>
                {!isCooldown && <span className="flex h-2 w-2 rounded-full bg-white animate-ping shrink-0"></span>}
              </button>

              {/* User Profile on the rightmost (or Sign In if guest) */}
              {isAuthenticated && user ? (
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen((v) => !v)}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs text-slate-700 font-mono-data hover:border-red-500 transition-all shadow-xs"
                  >
                    <img
                      src={getAvatarUrl(user.avatarUrl, user.fullName)}
                      alt={user.fullName}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_AVATAR;
                      }}
                      className="w-6 h-6 rounded-lg object-cover shadow-xs shrink-0 border border-slate-200"
                    />
                    <span className="max-w-[90px] xl:max-w-[120px] truncate font-semibold text-slate-800">
                      {user.fullName}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50 animate-fadeIn">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-3">
                        <img
                          src={getAvatarUrl(user.avatarUrl, user.fullName)}
                          alt={user.fullName}
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_AVATAR;
                          }}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 shadow-xs"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono-data text-red-600 font-semibold uppercase">
                              {user.role}
                            </span>
                            {user.stationName && (
                              <span className="text-[10px] text-slate-500 truncate">
                                • {user.stationName}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono-data text-slate-400 truncate mt-0.5">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            setProfileModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors text-left"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t('citizen.layout.profile')}</span>
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onOpenReports?.();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors text-left"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t('citizen.layout.myReports')}</span>
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            setProfileModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors text-left"
                        >
                          <Settings className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t('citizen.layout.settings')}</span>
                        </button>
                      </div>

                      <div className="py-1 border-t border-slate-100">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left font-semibold"
                        >
                          <LogOut className="w-3.5 h-3.5 text-red-600" />
                          <span>{t('citizen.layout.signOut')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-red-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all flex items-center gap-2 font-mono-data whitespace-nowrap shadow-xs hover:border-red-500"
                >
                  <LogIn className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>{t('citizen.layout.signIn')}</span>
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={onOpenSos}
                disabled={isCooldown}
                className={`px-3 py-1.5 rounded-md text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap ${isCooldown
                  ? 'bg-slate-400 opacity-60 cursor-not-allowed shadow-none'
                  : 'bg-red-600 shadow-md shadow-red-500/30'
                  }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{isCooldown ? cooldownLabel : 'SOS'}</span>
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-lg bg-slate-100 border border-slate-200"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-4 pb-6 space-y-4 shadow-lg">
            <div className="space-y-3">
              {/* Language Switcher in Mobile Drawer */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-500">{t('citizen.layout.language')}</span>
                <LanguageSwitcher label={t('citizen.layout.language')} className="rounded-xl" />
              </div>

              {isAuthenticated && user ? (
                <div className="space-y-2">
                  {portal && (
                    <Link
                      to={portal.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-center border border-slate-200 flex items-center justify-center gap-2 text-sm"
                    >
                      <portal.icon className="w-4 h-4 text-red-600" />
                      <span>{portal.label}</span>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-semibold border border-slate-200 flex items-center justify-center gap-2 text-sm shadow-xs"
                  >
                    <img
                      src={getAvatarUrl(user.avatarUrl, user.fullName)}
                      alt={user.fullName}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_AVATAR;
                      }}
                      className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                    <span className="truncate">{t('citizen.layout.profile')} ({user.fullName})</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenReports?.();
                    }}
                    className="w-full py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-semibold text-center border border-slate-200 flex items-center justify-center gap-2 text-sm shadow-xs"
                  >
                    <Clock className="w-4 h-4 text-red-600" />
                    <span>{t('citizen.layout.myReports')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-center border border-red-200 flex items-center justify-center gap-2 text-sm"
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span>{t('citizen.layout.signOut')}</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-semibold text-center border border-slate-200 flex items-center justify-center gap-2 text-sm shadow-xs"
                >
                  <LogIn className="w-4 h-4 text-red-600" />
                  <span>{t('citizen.layout.signIn')}</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </>
  );
};
