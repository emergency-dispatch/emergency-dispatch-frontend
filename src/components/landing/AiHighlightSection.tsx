import React, { useState } from 'react';
import { 
  Eye, 
  BrainCircuit, 
  AlertTriangle, 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle, 
  Cpu, 
  Layers, 
  Scan, 
  Zap, 
  ChevronRight,
  Sliders,
  Car,
  Users,
  Activity
} from 'lucide-react';

export const AiHighlightSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vlm' | 'risk' | 'resources'>('vlm');
  const [scanActive, setScanActive] = useState<boolean>(true);

  const tags = [
    { label: '#Vehicle_Rollover', confidence: '99.2%', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
    { label: '#Fire_Hazard', confidence: '96.8%', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
    { label: '#Extrication_Needed', confidence: '94.5%', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
    { label: '#Road_Obstruction', confidence: '98.1%', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
    { label: '#Multi_Casualty_Risk', confidence: '91.7%', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
    { label: '#VLM_Vision_Analysis', confidence: '99.8%', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
  ];

  return (
    <section id="ai-technology" className="py-20 sm:py-24 bg-slate-50 relative overflow-hidden border-t border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-100 shadow-xs whitespace-nowrap">
            <BrainCircuit className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs font-mono-data uppercase tracking-widest text-red-600 font-bold">
              CÔNG NGHỆ THỊ GIÁC AI VLM
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight text-balance">
            Phân Tích Hiện Trường &amp;{' '}
            <span className="text-red-600">
              Nhận Diện Mối Nguy
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
            Mô hình VLM đa phương thức phân tích ảnh hiện trường từ người dân trong 200ms để phát hiện va chạm, cháy nổ, kẹt người và vật thể nguy hiểm trước khi cuộc gọi kết thúc.
          </p>
        </div>

        {/* Main Interactive AI Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Visual AI Incident Demonstration Card */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="relative rounded-2xl bg-white p-4 sm:p-5 border border-slate-200 shadow-lg flex-1 flex flex-col justify-between overflow-hidden group">
              
              {/* Header Info */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></div>
                  <span className="text-xs font-mono-data font-bold text-slate-900 tracking-wider">
                    LUỒNG PHÂN TÍCH THỜI GIAN THỰC #VLM-9021
                  </span>
                </div>
                <button
                  onClick={() => setScanActive(!scanActive)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-mono-data text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors font-semibold"
                >
                  <Scan className="w-3.5 h-3.5 text-red-600" />
                  <span>{scanActive ? 'Quét AI: BẬT' : 'Quét AI: TẠM DỪNG'}</span>
                </button>
              </div>

              {/* Photo Card with AI Bounding Boxes */}
              <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner aspect-[16/10] sm:aspect-[16/9]">
                
                {/* Incident Image */}
                <img 
                  src="/assets/mock_traffic_accident.jpg" 
                  alt="AI Emergency Traffic Incident"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Laser Scanning Effect */}
                {scanActive && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-glow-cyan animate-scanline opacity-75 pointer-events-none"></div>
                )}

                {/* Bounding Box 1: Primary Collision Area */}
                <div className="absolute top-[35%] left-[25%] w-[48%] h-[46%] border-2 border-red-500 bg-red-500/10 rounded-lg pointer-events-none animate-pulse">
                  <div className="absolute -top-6 left-0 bg-red-600 text-white font-mono-data text-[10px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                    <Car className="w-3 h-3" />
                    <span>#Vehicle_Collision (99.2%)</span>
                  </div>
                </div>

                {/* Bounding Box 2: Fire / Thermal Flare */}
                <div className="absolute top-[48%] left-[58%] w-[18%] h-[30%] border-2 border-orange-500 bg-orange-500/15 rounded-md pointer-events-none">
                  <div className="absolute -top-6 right-0 bg-orange-600 text-white font-mono-data text-[10px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    <span>#Fire_Flare (96.8%)</span>
                  </div>
                </div>

                {/* Bounding Box 3: Responders on Scene */}
                <div className="absolute top-[30%] right-[8%] w-[16%] h-[40%] border-2 border-blue-500 bg-blue-500/10 rounded-md pointer-events-none">
                  <div className="absolute -top-6 left-0 bg-blue-600 text-white font-mono-data text-[10px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>#Personnel (94.5%)</span>
                  </div>
                </div>

                {/* Corner HUD Overlay */}
                <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-3 py-1.5 rounded-lg font-mono-data text-[11px] text-slate-300 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>LATENCY: <strong className="text-white">142ms</strong></span>
                  <span className="text-slate-600">|</span>
                  <span>TOKENS: <strong className="text-white">1,280</strong></span>
                </div>

              </div>

              {/* Surrounding AI Inference Tags */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-mono-data uppercase tracking-wider mb-2 flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-red-600" />
                  Mối nguy &amp; Thực thể hiện trường được trích xuất:
                </p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span 
                      key={tag.label} 
                      className="px-2.5 py-1 rounded-lg text-xs font-mono-data font-bold bg-slate-50 text-slate-800 border border-slate-200 hover:border-red-500 hover:text-red-600 transition-all cursor-default"
                    >
                      {tag.label} <span className="opacity-75 text-[10px] text-red-600">[{tag.confidence}]</span>
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: AI Triage & Severity Score Panel */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            
            {/* Severity Level Banner Card */}
            <div className="rounded-2xl bg-white p-6 border-2 border-red-500 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Đánh Giá Mức Độ Khẩn Cấp</h3>
                    <p className="text-xs font-mono-data text-red-600 font-bold">KẾT QUẢ AI TRIAGE TỰ ĐỘNG</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="px-3 py-1 rounded-lg bg-red-600 text-white font-black text-sm font-mono-data shadow-md">
                    Cấp 4 / 5
                  </div>
                  <span className="text-[10px] font-mono-data text-slate-500 font-bold">MỨC NGUY CƠ CAO</span>
                </div>
              </div>

              {/* 5-Step Severity Bar */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-[11px] font-mono-data text-slate-500 font-medium">
                  <span>Cấp 1: Nhẹ</span>
                  <span>Cấp 3: Vừa</span>
                  <span className="text-red-600 font-bold">Cấp 4: Khẩn Cấp</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 h-2.5">
                  <div className="bg-emerald-500 rounded-sm"></div>
                  <div className="bg-amber-500 rounded-sm"></div>
                  <div className="bg-orange-500 rounded-sm"></div>
                  <div className="bg-red-600 rounded-sm shadow-sm animate-pulse"></div>
                  <div className="bg-slate-200 rounded-sm"></div>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                <strong className="text-slate-900">Kết luận AI:</strong> Va chạm giao thông động năng cao, nguy cơ rò rỉ nhiên liệu và kẹt nạn nhân trong cabin. Hệ thống đề xuất điều động đồng thời 1 xe cứu thương và 1 xe cứu hộ chuyên dụng.
              </p>
            </div>

            {/* Interactive Mode Tabs */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <span className="text-xs font-mono-data uppercase tracking-wider text-slate-500 font-bold">
                    Quy Trình AI Ra Quyết Định
                  </span>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setActiveTab('vlm')}
                      className={`px-3 py-1 text-xs font-mono-data rounded-md font-bold transition-all ${
                        activeTab === 'vlm' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      Nhận Diện
                    </button>
                    <button
                      onClick={() => setActiveTab('risk')}
                      className={`px-3 py-1 text-xs font-mono-data rounded-md font-bold transition-all ${
                        activeTab === 'risk' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      Phân Tích
                    </button>
                    <button
                      onClick={() => setActiveTab('resources')}
                      className={`px-3 py-1 text-xs font-mono-data rounded-md font-bold transition-all ${
                        activeTab === 'resources' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      Kế Hoạch Xe
                    </button>
                  </div>
                </div>

                {/* Tab 1: Perception Content */}
                {activeTab === 'vlm' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-700 font-mono-data">
                        <span className="text-red-600 font-bold">● Trích xuất đặc trưng thị giác VLM</span>
                        <span>Độ tin cậy: 99.1%</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-mono-data">
                        "Hai xe con va chạm trực diện biến dạng đầu xe. Cabin người lái bị chèn ép &gt; 30cm. Có khói bốc lên tại khoang động cơ xe bên phải."
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono-data text-emerald-600 font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      <span>Xác minh chống ảo giác AI: ĐẠT (Độ chính xác 99.8%)</span>
                    </div>
                  </div>
                )}

                {/* Tab 2: Risk Content */}
                {activeTab === 'risk' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono-data">
                        <span className="text-slate-700 font-medium">Xác suất kẹt nạn nhân trong xe</span>
                        <span className="text-red-600 font-bold">94.5% (Cao)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-red-600 h-full w-[94.5%]"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono-data">
                        <span className="text-slate-700 font-medium">Nguy cơ bùng phát cháy nổ</span>
                        <span className="text-amber-600 font-bold">88.2% (Trung bình - Cao)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full w-[88.2%]"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Resource Dispatch Content */}
                {activeTab === 'resources' && (
                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono-data">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-900 font-bold">1x Xe Cứu Thương Cấp Cứu 115</span>
                      </div>
                      <span className="text-emerald-600 font-bold">Dự kiến 3m 40s</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono-data">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-600"></span>
                        <span className="text-slate-900 font-bold">1x Xe Cứu Nạn Chữa Cháy 114</span>
                      </div>
                      <span className="text-red-600 font-bold">Dự kiến 2m 15s</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono-data">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span className="text-slate-900 font-bold">2x Tuần Tra Cảnh Sát Giao Thông 113</span>
                      </div>
                      <span className="text-blue-600 font-bold">Đã có mặt</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono-data text-slate-500">
                <span>Tối ưu hóa thuật toán</span>
                <span className="text-red-600 font-bold">Đồng Bộ CAD Đa Lực Lượng</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
