import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DispatchPanel } from '../../components/operator/livemap/DispatchPanel';
import { LiveMapView } from '../../components/operator/livemap/LiveMapView';
import { useDispatchStore } from '../../context/DispatchContext';
import { useDispatchRoutes } from '../../hooks/useDispatchRoutes';

/**
 * Live Map: bản đồ + bảng điều phối tổ luôn hiện bên phải.
 * Quản lý xe của trạm nằm ở màn "Đội xe" (VehiclesPage), không còn panel Phương tiện / Trạm ở đây.
 */
export const LiveMapPage: React.FC = () => {
  const { vehicles, incidents, stations, trafficJams, resolveTrafficJam } = useDispatchStore();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  // Tablet/màn hình < 1024px: panel thu thành Bottom Sheet (FR-OP-01).
  const [sheetOpen, setSheetOpen] = useState(true);
  const location = useLocation();

  const dispatchIncidents = useMemo(() => incidents.filter((i) => i.status === 'approved'), [incidents]);
  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const incidentsById = useMemo(() => new Map(incidents.map((i) => [i.id, i])), [incidents]);
  const routes = useDispatchRoutes(incidents, vehicles);

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicleId((current) => (current === id ? null : id));
  };

  // Bấm marker sự cố trên bản đồ → chọn sự cố đó trong bảng điều phối.
  const handleSelectIncident = (id: string | null) => {
    setSelectedIncidentId(id);
    if (id) setSheetOpen(true);
  };

  // Mở từ banner leo thang / thông báo ("Điều phối") → chọn sẵn sự cố đó.
  const focusIncidentId = (location.state as { focusIncidentId?: string } | null)?.focusIncidentId;
  useEffect(() => {
    if (focusIncidentId) handleSelectIncident(focusIncidentId);
  }, [focusIncidentId, location.key]);

  return (
    <div className="h-full flex relative overflow-hidden">
      <div className="flex-1 lg:flex-none lg:basis-[65%] min-w-0 h-full relative">
        <LiveMapView
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={handleSelectVehicle}
          dispatchIncidents={dispatchIncidents}
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={handleSelectIncident}
          stations={stations}
          trafficJams={trafficJams}
          onResolveTrafficJam={resolveTrafficJam}
          routes={routes}
          vehiclesById={vehiclesById}
          incidentsById={incidentsById}
        />
      </div>

      <div
        className={`z-[1100] bg-white flex flex-col transition-[height] duration-300
          absolute inset-x-0 bottom-0 rounded-t-2xl shadow-[0_-8px_24px_rgba(15,23,42,0.18)] ${sheetOpen ? 'h-[55%]' : 'h-11'}
          lg:static lg:h-full lg:basis-[35%] lg:min-w-[340px] lg:rounded-none lg:shadow-none`}
      >
        <button
          onClick={() => setSheetOpen((v) => !v)}
          className="lg:hidden shrink-0 h-11 flex items-center justify-center gap-2 border-b border-slate-200 text-xs font-bold text-slate-600"
          aria-label={sheetOpen ? 'Thu gọn bảng điều phối' : 'Mở bảng điều phối'}
        >
          <span className="w-10 h-1 rounded-full bg-slate-300" />
          {sheetOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          Điều phối sự cố
        </button>
        <div className={`flex-1 min-h-0 ${sheetOpen ? '' : 'hidden lg:block'}`}>
          <DispatchPanel selectedIncidentId={selectedIncidentId} onSelectIncident={handleSelectIncident} />
        </div>
      </div>
    </div>
  );
};
