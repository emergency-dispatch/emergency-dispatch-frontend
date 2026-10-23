import { Flame, HeartPulse, LifeBuoy, type LucideIcon } from 'lucide-react';
import type { DispatchVehicleType } from '../../../types/vehicle';

// Chức năng của tổ suy ra từ loại xe tổ phụ trách (backend chưa có trường chức năng riêng cho tổ).
// Khớp quy tắc gợi ý của backend (DispatchScoring): sự cố cháy → xe chữa cháy / xe thang / xe cứu hộ;
// tai nạn → xe cứu thương / xe cứu hộ. Xe cứu hộ đáp ứng cả hai nhánh.
export const TEAM_FUNCTION_META: Record<DispatchVehicleType, { label: string; icon: LucideIcon; badgeClass: string }> = {
  fire_truck: { label: 'Chữa cháy', icon: Flame, badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  ambulance: { label: 'Cấp cứu tai nạn', icon: HeartPulse, badgeClass: 'bg-orange-50 text-orange-700 border-orange-200' },
  rescue: { label: 'Cứu hộ (cháy & tai nạn)', icon: LifeBuoy, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
};
