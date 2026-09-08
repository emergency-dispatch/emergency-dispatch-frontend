import React, { useState } from 'react';
import { QrCode, ScanLine, CheckCircle2, Hospital, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';

interface StaffQrHandoverProps {
  missionId: string;
  incidentId: string;
  onScanSuccess: (data: { entity: string; contact: string; phone: string }) => void;
  currentEntity?: string;
}

const PRESET_RECEIVERS = [
  {
    name: 'Bệnh Viện Cấp Cứu 115 TP.HCM',
    contact: 'BS. Lê Minh Trí (Trưởng Kíp Cấp Cứu Ngoại Viện)',
    phone: '028 3865 2368',
    type: 'medical',
  },
  {
    name: 'Công An Phường Bến Nghé (Quận 1)',
    contact: 'Trung Tá Phan Hoàng Hải (Trưởng Ca Trực Ban)',
    phone: '028 3829 7890',
    type: 'police',
  },
  {
    name: 'Đội Khám Nghiệm & Điều Tra PCCC',
    contact: 'Đại Úy Trần Quốc Toàn (Phó Ban Chỉ Huy PCCC)',
    phone: '0903 114 999',
    type: 'investigation',
  },
];

export const StaffQrHandover: React.FC<StaffQrHandoverProps> = ({
  missionId,
  incidentId,
  onScanSuccess,
  currentEntity,
}) => {
  const [activeTab, setActiveTab] = useState<'scanner' | 'generator'>('scanner');
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [scannedEntity, setScannedEntity] = useState<string>(currentEntity || '');

  const handleSimulatedScan = (receiver: typeof PRESET_RECEIVERS[0]) => {
    setIsScanning(false);
    setScannedEntity(receiver.name);
    onScanSuccess({
      entity: receiver.name,
      contact: receiver.contact,
      phone: receiver.phone,
    });
  };

  const handleRescan = () => {
    setIsScanning(true);
    setScannedEntity('');
  };

  return (
    <div className="space-y-3 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
      {/* Tabs switch */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <label className="text-xs font-mono-data font-bold uppercase text-slate-300 flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5 text-cyan-400" />
          Xác Nhận Bàn Giao Hiện Trường & Nạn Nhân
        </label>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              activeTab === 'scanner'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Quét Mã QR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              activeTab === 'generator'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tạo Mã QR Bàn Giao
          </button>
        </div>
      </div>

      {activeTab === 'scanner' ? (
        <div className="space-y-3">
          {/* Simulated Scanner Viewport */}
          <div className="relative w-full h-44 bg-slate-950 rounded-xl border border-dashed border-cyan-500/40 overflow-hidden flex flex-col items-center justify-center">
            {isScanning ? (
              <>
                {/* Laser scan line animation */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] animate-pulse top-1/2 -translate-y-1/2" />

                {/* Reticle brackets */}
                <div className="w-32 h-32 border-2 border-cyan-400/80 rounded-lg relative flex items-center justify-center bg-cyan-950/20">
                  <ScanLine className="w-12 h-12 text-cyan-400 animate-pulse" />
                </div>

                <div className="mt-2 text-xs font-mono-data text-cyan-300">
                  Đang hướng camera về mã QR đơn vị tiếp nhận...
                </div>
              </>
            ) : (
              <div className="text-center p-4 space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-white">Quét Xác Nhận Thành Công!</div>
                <div className="text-xs text-emerald-400 font-mono-data">{scannedEntity}</div>
                <button
                  type="button"
                  onClick={handleRescan}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Quét lại mã khác
                </button>
              </div>
            )}
          </div>

          {/* Quick preset trigger buttons (Simulation convenience) */}
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-400 font-mono-data">
              Hoặc chọn nhanh đơn vị tiếp nhận tại chỗ (Mô phỏng quét QR):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESET_RECEIVERS.map((receiver) => (
                <button
                  key={receiver.name}
                  type="button"
                  onClick={() => handleSimulatedScan(receiver)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all flex flex-col justify-between ${
                    scannedEntity === receiver.name
                      ? 'bg-emerald-950/60 border-emerald-500/80 text-white'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="font-semibold text-white leading-tight mb-1">{receiver.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{receiver.contact}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* QR Code Generator View */
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
          {/* High-res SVG QR Simulation */}
          <div className="w-36 h-36 bg-white p-2.5 rounded-xl shadow-lg shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full text-slate-950">
              <rect x="0" y="0" width="100" height="100" fill="white" />
              {/* Corner squares */}
              <rect x="5" y="5" width="26" height="26" fill="black" />
              <rect x="8" y="8" width="20" height="20" fill="white" />
              <rect x="11" y="11" width="14" height="14" fill="black" />

              <rect x="69" y="5" width="26" height="26" fill="black" />
              <rect x="72" y="8" width="20" height="20" fill="white" />
              <rect x="75" y="11" width="14" height="14" fill="black" />

              <rect x="5" y="69" width="26" height="26" fill="black" />
              <rect x="8" y="72" width="20" height="20" fill="white" />
              <rect x="11" y="75" width="14" height="14" fill="black" />

              {/* Data matrix dots */}
              <rect x="36" y="8" width="6" height="6" fill="black" />
              <rect x="46" y="8" width="6" height="6" fill="black" />
              <rect x="56" y="8" width="6" height="6" fill="black" />
              <rect x="36" y="20" width="6" height="6" fill="black" />
              <rect x="46" y="20" width="12" height="6" fill="black" />
              <rect x="8" y="36" width="6" height="6" fill="black" />
              <rect x="20" y="36" width="6" height="6" fill="black" />
              <rect x="36" y="36" width="26" height="26" fill="black" />
              <rect x="40" y="40" width="18" height="18" fill="white" />
              <rect x="44" y="44" width="10" height="10" fill="black" />
              <rect x="68" y="36" width="6" height="6" fill="black" />
              <rect x="80" y="36" width="12" height="6" fill="black" />
              <rect x="8" y="48" width="18" height="6" fill="black" />
              <rect x="68" y="48" width="6" height="18" fill="black" />
              <rect x="80" y="48" width="12" height="6" fill="black" />
              <rect x="36" y="68" width="6" height="12" fill="black" />
              <rect x="48" y="68" width="12" height="6" fill="black" />
              <rect x="68" y="74" width="24" height="6" fill="black" />
              <rect x="48" y="80" width="6" height="12" fill="black" />
              <rect x="60" y="80" width="12" height="12" fill="black" />
              <rect x="80" y="86" width="12" height="6" fill="black" />
            </svg>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="font-mono-data font-bold text-white text-sm">
              MÃ BÀN GIAO: <span className="text-cyan-400">{missionId}</span>
            </div>
            <p className="text-slate-300">
              Đưa mã QR này cho đại diện Bệnh viện / Công an quét để đồng bộ hồ sơ tiếp nhận hiện trường tức thì vào hệ thống CAD liên ngành.
            </p>
            <div className="text-[11px] font-mono-data text-slate-400">
              SHA256: 9f8a...3e12 • Ký số xác thực bởi Trung tâm Chỉ Huy
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
