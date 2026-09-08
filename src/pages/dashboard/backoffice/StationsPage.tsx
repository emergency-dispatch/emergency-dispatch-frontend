import React, { useMemo, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { ConfirmDialog } from '../../../components/dashboard/common/ConfirmDialog';
import { StationAssetsPanel } from '../../../components/dashboard/stations/StationAssetsPanel';
import { StationFormDrawer } from '../../../components/dashboard/stations/StationFormDrawer';
import { StationsTable } from '../../../components/dashboard/stations/StationsTable';
import { stationAssetsSeed, stationRecordsSeed } from '../../../data/stationMock';
import type { StationRecord } from '../../../types/station';

export const StationsPage: React.FC = () => {
  const [stations, setStations] = useState<StationRecord[]>(stationRecordsSeed);
  const [selectedId, setSelectedId] = useState<string | null>(stationRecordsSeed[0]?.id ?? null);
  const [editingStation, setEditingStation] = useState<StationRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingStation, setDeletingStation] = useState<StationRecord | null>(null);

  const selectedStation = stations.find((s) => s.id === selectedId) ?? null;
  const selectedAssets = useMemo(
    () => stationAssetsSeed.filter((a) => a.stationId === selectedId),
    [selectedId]
  );

  const handleSave = (station: StationRecord) => {
    setStations((prev) => {
      const exists = prev.some((s) => s.id === station.id);
      return exists ? prev.map((s) => (s.id === station.id ? station : s)) : [...prev, station];
    });
    setSelectedId(station.id);
    setEditingStation(null);
    setIsCreating(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingStation) return;
    setStations((prev) => prev.filter((s) => s.id !== deletingStation.id));
    if (selectedId === deletingStation.id) setSelectedId(null);
    setDeletingStation(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-lg font-bold text-white flex items-center gap-2.5">
          <Building2 className="w-5 h-5 text-blue-400" />
          Station & Resource Management
        </h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm trạm mới
        </button>
      </div>

      <StationsTable
        stations={stations}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
        onEdit={setEditingStation}
        onDelete={setDeletingStation}
      />

      {selectedStation && <StationAssetsPanel stationName={selectedStation.name} assets={selectedAssets} />}

      {(isCreating || editingStation) && (
        <StationFormDrawer
          initialStation={editingStation}
          onClose={() => {
            setIsCreating(false);
            setEditingStation(null);
          }}
          onSave={handleSave}
        />
      )}

      {deletingStation && (
        <ConfirmDialog
          title="Xóa trạm cứu hộ?"
          description="Hành động này không thể hoàn tác."
          itemLabel={deletingStation.name}
          onCancel={() => setDeletingStation(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};
