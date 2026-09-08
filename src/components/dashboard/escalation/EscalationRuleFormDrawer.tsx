import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { ToggleSwitch } from '../common/ToggleSwitch';
import { ROLE_META, ROLE_ORDER } from '../../../data/accountMock';
import type { RoleId } from '../../../types/account';
import type { IncidentSeverity } from '../../../types/dashboard';
import type { EscalationRule } from '../../../types/escalation';

interface EscalationRuleFormDrawerProps {
  initialRule: EscalationRule | null;
  onClose: () => void;
  onSave: (rule: EscalationRule) => void;
}

const SEVERITY_LEVELS: IncidentSeverity[] = [1, 2, 3, 4, 5];

export const EscalationRuleFormDrawer: React.FC<EscalationRuleFormDrawerProps> = ({
  initialRule,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(initialRule?.name ?? '');
  const [minSeverity, setMinSeverity] = useState<IncidentSeverity>(initialRule?.minSeverity ?? 4);
  const [waitMinutes, setWaitMinutes] = useState(initialRule?.waitMinutes ?? 5);
  const [notifyRoles, setNotifyRoles] = useState<RoleId[]>(initialRule?.notifyRoles ?? []);
  const [enabled, setEnabled] = useState(initialRule?.enabled ?? true);

  const isValid = name.trim().length > 0 && waitMinutes > 0 && notifyRoles.length > 0;

  const toggleRole = (role: RoleId) => {
    setNotifyRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    onSave({
      id: initialRule?.id ?? `esc-${Date.now()}`,
      name: name.trim(),
      minSeverity,
      waitMinutes,
      notifyRoles,
      enabled,
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[1400]" onClick={onClose} />

      <aside className="fixed top-0 right-0 h-full w-full max-w-lg bg-[#0B0F19] border-l border-slate-800 z-[1401] flex flex-col shadow-2xl shadow-black/60 animate-drawer-in">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-base font-bold text-white">
            {initialRule ? 'Chỉnh sửa quy tắc' : 'Thêm quy tắc leo thang'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-5 space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono-data uppercase tracking-wider text-slate-400 font-semibold">
                Tên quy tắc *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="VD: Leo thang khẩn cấp Cấp 4-5"
                className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
              <p className="text-xs font-mono-data uppercase tracking-wider text-slate-400 font-bold">
                Điều kiện kích hoạt
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs text-slate-400">Cấp độ sự cố tối thiểu</label>
                <div className="flex gap-1.5">
                  {SEVERITY_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setMinSeverity(lvl)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        minSeverity === lvl
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      Cấp {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs text-slate-400">Không có đội tiếp nhận sau (phút)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={waitMinutes}
                  onChange={(e) => setWaitMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
              <p className="text-xs font-mono-data uppercase tracking-wider text-slate-400 font-bold">
                Hành động — Thông báo tới
              </p>
              <div className="space-y-1.5">
                {ROLE_ORDER.map((role) => {
                  const meta = ROLE_META[role];
                  const checked = notifyRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${
                        checked ? 'border-blue-700/60 bg-blue-600/10' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                          checked ? 'bg-blue-600 border-blue-500' : 'border-slate-600'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-sm" style={{ color: checked ? meta.color : undefined }}>
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {notifyRoles.length === 0 && (
                <p className="text-[11px] text-amber-400">Chọn ít nhất 1 vai trò để nhận thông báo</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div>
                <p className="text-sm font-semibold text-white">Kích hoạt quy tắc</p>
                <p className="text-xs text-slate-500 mt-0.5">Chạy ngầm ngay sau khi lưu</p>
              </div>
              <ToggleSwitch checked={enabled} onChange={() => setEnabled((v) => !v)} label="Kích hoạt quy tắc" />
            </div>
          </div>

          <div className="shrink-0 p-4 border-t border-slate-800 mt-auto grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
            >
              Lưu quy tắc
            </button>
          </div>
        </form>
      </aside>
    </>
  );
};
