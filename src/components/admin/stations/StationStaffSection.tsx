import React, { useMemo, useState } from 'react';
import { Lock, Plus, Search, X } from 'lucide-react';
import { FormField } from '../common/ui';
import { inputClass } from '../common/styles';
import { useServiceQuery } from '../common/hooks';
import { ROLE_META } from '../accounts/accountMeta';
import { accountAdminService } from '../../../services/admin/accountAdminService';
import { normalizeText } from '../../../services/admin/listUtils';
import { UserStatus } from '../../../types/auth';
import type { InternalRole } from '../../../types/internalAccount';

/** Một nhân sự trong danh sách gán vào trạm (đang thuộc trạm hoặc vừa chọn thêm). */
export interface StationMemberDraft {
  id: string;
  fullName: string;
  email: string;
  /** Vai trò tài khoản: "Operator" / "RescueStaff". */
  role: string;
  /** Đang thuộc trạm khác — lưu sẽ chuyển người này sang trạm đang sửa. */
  movingFromStation: string | null;
}

interface StationStaffSectionProps {
  /** null khi đang tạo trạm mới. */
  stationId: string | null;
  members: StationMemberDraft[];
  onChange: (members: StationMemberDraft[]) => void;
}

const roleLabel = (role: string) => ROLE_META[role as InternalRole]?.label ?? role;
const roleBadgeClass = (role: string) =>
  ROLE_META[role as InternalRole]?.badgeClass ?? 'bg-slate-100 text-slate-600 border-slate-300';

/** Chọn Điều phối viên / Đội cứu hộ gắn vào trạm. Chia tổ và chức vụ trong tổ do Operator làm ở Trạm & Tổ. */
export const StationStaffSection: React.FC<StationStaffSectionProps> = ({ stationId, members, onChange }) => {
  const accounts = useServiceQuery(
    () => accountAdminService.listAccounts({ pageIndex: 1, pageSize: 1000 }),
    'station-staff-candidates'
  );
  const [search, setSearch] = useState('');

  const candidates = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.id));
    const q = normalizeText(search);
    return (accounts.data?.items ?? [])
      .filter((a) => !memberIds.has(a.id))
      .filter((a) => !q || normalizeText(`${a.fullName} ${a.email}`).includes(q))
      .sort(
        // Người chưa thuộc trạm nào lên trước.
        (a, b) => Number(!!a.stationId) - Number(!!b.stationId) || a.fullName.localeCompare(b.fullName, 'vi')
      );
  }, [accounts.data, members, search]);

  const add = (id: string) => {
    const account = accounts.data?.items.find((a) => a.id === id);
    if (!account) return;
    onChange([
      ...members,
      {
        id: account.id,
        fullName: account.fullName,
        email: account.email,
        role: account.role,
        movingFromStation: account.stationId && account.stationId !== stationId ? account.stationName ?? 'trạm khác' : null,
      },
    ]);
  };

  return (
    <FormField
      label={`Nhân sự của trạm (${members.length})`}
      hint="Gỡ khỏi trạm thì người đó cũng rời tổ làm việc. Chia tổ và chức vụ trong tổ do Operator làm ở màn Trạm & Tổ."
    >
      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
        {members.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-slate-400">Chưa có nhân sự — chọn ở danh sách bên dưới.</p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{m.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {m.email}
                  {m.movingFromStation && (
                    <span className="text-amber-700 font-semibold"> · chuyển từ {m.movingFromStation}</span>
                  )}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${roleBadgeClass(m.role)}`}
              >
                {roleLabel(m.role)}
              </span>
              <button
                type="button"
                onClick={() => onChange(members.filter((x) => x.id !== m.id))}
                className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                aria-label={`Gỡ ${m.fullName} khỏi trạm`}
                title="Gỡ khỏi trạm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm điều phối viên / đội cứu hộ để thêm..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
          {accounts.loading && !accounts.data ? (
            <p className="px-3 py-4 text-center text-xs text-slate-400">Đang tải danh sách nhân sự...</p>
          ) : accounts.error ? (
            <p className="px-3 py-4 text-center text-xs text-red-600">{accounts.error}</p>
          ) : candidates.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-slate-400">Không còn nhân sự phù hợp.</p>
          ) : (
            candidates.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900 truncate flex items-center gap-1.5">
                    {a.fullName}
                    {a.status === UserStatus.Suspended && (
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" aria-label="Tài khoản đang bị khóa" />
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {a.stationId ? `Đang ở ${a.stationName ?? 'trạm khác'}` : 'Chưa thuộc trạm nào'}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono-data whitespace-nowrap ${roleBadgeClass(a.role)}`}
                >
                  {roleLabel(a.role)}
                </span>
                <button
                  type="button"
                  onClick={() => add(a.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 text-[11px] font-bold text-slate-600 hover:border-red-400 hover:text-red-600"
                >
                  <Plus className="w-3 h-3" />
                  Thêm
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </FormField>
  );
};
