import React, { useState, useEffect } from 'react';
import type { StaffMission, MissionStatus } from '../../../types/staff';
import { StaffStatusStepper } from '../../../components/staff/StaffStatusStepper';
import { StaffTurnByTurnGuide } from '../../../components/staff/StaffTurnByTurnGuide';
import { StaffNavigationMap } from '../../../components/staff/StaffNavigationMap';
import { StaffQuickActionPanel } from '../../../components/staff/StaffQuickActionPanel';
import { StaffFieldRequestSection } from '../../../components/staff/StaffFieldRequestSection';
import { StaffTrafficTaskCard, type ActiveTrafficTask } from '../../../components/staff/StaffTrafficTaskCard';
import { StaffIncidentCard } from './StaffIncidentCard';
import { isGuid } from '../utils/staffMissionUtils';
import type { FieldRequestDto, CreateFieldRequestDto } from '../../../types/fieldRequest';
import type { IncidentSupplementDto } from '../../../types/incident';
import {
  Radio,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Navigation,
  Flame,
  CheckCircle2,
  Sparkles,
  MapPin,
} from 'lucide-react';

interface StaffActiveMissionViewProps {
  mission: StaffMission;
  loadingAssignments: boolean;
  fetchError: string | null;
  fieldRequests?: FieldRequestDto[];
  loadingFieldRequests?: boolean;
  supplements?: IncidentSupplementDto[];
  onPhoneRevealed?: (fullPhone: string) => void;
  activeTrafficTask?: ActiveTrafficTask | null;
  onResolveTrafficTask?: (hotspotId: string, note?: string) => Promise<boolean>;
  onOpenReportTrafficModal?: () => void;
  onCreateFieldRequest?: (dto: CreateFieldRequestDto) => Promise<boolean>;
  onCancelFieldRequest?: (requestId: string, note?: string) => Promise<boolean>;
  onRefresh: () => void;
  onViewStandby: () => void;
  onStatusChange: (nextStatus: MissionStatus) => void;
  onOpenReportModal: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onSelectStep: (index: number) => void;
}

type MobileViewMode = 'controls' | 'map' | 'both';

