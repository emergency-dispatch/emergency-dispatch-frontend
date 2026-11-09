import { useCallback, useEffect, useRef, useState } from 'react';
import { equipmentService } from '../../../services/equipmentService';
import { getApiErrorMessage } from '../../../services/apiClient';
import type { EquipmentDto } from '../../../types/equipment';
import i18n from '../../../i18n';

/**
 * Thiết bị của trạm Operator (tải nguyên danh sách, lọc phía client). Không có realtime → tải lại khi quay lại
 * tab trình duyệt (Staff có thể vừa báo hỏng từ app). Thao tác thành công thì thay đúng dòng bằng DTO backend trả về.
 */
export function useStationEquipment(stationId: string | null) {
  const [items, setItems] = useState<EquipmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  // Bỏ kết quả của lượt tải cũ nếu lượt mới đã bắt đầu.
  const seqRef = useRef(0);

  const reload = useCallback(async () => {
    if (!stationId) return;
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const list = await equipmentService.list();
      if (seq !== seqRef.current) return;
      setItems(list);
      setError(null);
      setLoadedAt(Date.now());
    } catch (err) {
      if (seq !== seqRef.current) return;
      setError(getApiErrorMessage(err, i18n.t('vehicles.equipment.loadFailed')));
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  const upsert = useCallback((dto: EquipmentDto) => {
    setItems((prev) => (prev.some((e) => e.id === dto.id) ? prev.map((e) => (e.id === dto.id ? dto : e)) : [...prev, dto]));
  }, []);

  const removeLocal = useCallback((id: string) => {
    setItems((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { items, loading, error, loadedAt, reload, upsert, removeLocal };
}
