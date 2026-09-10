import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock
} from 'lucide-react';

interface FooterProps {
  onOpenSos: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSos }) => {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600 font-sans relative overflow-hidden">
      
      {/* Top Banner Accent Line */}
      <div className="h-1 w-full bg-red-600"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8">
          
          {/* Col 1: Brand & Description (4 cols) */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center shadow-sm text-white shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span className="text-2xl font-black text-slate-900 tracking-wider inline-flex items-center">
                ResQ<span className="text-red-600 font-extrabold">-AI</span>
              </span>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
              Hệ thống tiếp nhận và điều phối cứu hộ khẩn cấp thông minh thế hệ mới. Ứng dụng mô hình AI thị giác máy tính, tối ưu hóa điều động và giám sát cứu nạn theo thời gian thực.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-slate-600">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-semibold whitespace-nowrap shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                CAD ENGINE ONLINE
              </span>
              <span className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-semibold whitespace-nowrap shadow-xs">
                ENCRYPTED TLS 1.3
              </span>
            </div>
          </div>

          {/* Col 2: Quick Role Portals (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-900 font-bold">
              Cổng tương tác
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={onOpenSos}
                  className="text-slate-600 hover:text-red-600 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Báo cáo SOS trực tuyến</span>
                  <span className="text-[10px] font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200 font-bold shrink-0">1-CHẠM</span>
                </button>
              </li>
              <li>
                <Link to="/login" className="text-slate-600 hover:text-red-600 transition-colors">
                  Cổng điều phối viên
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-600 hover:text-red-600 transition-colors">
                  Cổng đội phản ứng
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-slate-600 hover:text-red-600 transition-colors">
                  Đăng ký tài khoản
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="text-slate-600 hover:text-red-600 transition-colors">
                  Quên mật khẩu
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: National Hotlines (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-900 font-bold">
              Đầu số khẩn cấp
            </h4>
            <ul className="space-y-2 text-sm font-mono">
              <li>
                <a href="tel:113" className="text-slate-700 hover:text-red-600 transition-colors flex items-center justify-between gap-3 p-1.5 rounded hover:bg-white">
                  <span>113 - Cảnh sát</span>
                  <span className="text-xs text-red-600 font-bold shrink-0">An ninh</span>
                </a>
              </li>
              <li>
                <a href="tel:114" className="text-slate-700 hover:text-red-600 transition-colors flex items-center justify-between gap-3 p-1.5 rounded hover:bg-white">
                  <span>114 - Cứu hỏa &amp; Cứu nạn</span>
                  <span className="text-xs text-red-600 font-bold shrink-0">Hỏa hoạn</span>
                </a>
              </li>
              <li>
                <a href="tel:115" className="text-slate-700 hover:text-red-600 transition-colors flex items-center justify-between gap-3 p-1.5 rounded hover:bg-white">
                  <span>115 - Cấp cứu Y tế</span>
                  <span className="text-xs text-red-600 font-bold shrink-0">Y tế</span>
                </a>
              </li>
              <li>
                <a href="tel:111" className="text-slate-700 hover:text-red-600 transition-colors flex items-center justify-between gap-3 p-1.5 rounded hover:bg-white">
                  <span>111 - Bảo vệ Trẻ em</span>
                  <span className="text-xs text-slate-500 font-bold shrink-0">Tổng đài quốc gia</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Standards & Security (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-900 font-bold">
              Tiêu chuẩn &amp; Bảo mật
            </h4>
            <div className="space-y-2.5 text-xs text-slate-600 font-mono">
              <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tiêu chuẩn điều hành CAD khẩn cấp</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5 shadow-xs">
                <Lock className="w-4 h-4 text-red-600 shrink-0" />
                <span>Mã hóa đường truyền an toàn (TLS / AES)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Credits & Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div>
            © 2026 <strong className="text-slate-700">ResQ-AI</strong> Emergency Dispatch Platform.
          </div>
          <div className="flex items-center gap-4">
            <span>Dự án Khóa luận tốt nghiệp</span>
            <span>•</span>
            <span className="text-slate-600 font-semibold">CAD System Design</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
