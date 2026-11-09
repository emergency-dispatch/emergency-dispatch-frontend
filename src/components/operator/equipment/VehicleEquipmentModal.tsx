import React, { useEffect, useState } from 'react';
import { ArrowRight, Loader2, Package, Plus, Users, X } from 'lucide-react';
import { Notice, VehicleStatusBadge, type NoticeState } from '../../admin/common/ui';
import { EquipmentListItem } from './EquipmentBits';
import { EquipmentFormDrawer } from './EquipmentFormDrawer';
import { EquipmentStatusDialog } from './EquipmentStatusDialog';
import { EquipmentDeleteDialog } from './EquipmentDeleteDialog';
import { compareEquipment } from './equipmentMeta';
import type { useStationEquipment } from './useStationEquipment';
import { VEHICLE_TYPE_META } from '../../../data/liveMapMeta';
import { useNow } from '../../../hooks/useNow';
import type { EquipmentDto } from '../../../types/equipment';
import type { Vehicle } from '../../../types/vehicle';
import { useTranslation } from '../../../i18n';

interface VehicleEquipmentModalProps {
  vehicle: Vehicle;
  /** Nhãn + màu trạng thái xe (trang Đội xe tự tính, phân biệt cả Ngừng hoạt động). */
  status: { label: string; color: string };
  teamName: string | null;
  stationId: string;
  /** Xe của trạm — để form cho phép chuyển thiết bị sang xe khác / kho. */
  vehicles: Vehicle[];
  equipment: ReturnType<typeof useStationEquipment>;
  onClose: () => void;
  /** Mở tab Thiết bị, lọc sẵn theo xe này. */
  onOpenTab: () => void;
}

/**
 * Popup "Thiết bị trên xe" mở từ cột Thiết bị ở tab Xe — xem nhanh và thao tác (báo bảo trì, sửa, xóa, thêm)
 * mà không rời danh sách xe.
 */
