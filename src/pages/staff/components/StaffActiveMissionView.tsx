import React from 'react';
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
  Satellite,
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
  return (
    <div className="p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column: Mission Controls & Telemetry (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Active Traffic Task (Mục 20: Nhiệm vụ giải tỏa điểm nghẽn) */}
        {activeTrafficTask && onResolveTrafficTask && (
          <StaffTrafficTaskCard
            task={activeTrafficTask}
            onResolve={onResolveTrafficTask}
          />
        )}

        {/* Active Dispatches Banner / Quick Refresh */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className="w-4 h-4 text-red-600 animate-pulse shrink-0" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 truncate">
                NHIỆM VỤ ĐANG TÁC CHIẾN
              </span>
              {mission.isAiDispatched && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300 shrink-0">
                  <Sparkles className="w-3 h-3 text-purple-600 animate-pulse" />
                  AI Tự Điều Phối
                </span>
              )}
              {isGuid(mission.id) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                  Kết Nối Trực Tuyến
                </span>
              )}
              {isGuid(mission.vehicleId) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                  GPS Live
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onViewStandby}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer"
                title="Tạm ẩn bảng tác chiến để xem chế độ Túc trực (Standby)"
              >
                <EyeOff className="w-3 h-3 text-slate-500" />
                <span>Xem Túc trực</span>
              </button>

              <button
                onClick={onRefresh}
                disabled={loadingAssignments}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                title="Đồng bộ lại danh sách lệnh điều phối từ máy chủ CAD"
              >
                <RefreshCw className={`w-3 h-3 ${loadingAssignments ? 'animate-spin' : ''}`} />
                <span>{loadingAssignments ? 'Đang tải...' : 'Đồng bộ'}</span>
              </button>
            </div>
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

        {/* Adaptive Operations Panel depending on mission status */}
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
      </div>

      {/* Right Column: Navigation Map (7 cols) */}
      <div className="lg:col-span-7 h-[500px] lg:h-[calc(100vh-130px)] lg:sticky lg:top-0 min-h-[420px]">
        <StaffNavigationMap
          mission={mission}
          currentStepIndex={mission.currentStepIndex}
          onSelectStep={onSelectStep}
        />
      </div>
    </div>
  );
};
