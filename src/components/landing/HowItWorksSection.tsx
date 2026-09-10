import React, { useState } from 'react';
import { 
  Camera, 
  BrainCircuit, 
  Truck, 
  Navigation, 
  CheckCircle2, 
  ArrowRight,
  Layers
} from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      step: 1,
      id: 'step-1',
      title: 'Kích hoạt SOS & Chụp ảnh hiện trường',
      subtitle: 'Bước 1 - Người dân gửi báo cáo',
      icon: Camera,
      badgeColor: 'bg-red-600 text-white',
      badgeBorder: 'border-red-500',
      textColor: 'text-red-500',
      description: 'Người dân phát tín hiệu khẩn cấp chỉ với 1 chạm. Tọa độ GPS chính xác cao, hình ảnh và ghi chú âm thanh được truyền trực tiếp về tổng đài mà không cần cài đặt ứng dụng phức tạp.',
      bulletPoints: [
        'Tự động định vị GPS chính xác sai số < 5m',
        'Truyền tải ảnh và âm thanh hiện trường tức thì',
        'Chế độ khẩn cấp im lặng khi gặp nguy hiểm',
        'Không rào cản đăng nhập, tối ưu thời gian'
      ],
      mockMetric: 'Thời gian gửi: < 3.2s'
    },
    {
      step: 2,
      id: 'step-2',
      title: 'AI Phân tích hình ảnh & Đánh giá rủi ro',
      subtitle: 'Bước 2 - Trợ lý thị giác VLM',
      icon: BrainCircuit,
      badgeColor: 'bg-red-600 text-white',
      badgeBorder: 'border-red-500',
      textColor: 'text-red-500',
      description: 'Mô hình Thị giác - Ngôn ngữ (VLM) tự động quét ảnh hiện trường, nhận diện loại tai nạn (Cháy nổ, Va chạm giao thông, Sập đổ), ước tính nạn nhân và gán cấp độ nghiêm trọng từ 1 đến 5.',
      bulletPoints: [
        'Nhận diện đa phương thức bằng thị giác máy tính',
        'Tự động lọc tin giả mạo và cuộc gọi rác',
        'Ước tính số lượng thương vong và mức độ nguy cấp',
        'Trích xuất đặc trưng rủi ro trong chưa đầy 200ms'
      ],
      mockMetric: 'Tốc độ suy luận AI: 142ms'
    },
    {
      step: 3,
      id: 'step-3',
      title: 'Điều phối lực lượng gần nhất tự động',
      subtitle: 'Bước 3 - Thuật toán định tuyến CAD',
      icon: Truck,
      badgeColor: 'bg-red-600 text-white',
      badgeBorder: 'border-red-500',
      textColor: 'text-red-500',
      description: 'Hệ thống CAD tự động tính toán trạm PCCC, Bệnh viện, Công an gần nhất còn trang thiết bị phù hợp và lộ trình giao thông thông thoáng nhất để xuất xe lập tức.',
      bulletPoints: [
        'Phối hợp đa lực lượng (Cứu hỏa, Y tế, Cảnh sát)',
        'Định tuyến thông minh theo tình trạng kẹt xe thời gian thực',
        'Phát lệnh cảnh báo tự động về thiết bị đội phản ứng',
        'Khớp nối chuyên biệt trang thiết bị với hiện trường'
      ],
      mockMetric: 'Độ trễ điều phối: < 15s'
    },
    {
      step: 4,
      id: 'step-4',
      title: 'Bản đồ trực tiếp & Đồng bộ thời gian ETA',
      subtitle: 'Bước 4 - Giám sát di chuyển thời gian thực',
      icon: Navigation,
      badgeColor: 'bg-red-600 text-white',
      badgeBorder: 'border-red-500',
      textColor: 'text-red-500',
      description: 'Người dân và tổng đài theo dõi hành trình xe cứu hộ trên bản đồ vệ tinh với thời gian đến dự kiến (ETA) liên tục cập nhật, kèm kênh thoại khẩn cấp và hướng dẫn sơ cứu.',
      bulletPoints: [
        'Theo dõi GPS thời gian thực độ trễ dưới 1 giây',
        'Liên tục cập nhật lại ETA theo luồng giao thông',
        'Kênh liên lạc thoại trực tiếp với đội cứu hộ',
        'Tự động lập nhật ký hành trình xử lý vụ việc'
      ],
      mockMetric: 'Đồng bộ dữ liệu: < 50ms'
    }
  ];

  return (
    <section id="workflow" className="py-20 bg-white border-t border-slate-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 shadow-sm whitespace-nowrap">
            <Layers className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs font-mono uppercase tracking-widest text-red-600 font-bold">
              Quy trình vận hành khẩn cấp
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Xử lý ứng cứu chuẩn xác trong{' '}
            <span className="text-red-600">
              4 bước tinh gọn
            </span>
          </h2>

          <p className="text-base text-slate-600 leading-relaxed">
            Từ lúc người dân kích hoạt SOS đến khi lực lượng tiếp cận hiện trường, quy trình được tự động hóa tối đa nhằm rút ngắn từng giây vàng cứu mạng.
          </p>
        </div>

        {/* 4-Step Stepper Header */}
        <div className="relative mb-10">
          {/* Connecting Track Line */}
          <div className="hidden md:block absolute top-7 left-[10%] right-[10%] h-0.5 bg-slate-200 z-0">
            <div 
              className="h-full bg-red-600 transition-all duration-500"
              style={{ width: `${((activeStep - 1) / 3) * 100}%` }}
            ></div>
          </div>

          {/* Stepper Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10 items-stretch">
            {steps.map((item) => {
              const Icon = item.icon;
              const isActive = activeStep === item.step;
              const isPast = activeStep > item.step;

              return (
                <button
                  key={item.step}
                  onClick={() => setActiveStep(item.step)}
                  className={`text-left p-4 rounded-xl transition-all duration-200 border flex flex-col justify-between h-full cursor-pointer ${
                    isActive 
                      ? 'bg-red-50/60 border-red-500 shadow-sm' 
                      : isPast
                        ? 'bg-white border-slate-300 hover:border-red-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-transform duration-200 shrink-0 ${
                      isActive 
                        ? 'bg-red-600 text-white' 
                        : isPast 
                          ? 'bg-red-100 text-red-600 border border-red-200' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`font-mono text-xs font-bold ${isActive ? 'text-red-600' : 'text-slate-400'}`}>
                      0{item.step}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1 font-semibold">
                      {item.subtitle}
                    </span>
                    <h3 className={`text-sm font-bold leading-snug transition-colors ${
                      isActive ? 'text-slate-900' : 'text-slate-700'
                    }`}>
                      {item.title}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Step Detailed Deep-Dive Card */}
        {steps.map((item) => {
          if (item.step !== activeStep) return null;

          return (
            <div 
              key={item.step}
              className="rounded-2xl bg-white p-6 sm:p-8 border border-slate-200 shadow-md transition-all duration-300"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* Left Step Overview */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-md text-xs font-mono font-bold bg-red-600 text-white shadow-sm">
                      BƯỚC 0{item.step} / 04
                    </div>
                    <span className="text-xs font-mono text-slate-500 font-semibold">
                      {item.mockMetric}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="text-base text-slate-600 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {item.bulletPoints.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                        <span className="text-xs text-slate-700 font-medium leading-tight">
                          {point}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                    {item.step < 4 ? (
                      <button
                        onClick={() => setActiveStep(item.step + 1)}
                        className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                      >
                        <span>Tiếp tục Bước 0{item.step + 1}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveStep(1)}
                        className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                      >
                        <span>Xem lại từ đầu</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Step CAD Console Graphic */}
                <div className="lg:col-span-5">
                  <div className="rounded-xl bg-slate-900 p-6 border border-slate-800 shadow-md relative overflow-hidden font-mono">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-[11px]">
                      <span className="text-slate-400">NHẬT KÝ VẬN HÀNH CAD</span>
                      <span className="font-bold text-red-400">TRỰC TUYẾN</span>
                    </div>

                    <div className="space-y-3 text-xs text-slate-300">
                      {item.step === 1 && (
                        <>
                          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                            <span className="text-red-400 font-bold">[14:32:01.04]</span> Nhận gói tin SOS từ ứng dụng công dân #8942
                          </div>
                          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                            <span className="text-slate-300 font-bold">[14:32:01.12]</span> Khóa định vị GPS: 21.0285, 105.8542 (±2.8m)
                          </div>
                          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                            <span className="text-emerald-400 font-bold">[14:32:01.45]</span> Đã tải lên 2 ảnh hiện trường &amp; 1 bản ghi âm
                          </div>
                        </>
                      )}

                      {item.step === 2 && (
                        <>
                          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                            <span className="text-amber-400 font-bold">[14:32:01.62]</span> VLM Engine khởi tạo tiến trình phân tích #VLM-9021
                          </div>
                          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                            <span className="text-slate-200 font-bold">[14:32:01.76]</span> Phân loại: Lật xe giao thông (0.99), Nguy cơ cháy (0.96)
                          </div>
                          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                            <span className="text-red-400 font-bold">[14:32:01.80]</span> Đánh giá: Mức độ 4 (Nghiêm trọng) -&gt; Đẩy cảnh báo
                          </div>
                        </>
                      )}

                      {item.step === 3 && (
                        <>
                          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                            <span className="text-slate-300 font-bold">[14:32:01.95]</span> Thuật toán quét bán kính trạm cứu hộ trong 5km
                          </div>
                          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                            <span className="text-emerald-400 font-bold">[14:32:02.10]</span> Xe cứu thương AM-04 tiếp nhận -&gt; Xuất phát
                          </div>
                          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                            <span className="text-red-400 font-bold">[14:32:02.25]</span> Xe cứu hỏa FE-09 tiếp nhận -&gt; Tối ưu lộ trình
                          </div>
                        </>
                      )}

                      {item.step === 4 && (
                        <>
                          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                            <span className="text-emerald-400 font-bold">[14:32:03.00]</span> Mở kênh WebSocket truyền vị trí xe đến điện thoại người dân
                          </div>
                          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                            <span className="text-slate-300 font-bold">[14:32:05.40]</span> Tốc độ AM-04: 68 km/h | Cập nhật ETA: 3 phút 40 giây
                          </div>
                          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                            <span className="text-blue-400 font-bold">[14:32:08.10]</span> Thiết lập kênh liên lạc khẩn cấp trực tiếp
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })}

      </div>
    </section>
  );
};
