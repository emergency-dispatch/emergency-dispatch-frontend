import React from 'react';
import { 
  Smartphone, 
  MonitorCheck, 
  Truck, 
  CheckCircle, 
  ArrowRight, 
  UserCheck,
  ShieldCheck,
  Building2
} from 'lucide-react';

interface RoleSolutionsSectionProps {
  onOpenSos: () => void;
}

export const RoleSolutionsSection: React.FC<RoleSolutionsSectionProps> = ({ onOpenSos }) => {
  const roles = [
    {
      id: 1,
      name: 'Công nhân / Người lao động',
      subtitle: 'Mobile Client · Web / PWA',
      icon: Smartphone,
      description: 'Giao diện không rào cản giúp công nhân phát tín hiệu SOS Cháy nổ & Tai nạn, định vị GPS nhà xưởng và báo cáo điểm ùn tắc nội khu.',
      features: [
        'Nút SOS 1 chạm tự động định vị GPS nhà xưởng',
        'Chụp ảnh/video hiện trường báo Cháy nổ & Tai nạn',
        'Báo cáo điểm ùn tắc giao thông cổng KCN (#Traffic_Jam)',
        'Bản đồ theo dõi trực tiếp vị trí xe cứu hộ & ETA',
        'Lịch sử báo cáo sự cố & hàng đợi ngoại tuyến'
      ],
      actionLabel: 'Mở SOS báo nạn',
      actionType: 'sos'
    },
    {
      id: 2,
      name: 'Điều phối viên CAD',
      subtitle: 'Command Center · Web Dashboard',
      icon: MonitorCheck,
      description: 'Bàn điều khiển CAD cho điều phối viên an ninh KCN. Tự động xếp hạng ưu tiên theo phân tích AI, thẩm định Human-in-the-Loop và điều xe thông minh.',
      features: [
        'Live Map GIS thời gian thực toàn khu công nghệ cao',
        'Hàng đợi sự cố ưu tiên theo AI (Cấp 1–3 & Cấp 0)',
        'Thẩm định Human-in-the-Loop có khóa mềm chống trùng',
        'Gợi ý điều phối xe gần nhất (Nearest & Load-Aware)',
        'Giám sát điểm ùn tắc nội khu để dẫn đường tối ưu'
      ],
      actionLabel: 'Cổng điều phối viên',
      actionType: 'link',
      actionHref: '/login'
    },
    {
      id: 3,
      name: 'Lực lượng Cứu hộ & An ninh',
      subtitle: 'Rescue Staff · Mobile & Web Fallback',
      icon: Truck,
      description: 'Giao diện tác chiến hiện trường cho đội PCCC cơ sở, y tế và an ninh tuần tra KCN. Nhận lệnh tác chiến, dẫn đường né kẹt xe và lập báo cáo số.',
      features: [
        'Chuông cảnh báo ưu tiên cao, 120s xác nhận nhiệm vụ',
        'Turn-by-Turn hiển thị điểm ùn tắc né kẹt xe',
        'Truyền viễn trắc GPS 3–5s/lần về trung tâm chỉ huy',
        'Cập nhật trạng thái: Accepted → EnRoute → OnScene',
        'Báo cáo kết thúc số hóa bắt buộc kèm ảnh sau xử lý'
      ],
      actionLabel: 'Cổng đội phản ứng',
      actionType: 'link',
      actionHref: '/login'
    },
    {
      id: 4,
      name: 'Quản trị & Điều hành KCN',
      subtitle: 'System Administrator · Back-office',
      icon: ShieldCheck,
      description: 'Phân hệ quản trị tài sản an ninh KCN, thiết lập quy tắc leo thang tự động khi xảy ra thảm họa và quản lý phân quyền theo vai trò.',
      features: [
        'Quản lý danh bạ trạm cứu hỏa, chốt an ninh & bốt gác',
        'Quản lý đội xe chuyên dụng, xe chữa cháy mini & thiết bị',
        'Cấu hình quy tắc leo thang tự động (Escalation Daemon)',
        'Phân quyền tài khoản theo vai trò (RBAC 4 cấp)',
        'Ghi nhật ký kiểm toán không thể sửa xóa (Audit Trail)'
      ],
      actionLabel: 'Cổng quản trị viên',
      actionType: 'link',
      actionHref: '/login'
    }
  ];

  return (
    <section id="roles" className="py-20 bg-slate-50 relative overflow-hidden border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 shadow-sm whitespace-nowrap">
            <UserCheck className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs font-mono uppercase tracking-widest text-red-600 font-bold">
              Kiến trúc hệ thống
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Giải pháp chuyên biệt cho{' '}
            <span className="text-red-600">
              4 vai trò trong Khu Công nghiệp
            </span>
          </h2>

          <p className="text-base text-slate-600 leading-relaxed">
            Hệ sinh thái liên kết khép kín giữa công nhân nhà xưởng, trung tâm điều hành an ninh KCN, các đội phản ứng nhanh và ban quản lý.
          </p>
        </div>

        {/* 4 Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {roles.map((role) => {
            const Icon = role.icon;

            return (
              <div
                key={role.id}
                className="group relative rounded-2xl bg-white p-7 border border-slate-200 shadow-sm transition-all duration-300 flex flex-col justify-between h-full hover:shadow-md hover:border-red-300"
              >
                <div>
                  {/* Card Header Icon & Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border border-red-200 bg-red-50 text-red-600 whitespace-nowrap">
                      VAI TRÒ 0{role.id}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-red-600 transition-colors leading-snug">
                      {role.name}
                    </h3>
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">
                      {role.subtitle}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {role.description}
                  </p>

                  {/* Feature Checklist */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 mb-6">
                    {role.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-700 font-medium leading-tight">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-4 border-t border-slate-100">
                  {role.actionType === 'sos' ? (
                    <button
                      onClick={onOpenSos}
                      className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>{role.actionLabel}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  ) : (
                    <a
                      href={role.actionHref}
                      className="w-full py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 hover:text-red-600 font-bold text-sm border border-slate-200 hover:border-red-300 flex items-center justify-center gap-2 transition-all"
                    >
                      <span>{role.actionLabel}</span>
                      <ArrowRight className="w-4 h-4 text-red-600 shrink-0" />
                    </a>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
