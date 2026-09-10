import React, { useState } from 'react';
import { X } from 'lucide-react';
import { StationMapPicker } from './StationMapPicker';
import { AREAS } from '../../../data/stationMock';
import type { StationRecord, StationStatus } from '../../../types/station';

interface StationFormDrawerProps {
  initialStation: StationRecord | null;
  onClose: () => void;
  onSave: (station: StationRecord) => void;
}

const DEFAULT_COORDS = { lat: 10.7756, lng: 106.7019 };

export const StationFormDrawer: React.FC<StationFormDrawerProps> = ({ initialStation, onClose, onSave }) => {
  const [name, setName] = useState(initialStation?.name ?? '');
  const [address, setAddress] = useState(initialStation?.address ?? '');
  const [area, setArea] = useState(initialStation?.area ?? AREAS[0]);
  const [radius, setRadius] = useState(initialStation?.coverageRadiusKm ?? 3);
  const [status, setStatus] = useState<StationStatus>(initialStation?.status ?? 'active');
  const [coords, setCoords] = useState({
    lat: initialStation?.lat ?? DEFAULT_COORDS.lat,
    lng: initialStation?.lng ?? DEFAULT_COORDS.lng,
  });

  const isValid = name.trim().length > 0 && address.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    onSave({
      id: initialStation?.id ?? `st-${Date.now()}`,
      name: name.trim(),
      address: address.trim(),
      area,
      lat: coords.lat,
      lng: coords.lng,
      coverageRadiusKm: radius,
      status,
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={onClose} />

      <aside className="fixed top-0 right-0 h-full w-full max-w-lg bg-white border-l border-slate-200 z-[1401] flex flex-col shadow-2xl shadow-slate-900/20 animate-drawer-in">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">{initialStation ? 'Chỉnh sửa trạm' : 'Thêm trạm mới'}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-500 font-semibold">
                Tên trạm *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-500 font-semibold">
                Địa chỉ *
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-500 font-semibold">
                  Khu vực
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500"
                >
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-500 font-semibold">
                  Bán kính phủ sóng (km)
                </label>
                <input
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-500 font-semibold">
                Trạng thái
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('active')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    status === 'active'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'border-slate-300 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Đang hoạt động
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('inactive')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    status === 'inactive'
                      ? 'bg-slate-100 border-slate-400 text-slate-700'
                      : 'border-slate-300 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Ngưng hoạt động
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-500 font-semibold">
                Vị trí trên bản đồ{' '}
                <span className="text-slate-400 normal-case font-normal">(bấm để đặt / kéo marker)</span>
              </label>
              <div className="h-64 rounded-lg overflow-hidden border border-slate-200">
                <StationMapPicker
                  lat={coords.lat}
                  lng={coords.lng}
                  radiusKm={radius}
                  onChange={(lat, lng) => setCoords({ lat, lng })}
                />
              </div>
              <p className="text-[11px] font-mono-data text-slate-500">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            </div>
          </div>

          <div className="shrink-0 p-4 border-t border-slate-200 mt-auto grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
            >
              Lưu trạm
            </button>
          </div>
        </form>
      </aside>
    </>
  );
};
