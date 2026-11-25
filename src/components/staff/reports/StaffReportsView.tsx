import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileCheck2,
  Camera,
  Calendar,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  PackageCheck,
  ExternalLink,
  PenTool,
  Clock,
  ShieldCheck,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Car,
  AlertTriangle,
} from 'lucide-react';
import type { StaffMission, DigitalClosureReport } from '../../../types/staff';
import { SEVERITY_META } from '../../../data/incidentMock';
import { dispatchService } from '../../../services/dispatchService';
import {
  isGuid,
  formatShortId,
  getSavedClosureReports,
  saveClosureReportLocally,
  mapCompletionReportDtoToClosureReport,
} from '../../../pages/staff/utils/staffMissionUtils';

interface StaffReportsViewProps {
  completedMissions: StaffMission[];
  onOpenNewReport: () => void;
  onUpdateMission?: (updatedMission: StaffMission) => void;
}

export const getMissionDate = (m: StaffMission): Date | null => {
  const raw =
    m.closureReport?.completedAt ||
    m.closureReport?.signedAt ||
    m.completedAt ||
    m.assignedAt ||
    m.acceptedAt;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

export const getMissionTimestamp = (m: StaffMission): number => {
  const d = getMissionDate(m);
  return d ? d.getTime() : 0;
};

export const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const StaffReportsView: React.FC<StaffReportsViewProps> = ({
  completedMissions,
  onOpenNewReport,
  onUpdateMission,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | '1' | '2' | '3'>('ALL');
  const [evidenceFilter, setEvidenceFilter] = useState<'ALL' | 'HAS_PHOTOS' | 'HAS_SIGNATURE' | 'HAS_CASUALTIES'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customDate, setCustomDate] = useState<string>('');

  const [selectedReport, setSelectedReport] = useState<StaffMission | null>(() => {
    if (!completedMissions || completedMissions.length === 0) return null;
    const sorted = [...completedMissions].sort(
      (a, b) => getMissionTimestamp(b) - getMissionTimestamp(a)
    );
    return sorted[0] || null;
  });
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  // Kiểm tra xem có bộ lọc nào đang hoạt động không
  const hasActiveFilter = Boolean(
    searchTerm.trim() ||
    severityFilter !== 'ALL' ||
    evidenceFilter !== 'ALL' ||
    dateFilter !== 'ALL' ||
    customDate
  );

  // Đặt lại toàn bộ bộ lọc và tìm kiếm về mặc định
  const handleResetFilters = () => {
    setSearchTerm('');
    setSeverityFilter('ALL');
    setEvidenceFilter('ALL');
    setDateFilter('ALL');
    setCustomDate('');
  };

  // Tính danh sách hồ sơ sau khi áp dụng bộ lọc và luôn sắp xếp MỚI NHẤT lên đầu
  const filtered = useMemo(() => {
    const result = completedMissions.filter((m) => {
      if (!m) return false;

      // 1. Tìm kiếm theo từ khóa
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        const matchesSearch =
          (m.title || '').toLowerCase().includes(term) ||
          (m.id || '').toLowerCase().includes(term) ||
          (m.incidentId || '').toLowerCase().includes(term) ||
          (m.address || '').toLowerCase().includes(term) ||
          (m.vehiclePlate || '').toLowerCase().includes(term) ||
          (m.callerName || '').toLowerCase().includes(term) ||
          (m.closureReport?.signerName || '').toLowerCase().includes(term) ||
          (m.closureReport?.teamLeader || '').toLowerCase().includes(term) ||
          (m.closureReport?.handoverEntity || '').toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // 2. Lọc theo Mức độ nghiêm trọng
      if (severityFilter !== 'ALL' && m.severity !== Number(severityFilter)) {
        return false;
      }

      // 3. Lọc theo Minh chứng hiện trường
      if (evidenceFilter === 'HAS_PHOTOS') {
        if (!m.closureReport?.photos || m.closureReport.photos.length === 0) return false;
      } else if (evidenceFilter === 'HAS_SIGNATURE') {
        if (!m.closureReport?.signatureUrl && !m.closureReport?.signatureDataUrl) return false;
      } else if (evidenceFilter === 'HAS_CASUALTIES') {
        const count =
          (m.closureReport?.casualtiesTreated ?? 0) + (m.closureReport?.casualtiesHospitalized ?? 0);
        if (count <= 0) return false;
      }

      // 4. Lọc theo Thời gian / Ngày
      if (dateFilter !== 'ALL' || customDate) {
        const mDate = getMissionDate(m);
        if (!mDate) return false;

        if (dateFilter === 'TODAY') {
          if (!isSameDay(mDate, new Date())) return false;
        } else if (dateFilter === 'LAST_7_DAYS') {
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (mDate.getTime() < sevenDaysAgo) return false;
        } else if (dateFilter === 'THIS_MONTH') {
          const now = new Date();
          if (mDate.getFullYear() !== now.getFullYear() || mDate.getMonth() !== now.getMonth()) {
            return false;
          }
        } else if (dateFilter === 'CUSTOM' && customDate) {
          const localYear = mDate.getFullYear();
          const localMonth = String(mDate.getMonth() + 1).padStart(2, '0');
          const localDay = String(mDate.getDate()).padStart(2, '0');
          const localDateStr = `${localYear}-${localMonth}-${localDay}`;
          if (localDateStr !== customDate) return false;
        }
      }

      return true;
    });

    // Luôn sắp xếp từ MỚI NHẤT đến CŨ NHẤT (Newest first)
    return result.sort((a, b) => getMissionTimestamp(b) - getMissionTimestamp(a));
  }, [completedMissions, searchTerm, severityFilter, evidenceFilter, dateFilter, customDate]);

  // Đồng bộ mục được chọn khi danh sách lọc thay đổi
  useEffect(() => {
    if (filtered.length > 0) {
      if (!selectedReport || !filtered.some((m) => m.id === selectedReport.id)) {
        setSelectedReport(filtered[0]);
      }
    } else {
      setSelectedReport(null);
    }
  }, [filtered, selectedReport?.id]);

  // Tự động đồng bộ báo cáo hoàn chỉnh từ LocalStorage hoặc API /api/dispatch/assignments/{id}
  useEffect(() => {
    if (!selectedReport) return;

    const missionId = selectedReport.id;
    const hasClosureReport = Boolean(
      (selectedReport.closureReport?.photos && selectedReport.closureReport.photos.length > 0) ||
      selectedReport.closureReport?.signatureUrl ||
      (selectedReport.closureReport?.actionSummary && selectedReport.closureReport.actionSummary.length > 0)
    );

    // 1. Kiểm tra bộ nhớ local trước
    if (!hasClosureReport) {
      const savedReports = getSavedClosureReports();
      const local = savedReports[missionId] || savedReports[selectedReport.incidentId];
      if (local && (local.photos?.length || local.signatureUrl || local.actionSummary)) {
        const enriched: StaffMission = {
          ...selectedReport,
          closureReport: local,
        };
        setSelectedReport(enriched);
        onUpdateMission?.(enriched);
        return;
      }
    }

    // 2. Tải trực tiếp từ Backend GET /api/dispatch/assignments/{id} (đã include CompletionReport và MediaItems)
    if (!hasClosureReport && isGuid(missionId) && !fetchedIdsRef.current.has(missionId)) {
      fetchedIdsRef.current.add(missionId);
      setIsLoadingDetail(true);

      dispatchService.getAssignmentById(missionId)
        .then((res) => {
          if (res.success && res.data?.completionReport) {
            const mapped = mapCompletionReportDtoToClosureReport(
              res.data.completionReport,
              missionId,
              res.data.incidentId || selectedReport.incidentId,
              selectedReport.vehiclePlate,
              selectedReport.closureReport
            );
            saveClosureReportLocally(mapped);
            const enriched: StaffMission = {
              ...selectedReport,
              closureReport: mapped,
            };
            setSelectedReport(enriched);
            onUpdateMission?.(enriched);
          }
        })
        .catch((err) => {
          console.warn('[StaffReportsView] Không thể tải chi tiết phân công từ máy chủ CAD:', err);
        })
        .finally(() => {
          setIsLoadingDetail(false);
        });
    }
  }, [selectedReport?.id, onUpdateMission]);

  if (completedMissions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-6 shadow-xs space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
          <FileCheck2 className="w-7 h-7 text-slate-500" />
        </div>
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
            HỒ SƠ TÁC CHIẾN
          </span>
          <h3 className="text-base sm:text-lg font-black text-slate-900 mt-2">
            Chưa Có Hồ Sơ Báo Cáo Nghiệm Thu Nào
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            Hệ thống chưa ghi nhận lượt phân công nào đã hoàn tất nghiệm thu trong phiên trực này. Khi kíp xe hoàn thành nhiệm vụ và nghiệm thu hiện trường, hồ sơ biên bản sẽ tự động lưu trữ tại đây.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      {/* Thanh bộ lọc đơn giản & tinh gọn */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm mã sự cố, địa chỉ, người ký, biển số xe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                title="Xóa từ khóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Lọc theo Cấp độ */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              aria-label="Lọc theo mức độ"
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="ALL">Mức độ: Tất cả</option>
              <option value="1">Cấp 1 (Nhẹ)</option>
              <option value="2">Cấp 2 (Trung bình)</option>
              <option value="3">Cấp 3 (Nghiêm trọng)</option>
            </select>

            {/* Lọc theo Minh chứng */}
            <select
              value={evidenceFilter}
              onChange={(e) => setEvidenceFilter(e.target.value as any)}
              aria-label="Lọc theo minh chứng"
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="ALL">Minh chứng: Tất cả</option>
              <option value="HAS_PHOTOS">Có ảnh hiện trường</option>
              <option value="HAS_SIGNATURE">Có chữ ký</option>
              <option value="HAS_CASUALTIES">Có nạn nhân</option>
            </select>

            {/* Lọc theo Thời gian / Ngày */}
            <div className="flex items-center gap-1.5">
              <select
                value={dateFilter}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setDateFilter(val);
                  if (val !== 'CUSTOM') {
                    setCustomDate('');
                  }
                }}
                aria-label="Lọc theo thời gian"
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="ALL">Thời gian: Tất cả</option>
                <option value="TODAY">Hôm nay</option>
                <option value="LAST_7_DAYS">7 ngày qua</option>
                <option value="THIS_MONTH">Tháng này</option>
                <option value="CUSTOM">Chọn ngày...</option>
              </select>

              {dateFilter === 'CUSTOM' && (
                <input
                  type="date"
                  aria-label="Chọn ngày cụ thể"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-red-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-400 cursor-pointer"
                />
              )}
            </div>

            {/* Nút Xóa hết bộ lọc */}
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-xl text-xs font-mono font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="Xóa hết các bộ lọc và ô tìm kiếm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                <span>Xóa hết bộ lọc</span>
              </button>
            )}

            {/* Thống kê kết quả */}
            <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5 pl-2 border-l border-slate-200 whitespace-nowrap">
              <FileCheck2 className="w-4 h-4 text-red-600" />
              <span>
                {hasActiveFilter ? (
                  <>Tìm thấy <strong>{filtered.length}</strong>/{completedMissions.length}</>
                ) : (
                  <>Tổng số <strong>{completedMissions.length}</strong></>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: List on Left (5 Cols), Detail on Right (7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Report List */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[720px] overflow-y-auto pr-0.5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs font-mono shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="font-bold text-slate-700">Không tìm thấy hồ sơ báo cáo phù hợp</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Thử nới lỏng từ khóa hoặc các tiêu chí bộ lọc</p>
              </div>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa hết bộ lọc</span>
                </button>
              )}
            </div>
          ) : (
            filtered.map((m) => {
              const isSelected = selectedReport?.id === m.id;
              const severityMeta = SEVERITY_META[m.severity];
              const casualtyCount = (m.closureReport?.casualtiesTreated || 0) + (m.closureReport?.casualtiesHospitalized || 0);

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedReport(m)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${isSelected
                      ? 'bg-red-50/70 border-red-400 shadow-red-100 ring-1 ring-red-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono font-bold text-xs text-red-600 truncate" title={`Mã nhiệm vụ: ${m.id}`}>
                      {formatShortId(m.id, '')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${severityMeta?.badgeClass || ''}`}>
                      CẤP {m.severity}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 truncate mb-1">{m.title}</h4>
                  <div className="text-xs text-slate-500 truncate mb-2">{m.address}</div>

                  {/* Evidence & Field Data Indicator Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {m.vehiclePlate && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold border border-slate-200">
                        <Car className="w-2.5 h-2.5 text-slate-500" />
                        {m.vehiclePlate}
                      </span>
                    )}
                    {(m.closureReport?.photos?.length || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-mono font-bold border border-amber-200">
                        <Camera className="w-2.5 h-2.5 text-amber-600" />
                        {m.closureReport?.photos?.length} ảnh
                      </span>
                    )}
                    {(m.closureReport?.signatureUrl || m.closureReport?.signatureDataUrl) && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
                        <PenTool className="w-2.5 h-2.5 text-emerald-600" />
                        Đã ký
                      </span>
                    )}
                    {casualtyCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 text-[10px] font-mono font-bold border border-rose-200">
                        <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                        {casualtyCount} nạn nhân
                      </span>
                    )}
                    {(m.closureReport?.resourcesUsed?.length || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-mono font-bold border border-blue-200">
                        <PackageCheck className="w-2.5 h-2.5 text-blue-600" />
                        {m.closureReport?.resourcesUsed?.length} vật tư
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100">
                    {(() => {
                      const mDate = getMissionDate(m);
                      if (!mDate) return <span>Vừa xong</span>;
                      const isToday = isSameDay(mDate, new Date());
                      const dateFormatted = isToday
                        ? `Hôm nay, ${mDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                        : `${mDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${mDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
                      return (
                        <span className="flex items-center gap-1 text-slate-500 font-medium" title={mDate.toLocaleString('vi-VN')}>
                          <Clock className="w-3 h-3 text-slate-400" />
                          {dateFormatted}
                        </span>
                      );
                    })()}
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Đã nộp báo cáo
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Detailed Selected Report View */}
        <div className="lg:col-span-7">
          {selectedReport ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase text-red-600 font-bold">
                      HỒ SƠ BÁO CÁO ĐIỆN TỬ
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ĐÃ PHÊ DUYỆT BỞI CAD
                    </span>
                    {isLoadingDetail && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                        Đang đồng bộ...
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                    {selectedReport.title}
                  </h3>
                </div>

                <div className="text-right text-xs font-mono text-slate-500">
                  <div>Mã nhiệm vụ: <strong className="text-slate-900" title={selectedReport.id}>{formatShortId(selectedReport.id, '')}</strong></div>
                  <div>Sự cố: <strong className="text-red-600" title={selectedReport.incidentId}>{formatShortId(selectedReport.incidentCode || selectedReport.incidentId)}</strong></div>
                  {(() => {
                    const mDate = getMissionDate(selectedReport);
                    if (!mDate) return null;
                    return (
                      <div className="text-slate-500 text-[11px] flex items-center justify-end gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{mDate.toLocaleString('vi-VN')}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Action summary */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                <span className="text-slate-500 font-mono uppercase">Diễn biến & Xử lý tại chỗ:</span>
                <p className="text-slate-700 leading-relaxed">
                  {selectedReport.closureReport?.actionSummary || selectedReport.description || 'Chưa có ghi chú tóm tắt.'}
                </p>
              </div>

              {/* Stats: Casualties & Handover */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center min-h-[76px]">
                  <div className="h-7 flex items-center justify-center w-full">
                    <span className="text-lg font-black text-red-600 font-mono leading-none">
                      {selectedReport.closureReport?.casualtiesTreated ?? 0}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] font-medium leading-none mt-1.5 whitespace-nowrap">
                    Sơ cứu tại chỗ
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center min-h-[76px]">
                  <div className="h-7 flex items-center justify-center w-full">
                    <span className="text-lg font-black text-emerald-600 font-mono leading-none">
                      {selectedReport.closureReport?.casualtiesHospitalized ?? 0}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] font-medium leading-none mt-1.5 whitespace-nowrap">
                    Chuyển viện cấp cứu
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center col-span-2 sm:col-span-1 min-h-[76px]">
                  <div className="h-7 flex items-center justify-center w-full px-1">
                    <span
                      className="text-xs font-bold text-slate-900 truncate max-w-full leading-none block"
                      title={selectedReport.closureReport?.handoverEntity || 'Chưa ghi nhận'}
                    >
                      {selectedReport.closureReport?.handoverEntity || 'Chưa ghi nhận'}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] font-medium leading-none mt-1.5 whitespace-nowrap">
                    Đơn vị tiếp nhận
                  </div>
                </div>
              </div>

              {/* Evidence Photos */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-red-600" />
                  Ảnh Hiện Trường & Bằng Chứng ({selectedReport.closureReport?.photos?.length || 0} ảnh)
                </div>

                {(selectedReport.closureReport?.photos || []).length === 0 ? (
                  <div className="text-slate-400 text-xs italic py-2">
                    Không có ảnh bằng chứng đính kèm trong hồ sơ này.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {(selectedReport.closureReport?.photos || []).map((p) => (
                      <div key={p.id} className="relative h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
                        <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-xs p-1 text-[9px] text-white truncate font-mono">
                          {p.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resources / Equipment Used */}
              {(selectedReport.closureReport?.resourcesUsed || []).length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-1.5">
                    <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
                    Vật Tư &amp; Thiết Bị Đã Sử Dụng
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedReport.closureReport?.resourcesUsed.map((r, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700"
                      >
                        {r.name}: <strong className="text-red-600 font-mono">{r.quantity} {r.unit}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Signature Verification Block */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-slate-800">
                    <PenTool className="w-4 h-4 text-red-600" />
                    Chữ Ký Xác Nhận Nghiệm Thu Hiện Trường
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    ĐÃ XÁC THỰC
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-white border border-slate-200 rounded-xl">
                  {/* Signature Image */}
                  <div className="flex items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg min-w-[180px] max-w-[240px] h-20">
                    {selectedReport.closureReport?.signatureUrl || selectedReport.closureReport?.signatureDataUrl ? (
                      <img
                        src={selectedReport.closureReport.signatureUrl || selectedReport.closureReport.signatureDataUrl}
                        alt="Chữ ký nghiệm thu"
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">Chưa có chữ ký điện tử</span>
                    )}
                  </div>

                  {/* Signer details */}
                  <div className="flex-1 text-xs space-y-1 text-slate-600">
                    <div>
                      Đại diện ký: <strong className="text-slate-900 font-semibold">{selectedReport.closureReport?.signerName || selectedReport.closureReport?.teamLeader || 'Chỉ huy kíp xe'}</strong>
                    </div>
                    {selectedReport.closureReport?.signedAt && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Thời điểm ký: {new Date(selectedReport.closureReport.signedAt).toLocaleString('vi-VN')}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 italic">
                      Biên bản điện tử được ký và lưu trữ bảo mật trên hệ thống điều phối CAD.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs font-mono shadow-xs space-y-3">
              <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-slate-600 font-bold">Chưa chọn hồ sơ báo cáo nào</p>
              <p className="text-slate-400 text-[11px]">
                {filtered.length > 0
                  ? 'Vui lòng chọn một hồ sơ trong danh sách bên trái để xem biên bản chi tiết.'
                  : 'Hãy đặt lại bộ lọc để hiển thị danh sách hồ sơ báo cáo.'}
              </p>
              {filtered.length === 0 && hasActiveFilter && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa hết bộ lọc</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
