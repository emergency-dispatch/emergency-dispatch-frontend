import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Menu,
  X,
  LogIn,
  AlertTriangle,
  ChevronRight,
  User,
  LogOut,
  LayoutDashboard,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth';
import { UserProfileModal } from '../profile/UserProfileModal';

interface NavbarProps {
  onOpenSos: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSos }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Tính năng', href: '#features' },
    { name: 'Công nghệ AI VLM', href: '#ai-technology' },
    { name: 'Quy trình Cứu hộ', href: '#workflow' },
    { name: 'Giải pháp Phân hệ', href: '#roles' },
    { name: 'Đường dây nóng', href: '#hotlines' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getRolePortal = () => {
    if (!user) return null;
    if (user.role === UserRole.RescueStaff) {
      return { label: 'Tác chiến Cứu hộ', path: '/staff', icon: Radio };
    }
    if (user.role === UserRole.Operator || user.role === UserRole.Admin) {
      return { label: 'Trung tâm CAD', path: '/dashboard', icon: LayoutDashboard };
    }
    return null;
  };

  const portal = getRolePortal();

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-800 shadow-2xl py-3.5'
            : 'bg-[#0F172A]/85 backdrop-blur-sm border-b border-slate-800/40 py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Clean Brand Logo */}
            <Link to="/" className="flex items-center gap-3 group shrink-0 whitespace-nowrap mr-8 xl:mr-12">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-blue-600 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-all duration-300 border border-slate-700">
                  <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>

              <div className="flex items-center whitespace-nowrap">
                <span className="text-2xl font-black tracking-wider text-white">
                  ResQ<span className="text-red-500 font-extrabold">-AI</span>
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center justify-center gap-8 xl:gap-10 text-sm font-medium whitespace-nowrap flex-1 px-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-slate-300 hover:text-white transition-colors duration-200 relative group py-1.5 whitespace-nowrap tracking-wide"
                >
                  {link.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-red-500 to-blue-500 transition-all duration-300 group-hover:w-full"></span>
                </a>
              ))}
            </nav>

            {/* Right Action Area */}
            <div className="hidden sm:flex items-center gap-3 shrink-0 whitespace-nowrap ml-8 xl:ml-12">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-2">
                  {portal && (
                    <Link
                      to={portal.path}
                      className="px-3.5 py-2 text-xs font-semibold text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800 rounded-xl transition-all flex items-center gap-1.5 font-mono-data shadow-sm"
                    >
                      <portal.icon className="w-3.5 h-3.5 text-blue-400" />
                      <span>{portal.label}</span>
                    </Link>
                  )}

                  <button
                    onClick={() => setProfileModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 flex items-center gap-2 text-xs text-slate-200 font-mono-data hover:border-slate-600 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {user.fullName?.substring(0, 2).toUpperCase() || 'U'}
                    </div>
                    <span className="max-w-[120px] truncate">{user.fullName}</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    title="Đăng xuất"
                    className="p-2 text-slate-400 hover:text-red-400 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all flex items-center gap-2 font-mono-data whitespace-nowrap shadow-sm hover:border-blue-500"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Đăng nhập</span>
                </Link>
              )}

              {/* Glowing Red Emergency SOS CTA */}
              <button
                onClick={onOpenSos}
                className="relative group px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-sm tracking-wide shadow-glow-red hover:shadow-glow-red-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-red-500 flex items-center gap-2 overflow-hidden whitespace-nowrap"
                id="nav-emergency-sos-btn"
              >
                <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></span>
                <AlertTriangle className="w-4 h-4 text-white animate-bounce shrink-0" />
                <span>Báo Cứu Nạn SOS</span>
                <span className="flex h-2 w-2 rounded-full bg-white animate-ping shrink-0"></span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={onOpenSos}
                className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-bold shadow-glow-red flex items-center gap-1 whitespace-nowrap"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>SOS</span>
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 border border-slate-700"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900/95 border-b border-slate-800 backdrop-blur-xl px-4 pt-4 pb-6 space-y-4">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>{link.name}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </a>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSos();
                }}
                className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-center shadow-glow-red flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Gửi Báo Sự Cố Khẩn Cấp (SOS)</span>
              </button>

              {isAuthenticated && user ? (
                <div className="space-y-2">
                  {portal && (
                    <Link
                      to={portal.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-2.5 rounded-lg bg-blue-900/50 hover:bg-blue-800/50 text-blue-200 font-semibold text-center border border-blue-700 flex items-center justify-center gap-2 text-sm"
                    >
                      <portal.icon className="w-4 h-4 text-blue-400" />
                      <span>{portal.label}</span>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-center border border-slate-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Hồ sơ cá nhân ({user.fullName})</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full py-2.5 rounded-lg bg-red-950/40 hover:bg-red-950/70 text-red-300 font-semibold text-center border border-red-900/50 flex items-center justify-center gap-2 text-sm"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-center border border-slate-700 flex items-center justify-center gap-2 text-sm"
                >
                  <LogIn className="w-4 h-4 text-blue-400" />
                  <span>Đăng nhập Cổng CAD</span>
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
