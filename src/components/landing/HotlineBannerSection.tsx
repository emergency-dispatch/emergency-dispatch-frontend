import React from 'react';
import { 
  PhoneCall, 
  ShieldAlert, 
  Flame, 
  HeartPulse, 
  AlertOctagon,
  ArrowUpRight
} from 'lucide-react';

interface HotlineBannerSectionProps {
  onOpenSos: () => void;
}

export const HotlineBannerSection: React.FC<HotlineBannerSectionProps> = ({ onOpenSos }) => {
  const hotlines = [
    {
      number: '113',
      name: 'Cảnh sát phản ứng nhanh',
      vietnameseName: 'An ninh, trật tự & tội phạm',
      icon: ShieldAlert,
      badge: 'An ninh trật tự',
      tel: 'tel:113'
    },
    {
      number: '114',
      name: 'Cứu hỏa & Cứu nạn cứu hộ',
      vietnameseName: 'Hỏa hoạn, nổ & mắc kẹt',
      icon: Flame,
      badge: 'Cứu nạn cứu hộ',
      tel: 'tel:114'
    },
    {
      number: '115',
      name: 'Cấp cứu y tế khẩn cấp',
      vietnameseName: 'Tai nạn chấn thương & đột quỵ',
      icon: HeartPulse,
      badge: 'Y tế khẩn cấp',
      tel: 'tel:115'
    }
  ];

  return (
    <section id="hotlines" className="py-20 bg-white relative overflow-hidden border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 whitespace-nowrap">
              <PhoneCall className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="text-xs font-mono text-red-600 font-bold uppercase tracking-wider">
                Đường dây nóng quốc gia
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Đầu số khẩn cấp toàn quốc
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
              Trong các tình huống đe dọa trực tiếp tính mạng, gọi ngay đường dây nóng chuyên trách hoặc dùng nút SOS của ResQ-AI để điều phối đa lực lượng đồng thời.
            </p>
          </div>

          <button
            onClick={onOpenSos}
            className="self-start md:self-auto px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm flex items-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>Phát tín hiệu SOS ngay</span>
          </button>
        </div>

        {/* Hotline Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {hotlines.map((hotline) => {
            const Icon = hotline.icon;

            return (
              <a
                key={hotline.number}
                href={hotline.tel}
                className="group rounded-2xl bg-slate-50 p-6 border border-slate-200 transition-all duration-200 flex flex-col justify-between h-full hover:border-red-400 hover:bg-red-50/20 hover:shadow-sm relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono text-slate-600 px-2.5 py-1 rounded-md bg-white border border-slate-200 whitespace-nowrap font-medium">
                      {hotline.badge}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-black font-mono text-red-600 whitespace-nowrap">
                        {hotline.number}
                      </span>
                      <span className="text-xs font-mono text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
                        MIỄN CƯỚC 24/7
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-2 leading-snug">
                      {hotline.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hotline.vietnameseName}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-red-600 group-hover:text-red-700 transition-colors">
                  <span className="whitespace-nowrap">Chạm để gọi ngay</span>
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </div>
              </a>
            );
          })}
        </div>

      </div>
    </section>
  );
};