export const StaffActiveMissionView: React.FC<StaffActiveMissionViewProps> = ({
  mission,
  loadingAssignments,
  fetchError,
  fieldRequests = [],
  loadingFieldRequests = false,
  supplements = [],
  onPhoneRevealed,
  activeTrafficTask,
  onResolveTrafficTask,
  onOpenReportTrafficModal,
  onCreateFieldRequest,
  onCancelFieldRequest,
  onRefresh,
  onViewStandby,
  onStatusChange,
  onOpenReportModal,
  onNextStep,
  onPrevStep,
  onSelectStep,
}) => {
  // Mobile / Tablet View Switcher: default to map if actively navigating en_route
  const [mobileView, setMobileView] = useState<MobileViewMode>(() => {
    if (mission.status === 'en_route') return 'map';
    return 'controls';
  });

  // Khi chuyển sang EnRoute, tự động đổi view mobile sang bản đồ dẫn đường
  useEffect(() => {
    if (mission.status === 'en_route') {
      setMobileView('map');
    }
  }, [mission.status]);

  return (
    <div className="p-2 sm:p-4 lg:p-6 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-5">
      {/* Mobile / Tablet Segmented View Switcher (Hidden on Desktop >= lg) */}
      <div className="lg:hidden flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-xs gap-1">
        <button
          type="button"
          onClick={() => setMobileView('map')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            mobileView === 'map'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Navigation className="w-3.5 h-3.5 shrink-0" />
          <span>Bản Đồ Dẫn Đường</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileView('controls')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative whitespace-nowrap ${
            mobileView === 'controls'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Radio className="w-3.5 h-3.5 shrink-0" />
          <span>Chi Tiết Tác Chiến</span>
          {supplements.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-0.5" />
          )}
        </button>
      </div>

      {/* Left Column: Mission Controls & Telemetry (5 cols) */}
      <div
        className={`space-y-4 lg:col-span-5 ${
          mobileView === 'map' ? 'hidden lg:block' : 'block'
        }`}
      >
        {/* Active Traffic Task (Mục 20: Nhiệm vụ giải tỏa điểm nghẽn) */}
        {activeTrafficTask && onResolveTrafficTask && (
          <StaffTrafficTaskCard
            task={activeTrafficTask}
            onResolve={onResolveTrafficTask}
          />
        )}

        {/* Active Dispatches Banner / Quick Refresh - 2-Tier Responsive Layout (Fixes Overlap) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs space-y-2.5">
          {/* Row 1: Title & Action Buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className="w-4 h-4 text-red-600 animate-pulse shrink-0" />
              <h2 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-800 truncate">
                NHIỆM VỤ ĐANG TÁC CHIẾN
              </h2>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
              <button
                type="button"
                onClick={onViewStandby}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer active:scale-95"
                title="Tạm ẩn bảng tác chiến để xem chế độ Túc trực (Standby)"
              >
                <EyeOff className="w-3 h-3 text-slate-500" />
                <span className="hidden xs:inline sm:inline">Xem Túc trực</span>
                <span className="xs:hidden sm:hidden">Túc trực</span>
              </button>

              <button
                type="button"
                onClick={onRefresh}
                disabled={loadingAssignments}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                title="Đồng bộ lại danh sách lệnh điều phối từ máy chủ CAD"
              >
                <RefreshCw className={`w-3 h-3 ${loadingAssignments ? 'animate-spin' : ''}`} />
                <span>{loadingAssignments ? 'Đang tải...' : 'Đồng bộ'}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Status & Telemetry Badges (Clean wrapping, zero collision) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
            {mission.isAiDispatched && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300">
                <Sparkles className="w-3 h-3 text-purple-600 animate-pulse" />
                AI Tự Điều Phối
              </span>
            )}

            {isGuid(mission.id) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Kết Nối Trực Tuyến
              </span>
            )}

            {isGuid(mission.vehicleId) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                GPS Live
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-600 bg-slate-100 border border-slate-200">
              Sự cố: <strong className="text-slate-900">#{mission.incidentId}</strong>
            </span>

            {mission.vehiclePlate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-600 bg-slate-100 border border-slate-200">
                Xe: <strong className="text-red-600">{mission.vehiclePlate}</strong>
              </span>
            )}
          </div>

          {fetchError && (
            <div className="text-[11px] text-amber-800 bg-amber-50 rounded-xl p-2.5 border border-amber-200 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}
        </div>

        {/* Status Stepper */}
        <StaffStatusStepper
          mission={mission}
          onStatusChange={onStatusChange}
          onOpenReportModal={onOpenReportModal}
        />

        {/* Adaptive Operations Panel depending on mission status (Shown in desktop / controls view) */}
        {mission.status === 'en_route' && (
          <StaffTurnByTurnGuide
            steps={mission.routeSteps || []}
            currentStepIndex={mission.currentStepIndex}
            onNextStep={onNextStep}
            onPrevStep={onPrevStep}
            isEnRoute={true}
          />
        )}

        {mission.status === 'accepted' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 flex items-start gap-3 shadow-xs">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <Navigation className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-950">
                Kíp Trực Đã Tiếp Nhận Lệnh Điều Động
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Lực lượng đang tập hợp chuẩn bị xuất phát tại trạm. Khi xe bắt đầu lăn bánh, nhấn nút{' '}
                <strong className="text-amber-950">"XÁC NHẬN BẮT ĐẦU DI CHUYỂN (EN ROUTE)"</strong> ở trên để kích hoạt chế độ Dẫn đường tác chiến (HUD).
              </p>
            </div>
          </div>
        )}

        {mission.status === 'on_scene' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 flex items-start gap-3 shadow-xs">
            <div className="p-2 rounded-xl bg-red-100 text-red-600 shrink-0 mt-0.5">
              <Flame className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-950">
                Đã Tiếp Cận Hiện Trường Sự Cố
              </h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Lực lượng cứu hộ đang triển khai tác chiến tại chỗ. Sau khi dập tắt đám cháy / hoàn tất cứu nạn, nhấn nút{' '}
                <strong className="text-emerald-950">"LẬP BIÊN BẢN & ĐÓNG NHIỆM VỤ"</strong> ở trên để chụp ảnh hiện trường và nghiệm thu kết thúc sự cố.
              </p>
            </div>
          </div>
        )}

        {mission.status === 'completed' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 flex items-start gap-3 shadow-xs">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900">
                Nhiệm Vụ Đã Nghiệm Thu & Hoàn Tất
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Biên bản nghiệm thu đóng sự cố đã được lưu thành công. Kíp trực sẵn sàng trở về chế độ túc trực.
              </p>
            </div>
          </div>
        )}

        {/* Yêu cầu chi viện hiện trường & Báo vấn đề khác (§21.2 & 12.2) */}
        {mission.status !== 'completed' && onCreateFieldRequest && onCancelFieldRequest && (
          <StaffFieldRequestSection
            assignmentId={mission.id}
            incidentTitle={mission.title}
            fieldRequests={fieldRequests}
            loading={loadingFieldRequests}
            onCreateRequest={onCreateFieldRequest}
            onCancelRequest={onCancelFieldRequest}
          />
        )}

        {/* Incident Information Card (with Phone Reveal & Citizen Supplements - Mục 21.4) */}
        <StaffIncidentCard
          mission={mission}
          supplements={supplements}
          onPhoneRevealed={onPhoneRevealed}
        />

        {/* Emergency Quick Action Panel */}
        <StaffQuickActionPanel
          missionId={mission.id}
          onOpenReportTraffic={onOpenReportTrafficModal}
        />

        {/* Mobile Quick Action to switch back to Map */}
        <div className="lg:hidden pt-2">
          <button
            type="button"
            onClick={() => setMobileView('map')}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <Navigation className="w-4 h-4" />
            <span>Mở Bản Đồ Dẫn Đường (Live GPS) ➔</span>
          </button>
        </div>
      </div>

      {/* Right Column: Navigation Map & In-Field MDT HUD (7 cols) */}
      <div
        className={`lg:col-span-7 relative isolate ${
          mobileView === 'controls' ? 'hidden lg:block' : 'block'
        } h-[calc(100vh-140px)] min-h-[480px] lg:h-[calc(100vh-130px)] lg:sticky lg:top-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950`}
      >
        {/* On Mobile in Map View: Sleek Floating Turn-by-Turn HUD at top */}
        {mission.status === 'en_route' && (
          <div className="lg:hidden absolute top-3 left-3 right-16 z-20 pointer-events-none">
            <div className="pointer-events-auto">
              <StaffTurnByTurnGuide
                steps={mission.routeSteps || []}
                currentStepIndex={mission.currentStepIndex}
                onNextStep={onNextStep}
                onPrevStep={onPrevStep}
                isEnRoute={true}
                variant="compact-overlay"
              />
            </div>
          </div>
        )}

        {/* On Mobile in Map View: Sleek Floating Action Bar at bottom */}
        <div className="lg:hidden absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
          {/* Status badge pill */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-white backdrop-blur-md font-mono text-xs shadow-xl pointer-events-auto">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
            <span className="font-bold text-red-400">
              {mission.status === 'accepted'
                ? 'Đã nhận lệnh'
                : mission.status === 'en_route'
                ? 'Đang tiếp cận'
                : mission.status === 'on_scene'
                ? 'Tại hiện trường'
                : 'Đã đóng ca'}
            </span>
          </div>

          {/* Quick Action Button */}
          <div className="pointer-events-auto ml-auto">
            {mission.status === 'accepted' && (
              <button
                type="button"
                onClick={() => onStatusChange('en_route')}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono rounded-xl shadow-xl shadow-red-600/30 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>Xuất Phát (En Route) ➔</span>
              </button>
            )}

            {mission.status === 'en_route' && (
              <button
                type="button"
                onClick={() => onStatusChange('on_scene')}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-mono rounded-xl shadow-xl shadow-red-600/30 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>Đã Đến Hiện Trường ➔</span>
              </button>
            )}

            {mission.status === 'on_scene' && (
              <button
                type="button"
                onClick={onOpenReportModal}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-mono rounded-xl shadow-xl shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>Nghiệm Thu Đóng Ca ➔</span>
              </button>
            )}
          </div>
        </div>

        {/* Mapbox Tactical Map Container */}
        <div className="w-full h-full">
          <StaffNavigationMap
            mission={mission}
            currentStepIndex={mission.currentStepIndex}
            onSelectStep={onSelectStep}
          />
        </div>
      </div>
    </div>
  );
};
