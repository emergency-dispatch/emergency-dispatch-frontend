import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  Radio, 
  ShieldCheck, 
  Zap, 
  Clock, 
  Server, 
  AlertCircle,
  Truck
} from 'lucide-react';

export const LiveTelemetryBar: React.FC = () => {
  const [activeIncidents, setActiveIncidents] = useState(14);
  const [dispatchedVehicles, setDispatchedVehicles] = useState(38);
  const [avgLatency, setAvgLatency] = useState(138);

  // Periodic subtle fluctuation simulator for live feeling
  useEffect(() => {
    const interval = setInterval(() => {
      setAvgLatency(135 + Math.floor(Math.random() * 12));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white border-y border-slate-200 py-3 px-4 sm:px-6 lg:px-8 font-mono-data text-xs overflow-hidden shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Left Status Marker */}
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
          </span>
          <span className="text-slate-900 font-bold tracking-wider">
            TRẠNG THÁI HỆ THỐNG: <span className="text-red-600 font-extrabold">HOẠT ĐỘNG 24/7</span>
          </span>
          <span className="hidden sm:inline-block text-slate-300">|</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-500">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span>KHU VỰC: VIETNAM-HN-01</span>
          </span>
        </div>

        {/* Real-Time Metrics Ticker */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-600">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-red-500" />
            <span>Phân tích AI: <strong className="text-slate-900">{avgLatency}ms</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-slate-500" />
            <span>Lực lượng trực chiến: <strong className="text-slate-900">{dispatchedVehicles} Phương tiện</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span>Hàng đợi tiếp nhận: <strong className="text-red-600">{activeIncidents} Vụ việc</strong></span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Bảo mật dữ liệu: <strong className="text-slate-900">Chuẩn An ninh Quốc gia</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
};
