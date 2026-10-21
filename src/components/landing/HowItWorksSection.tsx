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
      subtitle: 'Bước 1 - Công nhân gửi báo cáo sự cố',
      icon: Camera,
      badgeColor: 'bg-red-600 text-white',
      badgeBorder: 'border-red-500',
      textColor: 'text-red-500',
      description: 'Công nhân/Người lao động phát tín hiệu SOS Cháy nổ hoặc Tai nạn chỉ với 1 chạm, hoặc gửi điểm Ùn tắc nội khu. Tọa độ GPS nhà xưởng và ảnh/video hiện trường được truyền trực tiếp về Trung tâm Chỉ huy.',
      bulletPoints: [
        'Nút SOS 1-chạm tự động lấy tọa độ GNSS nhà xưởng',
        'Chụp ảnh/video hiện trường hoặc gửi báo cáo ùn tắc cổng',
        'Offline Queue tự động lưu và gửi lại khi có mạng',
        'Giao diện tối ưu thao tác 1 tay trong tình huống khẩn cấp'
      ],
      mockMetric: 'Thời gian gửi: < 3.0s'
    },
    {
      step: 2,
      id: 'step-2',
      title: 'AI Phân tích hình ảnh & Đánh giá rủi ro',
      subtitle: 'Bước 2 - AI Vision Phân Tích Hiện Trường',
      icon: BrainCircuit,
      badgeColor: 'bg-red-600 text-white',
      badgeBorder: 'border-red-500',
      textColor: 'text-red-500',
      description: 'Hệ thống AI tự động quét ảnh/video hiện trường, nhận diện Cháy nổ, Tai nạn lao động / va chạm, phát hiện Ùn tắc và chấm cấp độ nghiêm trọng từ Cấp 1 đến Cấp 3.',
      bulletPoints: [
        'Phân loại đa nhãn thị giác máy tính chuẩn xác',
        'Chấm cấp độ nghiêm trọng Levels 1–3 tự động',
        'Cảnh báo điểm ùn tắc hỗ trợ dẫn đường cứu hộ',
        'Trường hợp nghi vấn xếp Cấp 0, không tự hủy'
      ],
      mockMetric: 'Tốc độ suy luận AI: ≤ 20s'
    },
    {
      step: 3,
      id: 'step-3',
      title: 'Thẩm định Operator & Điều phối xe gần nhất',
      subtitle: 'Bước 3 - Human-in-the-Loop & Thuật toán',
      icon: Truck,
      badgeColor: 'bg-red-600 text-white',
      badgeBorder: 'border-red-500',
      textColor: 'text-red-500',
      description: 'Điều phối viên thẩm định đối chiếu media với kết quả AI, xác nhận hoặc ghi đè cấp độ. Hệ thống tính toán trạm PCCC, Trạm Y tế, Chốt an ninh KCN gần nhất theo thuật toán Nearest-Available hoặc Load-Aware để xuất xe lập tức.',
      bulletPoints: [
        'Thẩm định Human-in-the-Loop có khóa mềm chống xung đột',
        'Thuật toán Nearest-Available và Load-Aware né điểm ùn tắc',
        'Tự động mở rộng bán kính tìm xe (10 → 15 → 22.5 → 30 km)',
        'Hỗ trợ điều phối đồng thời 2–5 xe cho sự cố Cấp 3'
      ],
      mockMetric: 'Độ trễ điều phối: < 15s'
    },
    {
      step: 4,
      id: 'step-4',
      title: 'Tác chiến hiện trường & Đóng ca số hóa',
      subtitle: 'Bước 4 - Giám sát di chuyển & Nghiệm thu',
      icon: Navigation,
      badgeColor: 'bg-red-600 text-white',
      badgeBorder: 'border-red-500',
      textColor: 'text-red-500',
      description: 'Đội cứu hộ nhận chuông báo động, di chuyển theo Turn-by-Turn né kẹt xe, truyền GPS liên tục về dashboard và app công nhân. Kết thúc ca bằng báo cáo số kèm ảnh minh chứng hiện trường đã xử lý.',
      bulletPoints: [
        'Chuông báo ưu tiên cao, 120s xác nhận nhận nhiệm vụ',
        'Turn-by-Turn hiển thị điểm ùn tắc để chọn lộ trình tối ưu',
        'Cập nhật trạng thái tuần tự Accepted → EnRoute → OnScene',
        'Báo cáo số hóa bắt buộc kèm ảnh hiện trường sau xử lý'
      ],
      mockMetric: 'Đồng bộ SignalR: < 500ms'
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
