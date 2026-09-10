import React from 'react';
import { 
  Smartphone, 
  MonitorCheck, 
  Truck, 
  CheckCircle, 
  ArrowRight, 
  UserCheck
} from 'lucide-react';

interface RoleSolutionsSectionProps {
  onOpenSos: () => void;
}

export const RoleSolutionsSection: React.FC<RoleSolutionsSectionProps> = ({ onOpenSos }) => {
  const roles = [
    {
      id: 1,
      name: 'Cổng thông tin người dân',
      subtitle: 'Phát tín hiệu SOS & Theo dõi thời gian thực',
      icon: Smartphone,
      description: 'Giao diện không rào cản giúp người dân gửi cảnh báo tức thì, tự động truyền tọa độ GPS, xem bản đồ xe cấp cứu và nhận hướng dẫn sơ cứu.',
      features: [
        'Nút SOS 1 chạm tự động định vị GPS chính xác',
        'Tải lên trực tiếp hình ảnh và bản ghi âm hiện trường',
        'Bản đồ theo dõi trực tiếp xe cứu thương / cứu hỏa',
        'Đồng bộ hồ sơ y tế khẩn cấp và người liên hệ',
        'Hướng dẫn sơ cứu CPR & cầm máu trong khi chờ đợi'
      ],
      actionLabel: 'Mở bản dùng thử SOS',
      actionType: 'sos'
    },
    {
      id: 2,
      name: 'Trung tâm điều hành CAD',
      subtitle: 'Bản đồ số & Hàng đợi sự cố tự động',
      icon: MonitorCheck,
      description: 'Bàn điều khiển CAD toàn diện cho nhân viên tổng đài. Tự động phân loại sự cố bằng AI, điều phối xe đa lực lượng và bản đồ nhiệt trực tiếp.',
      features: [
        'Bản đồ GIS thời gian thực hiển thị vị trí xe & sự cố',
        'Hàng đợi ưu tiên tự động và đánh giá mức độ nguy cấp',
        'Điều phối đa lực lượng (Cảnh sát 113, Cứu hỏa 114, Cấp cứu 115)',
        'Cảnh báo tình trạng ùn tắc giao thông & giường bệnh',
        'Truyền lệnh điều động tức thì tới thiết bị di động của đội'
      ],
      actionLabel: 'Cổng tổng đài viên',
      actionType: 'link',
      actionHref: '/login'
    },
    {
      id: 3,
      name: 'Thiết bị đội phản ứng',
      subtitle: 'Dẫn đường tác chiến & Nhật ký số',
      icon: Truck,
      description: 'Giao diện chuyên dụng cho đội phản ứng tại hiện trường. Dẫn đường xe ưu tiên, nhận báo cáo nguy cơ AI, gắn thẻ nạn nhân và báo cáo đóng sự cố.',
      features: [
        'Dẫn đường GPS ưu tiên luồng giao thông khẩn cấp',
        'Phân loại và cập nhật tình trạng nạn nhân tại chỗ',
        'Báo cáo nguy hiểm trước khi đến (hóa chất, sập đổ, vũ khí)',
        'Liên kết truyền dữ liệu trước đến khoa cấp cứu bệnh viện',
        'Đóng ca sự cố và lập biên bản nhanh bằng giọng nói'
      ],
      actionLabel: 'Cổng đội cứu nạn',
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
              từng lực lượng tham gia
            </span>
          </h2>

          <p className="text-base text-slate-600 leading-relaxed">
            Hệ sinh thái liên kết đồng bộ người dân cần trợ giúp, tổng đài chỉ huy CAD và các lực lượng ứng cứu ngoài hiện trường.
          </p>
        </div>

        {/* 3 Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
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