export const VehicleEquipmentModal: React.FC<VehicleEquipmentModalProps> = ({
  vehicle,
  status,
  teamName,
  stationId,
  vehicles,
  equipment,
  onClose,
  onOpenTab,
}) => {
  const { t } = useTranslation();
  const now = useNow(60_000);
  const [notice, setNotice] = useState<NoticeState>(null);
  /** undefined = đóng · null = thêm mới · dto = sửa. */
  const [editing, setEditing] = useState<EquipmentDto | null | undefined>(undefined);
  const [statusTarget, setStatusTarget] = useState<EquipmentDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentDto | null>(null);
  const { items: all, loading, loadedAt, error, reload, upsert, removeLocal } = equipment;

  const items = all.filter((e) => e.rescueUnitId === vehicle.id).sort(compareEquipment);
  const units = items.reduce((sum, e) => sum + e.quantity, 0);
  const maintenance = items.filter((e) => e.status === 'Maintenance').length;
  const TypeIcon = VEHICLE_TYPE_META[vehicle.type].icon;
  const childOpen = editing !== undefined || !!statusTarget || !!deleteTarget;

  // Esc đóng popup — trừ khi đang mở form / hộp thoại con bên trên.
  useEffect(() => {
    if (childOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [childOpen, onClose]);

  const handleGone = () => {
    setEditing(undefined);
    setStatusTarget(null);
    setDeleteTarget(null);
    setNotice({ kind: 'error', message: t('vehicles.equipment.notices.gone') });
    reload();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="vehicle-equipment-title"
          className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
        >
          {/* Đầu: xe nào, trạng thái, tổ */}
          <header className="shrink-0 flex items-start gap-3 px-5 pt-4 pb-3 border-b border-slate-200">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 shrink-0">
              <TypeIcon className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono-data uppercase tracking-widest text-slate-500">
                {t('vehicles.equipment.popup.kicker')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="vehicle-equipment-title" className="text-lg font-black font-mono-data text-slate-900">
                  {vehicle.plate}
                </h2>
                <VehicleStatusBadge label={status.label} color={status.color} />
              </div>
              <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-1.5">
                <span>{t(`enums.unitType.${vehicle.unitType}`)}</span>
                {teamName && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {teamName}
                    </span>
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="p-2 -mr-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Tóm tắt */}
          {items.length > 0 && (
            <div className="shrink-0 grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50/60 text-center">
              <div className="py-2">
                <p className="text-[10px] font-mono-data uppercase tracking-wider text-slate-500">
                  {t('vehicles.equipment.stats.items')}
                </p>
                <p className="text-base font-black text-slate-900">
                  {items.length}
                  <span className="ml-1 text-[11px] font-mono-data font-normal text-slate-400">
                    {t('vehicles.equipment.stats.units', { count: units })}
                  </span>
                </p>
              </div>
              <div className="py-2">
                <p className="text-[10px] font-mono-data uppercase tracking-wider text-slate-500">
                  {t('vehicles.equipment.stats.available')}
                </p>
                <p className="text-base font-black text-emerald-700">{items.length - maintenance}</p>
              </div>
              <div className="py-2">
                <p className="text-[10px] font-mono-data uppercase tracking-wider text-slate-500">
                  {t('vehicles.equipment.stats.maintenance')}
                </p>
                <p className={`text-base font-black ${maintenance > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{maintenance}</p>
              </div>
            </div>
          )}

          {(notice || error) && (
            <div className="shrink-0 px-5 pt-3">
              <Notice notice={notice ?? { kind: 'error', message: error! }} onClose={notice ? () => setNotice(null) : undefined} />
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading && !loadedAt ? (
              <div className="py-12 flex flex-col items-center gap-2 text-slate-300">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p className="text-sm text-slate-500">{t('vehicles.equipment.loading')}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-3">
                <Package className="w-9 h-9 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500">{t('vehicles.equipment.popup.empty')}</p>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-700 text-xs font-bold hover:bg-red-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('vehicles.equipment.popup.add')}
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((e) => (
                  <EquipmentListItem
                    key={e.id}
                    equipment={e}
                    now={now}
                    onToggleStatus={setStatusTarget}
                    onEdit={setEditing}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </ul>
            )}
          </div>

          <footer className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onOpenTab}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              {t('vehicles.equipment.popup.openTab')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('vehicles.equipment.popup.add')}
              </button>
            )}
          </footer>
        </div>
      </div>

      {editing !== undefined && (
        <EquipmentFormDrawer
          equipment={editing}
          stationId={stationId}
          vehicles={vehicles}
          defaults={{ category: '', unit: vehicle.id }}
          onClose={() => setEditing(undefined)}
          onSaved={(saved, created, keepOpen) => {
            upsert(saved);
            if (keepOpen) return;
            setEditing(undefined);
            setNotice({
              kind: 'success',
              message: created
                ? t('vehicles.equipment.notices.created', { name: saved.name })
                : t('vehicles.equipment.notices.updated', { name: saved.name }),
            });
          }}
          onGone={handleGone}
        />
      )}

      {statusTarget && (
        <EquipmentStatusDialog
          equipment={statusTarget}
          onCancel={() => setStatusTarget(null)}
          onDone={(updated) => {
            upsert(updated);
            setStatusTarget(null);
            setNotice({
              kind: 'success',
              message:
                updated.status === 'Maintenance'
                  ? t('vehicles.equipment.notices.maintenance', { name: updated.name })
                  : t('vehicles.equipment.notices.available', { name: updated.name }),
            });
          }}
          onGone={handleGone}
        />
      )}

      {deleteTarget && (
        <EquipmentDeleteDialog
          equipment={deleteTarget}
          locationLabel={vehicle.plate}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={(deleted) => {
            removeLocal(deleted.id);
            setDeleteTarget(null);
            setNotice({ kind: 'success', message: t('vehicles.equipment.notices.deleted', { name: deleted.name }) });
          }}
          onGone={handleGone}
        />
      )}
    </>
  );
};
