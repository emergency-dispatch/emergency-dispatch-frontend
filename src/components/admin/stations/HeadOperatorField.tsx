import React, { useMemo } from 'react';
import { FormField } from '../common/ui';
import { inputClass } from '../common/styles';
import { useServiceQuery } from '../common/hooks';
import { accountAdminService } from '../../../services/admin/accountAdminService';
import { stationAdminService } from '../../../services/admin/stationAdminService';
import { UserRole, UserStatus } from '../../../types/auth';
import type { StationResponseDto } from '../../../types/station';

interface HeadOperatorFieldProps {
  /** null khi đang tạo trạm mới. */
  station: StationResponseDto | null;
  value: string | null;
  onChange: (operatorId: string | null) => void;
}

/**
 * Operator phụ trách trạm (Station.headOperatorId). Mỗi Operator chỉ phụ trách 1 trạm → chỉ liệt kê Operator đang
 * hoạt động và chưa phụ trách trạm khác. Lưu xong backend tự gán trạm cho Operator mới, gỡ trạm của Operator cũ và
 * buộc cả hai đăng nhập lại.
 */
export const HeadOperatorField: React.FC<HeadOperatorFieldProps> = ({ station, value, onChange }) => {
  const operators = useServiceQuery(
    () => accountAdminService.listAccounts({ role: UserRole.Operator, status: UserStatus.Active, pageIndex: 1, pageSize: 100 }),
    'head-operator-candidates'
  );
  const stations = useServiceQuery(() => stationAdminService.list({ pageIndex: 1, pageSize: 500 }), 'head-operator-stations');

  const options = useMemo(() => {
    const headOfOther = new Map(
      (stations.data?.items ?? [])
        .filter((s) => s.id !== station?.id && s.headOperatorId)
        .map((s) => [s.headOperatorId!, s.name])
    );
    return (operators.data?.items ?? [])
      .filter((o) => !headOfOther.has(o.id))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  }, [operators.data, stations.data, station?.id]);

  // Operator đang phụ trách có thể đã bị khóa (không còn trong danh sách Active) — vẫn hiện để không mất giá trị.
  const currentMissing = !!value && !!operators.data && !options.some((o) => o.id === value);
  const changed = (station?.headOperatorId ?? null) !== value;
  const loading = (operators.loading && !operators.data) || (stations.loading && !stations.data);

  return (
    <FormField
      label="Operator phụ trách trạm"
      hint={
        currentMissing
          ? 'Operator đang phụ trách đã bị khóa — chọn Operator khác hoặc bỏ trống, nếu không sẽ không lưu được trạm.'
          : changed && station
            ? 'Operator cũ và Operator mới sẽ bị đăng xuất để nhận trạm mới khi đăng nhập lại.'
            : 'Mỗi Operator chỉ phụ trách 1 trạm và chỉ nhận sự cố của trạm đó. Chỉ hiện Operator đang hoạt động, chưa phụ trách trạm khác.'
      }
    >
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={loading}
        className={inputClass}
      >
        <option value="">{loading ? 'Đang tải danh sách Operator...' : '— Chưa có Operator phụ trách —'}</option>
        {currentMissing && station && (
          <option value={value!}>{station.headOperatorName ?? 'Operator hiện tại'} (đã khóa)</option>
        )}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.fullName} · {o.email}
          </option>
        ))}
      </select>
      {(operators.error || stations.error) && (
        <p className="text-[11px] text-red-600">{operators.error ?? stations.error}</p>
      )}
      {!loading && options.length === 0 && !value && (
        <p className="text-[11px] text-amber-700">
          Không còn Operator trống — tạo tài khoản Operator ở tab Tài khoản nội bộ hoặc gỡ Operator khỏi trạm khác.
        </p>
      )}
    </FormField>
  );
};
