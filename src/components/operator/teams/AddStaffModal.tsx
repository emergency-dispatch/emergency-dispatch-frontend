import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ConfirmModal } from '../../admin/common/ui';
import { inputClass } from '../../admin/common/styles';
import { normalizeText } from '../../../services/admin/adminMock';
import type { StationStaff } from '../../../types/stationTeam';

interface AddStaffModalProps {
  stationName: string;
  /** RescueStaff chưa thuộc trạm nào và không bị khóa. */
  candidates: StationStaff[];
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (staffIds: string[]) => void;
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({
  stationName,
  candidates,
  submitting,
  onCancel,
  onConfirm,
}) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const term = normalizeText(search);
    return candidates.filter((s) => !term || normalizeText(s.fullName).includes(term) || s.phoneNumber.includes(term));
  }, [candidates, search]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ConfirmModal
      title={`Thêm nhân sự vào ${stationName}`}
      confirmLabel={selected.size > 0 ? `Thêm ${selected.size} người` : 'Thêm'}
      confirmDisabled={selected.size === 0}
      submitting={submitting}
      onCancel={onCancel}
      onConfirm={() => onConfirm([...selected])}
    >
      <p className="text-xs text-slate-500">
        Chỉ hiện lực lượng cứu hộ chưa thuộc trạm nào. Sau khi thêm, xếp họ vào tổ ở cột "Tổ làm việc".
      </p>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc số điện thoại"
          className={`${inputClass} pl-9`}
        />
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
        {visible.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-6">
            {candidates.length === 0 ? 'Không còn nhân sự nào chưa thuộc trạm.' : 'Không có nhân sự phù hợp.'}
          </p>
        ) : (
          visible.map((s) => (
            <label key={s.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                className="accent-red-600"
              />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-900 truncate">{s.fullName}</span>
                <span className="block text-[11px] text-slate-500 font-mono-data">{s.phoneNumber}</span>
              </span>
            </label>
          ))
        )}
      </div>
    </ConfirmModal>
  );
};
