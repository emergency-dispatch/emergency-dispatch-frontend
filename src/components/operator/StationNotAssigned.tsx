import React from 'react';
import { Building2 } from 'lucide-react';

/**
 * Vận hành theo trạm: tài khoản Operator chưa được Admin gán trạm phụ trách → backend trả 403 cho hàng đợi / bảng
 * điều phối. Hiện hướng dẫn thay vì báo lỗi tải.
 */
export const StationNotAssigned: React.FC<{ message: string }> = ({ message }) => (
  <div className="h-full flex items-center justify-center p-6">
    <div className="max-w-md text-center space-y-3">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Building2 className="w-6 h-6 text-slate-500" />
      </div>
      <h2 className="text-base font-bold text-slate-900">Chưa có trạm phụ trách</h2>
      <p className="text-sm text-slate-600">{message}</p>
      <p className="text-xs text-slate-500">
        Mỗi Operator phụ trách một trạm và chỉ nhận sự cố của trạm đó. Liên hệ Admin để được gán trạm, sau đó đăng nhập
        lại.
      </p>
    </div>
  </div>
);
