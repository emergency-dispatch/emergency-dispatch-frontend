import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, Route } from 'lucide-react';
import { DispatchPanel } from '../../components/operator/livemap/DispatchPanel';
import { LiveMapView } from '../../components/operator/livemap/LiveMapView';
import { VehiclePanel } from '../../components/operator/livemap/VehiclePanel';
import { useDispatchStore } from '../../context/DispatchContext';
import type { VehicleFilters } from '../../types/vehicle';

const DEFAULT_FILTERS: VehicleFilters = { type: 'all', status: 'all', stationId: 'all' };

export const LiveMapPage: React.FC = () => {
  const { vehicles, incidents, stations, trafficJams, resolveTrafficJam } = useDispatchStore();
  const [filters, setFilters] = useState<VehicleFilters>(DEFAULT_FILTERS);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [dispatchMode, setDispatchMode] = useState(false);
  // Tablet/màn hình < 1024px: panel thu thành Bottom Sheet (FR-OP-01).
  const [sheetOpen, setSheetOpen] = useState(true);
  const location = useLocation();

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (filters.type !== 'all' && v.type !== filters.type) return false;
      if (filters.status !== 'all' && v.status !== filters.status) return false;
      if (filters.stationId !== 'all' && v.stationId !== filters.stationId) return false;
      return true;
    });
  }, [vehicles, filters]);

  const dispatchIncidents = useMemo(() => incidents.filter((i) => i.status === 'approved'), [incidents]);
  const pendingDispatchCount = useMemo(
    () => dispatchIncidents.filter((i) => i.assignedVehicleIds.length === 0).length,
    [dispatchIncidents]
  );
  const vehiclesById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const incidentsById = useMemo(() => new Map(incidents.map((i) => [i.id, i])), [incidents]);

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicleId((current) => (current === id ? null : id));
  };

  // Bấm marker sự cố trên bản đồ → mở chế độ điều phối và chọn luôn sự cố đó.
  const handleSelectIncident = (id: string | null) => {
    setSelectedIncidentId(id);
    if (id) {
      setDispatchMode(true);
      setSheetOpen(true);
    }
  };

  // Mở từ banner leo thang ("Điều phối") → chọn sẵn sự cố đó.
  const focusIncidentId = (location.state as { focusIncidentId?: string } | null)?.focusIncidentId;
  useEffect(() => {
    if (focusIncidentId) handleSelectIncident(focusIncidentId);
  }, [focusIncidentId, location.key]);

  return (
    <div className="h-full flex relative overflow-hidden">
      <div className="flex-1 lg:flex-none lg:basis-[65%] min-w-0 h-full relative">
        <LiveMapView
          vehicles={filteredVehicles}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={handleSelectVehicle}
          dispatchIncidents={dispatchIncidents}
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={handleSelectIncident}
          stations={stations}
          trafficJams={trafficJams}
          onResolveTrafficJam={resolveTrafficJam}
          vehiclesById={vehiclesById}
          incidentsById={incidentsById}
        />

        <button
          onClick={() => setDispatchMode((v) => !v)}
          className={`absolute top-4 right-4 z-[1000] flex items-center gap-2 px-3.5 py-2.5 rounded-xl border shadow-lg transition-colors ${
            dispatchMode
              ? 'bg-red-600 border-red-500 text-white'
              : pendingDispatchCount > 0
                ? 'cad-glass text-slate-600 hover:text-slate-900 animate-flash-critical'
                : 'cad-glass text-slate-600 hover:text-slate-900'
          }`}
        >
          <Route className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold whitespace-nowrap">Chế độ điều phối</span>
          {pendingDispatchCount > 0 && (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold shrink-0">
              {pendingDispatchCount}
            </span>
          )}
        </button>
      </div>

      <div
        className={`z-[1100] bg-white flex flex-col transition-[height] duration-300
          absolute inset-x-0 bottom-0 rounded-t-2xl shadow-[0_-8px_24px_rgba(15,23,42,0.18)] ${sheetOpen ? 'h-[55%]' : 'h-11'}
          lg:static lg:h-full lg:basis-[35%] lg:min-w-[340px] lg:rounded-none lg:shadow-none`}
      >
        <button
          onClick={() => setSheetOpen((v) => !v)}
          className="lg:hidden shrink-0 h-11 flex items-center justify-center gap-2 border-b border-slate-200 text-xs font-bold text-slate-600"
          aria-label={sheetOpen ? 'Thu gọn bảng điều khiển' : 'Mở bảng điều khiển'}
        >
          <span className="w-10 h-1 rounded-full bg-slate-300" />
          {sheetOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          {dispatchMode ? 'Điều phối sự cố' : 'Phương tiện & trạm'}
        </button>
        <div className={`flex-1 min-h-0 ${sheetOpen ? '' : 'hidden lg:block'}`}>
          {dispatchMode ? (
            <DispatchPanel selectedIncidentId={selectedIncidentId} onSelectIncident={handleSelectIncident} />
          ) : (
            <VehiclePanel
              vehicles={filteredVehicles}
              stations={stations}
              filters={filters}
              onFiltersChange={setFilters}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={handleSelectVehicle}
            />
          )}
        </div>
      </div>
    </div>
  );
};
