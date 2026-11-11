import React from 'react';
import type { StaffMission, MissionStatus, StaffProfile } from '../../../types/staff';
import type { FieldRequestDto, CreateFieldRequestDto } from '../../../types/fieldRequest';
import type { ActiveTrafficTask } from '../../../components/staff/StaffTrafficTaskCard';
import { StaffActiveMissionView } from './StaffActiveMissionView';
import { StaffStandbyView } from '../../../components/staff/StaffStandbyView';
import { Radio } from 'lucide-react';

interface StaffMissionTabProps {
  activeMission: StaffMission | null;
  isViewingStandby: boolean;
  setIsViewingStandby: (val: boolean) => void;
  loadingAssignments: boolean;
  fetchError: string | null;
  fieldRequests?: FieldRequestDto[];
  loadingFieldRequests?: boolean;
  activeTrafficTask?: ActiveTrafficTask | null;
  onResolveTrafficTask?: (hotspotId: string, note?: string) => Promise<boolean>;
  onOpenReportTrafficModal?: () => void;
  onCreateFieldRequest?: (dto: CreateFieldRequestDto) => Promise<boolean>;
  onCancelFieldRequest?: (requestId: string, note?: string) => Promise<boolean>;
  profile: StaffProfile;
  completedMissions: StaffMission[];
  onRefresh: () => void;
  onStatusChange: (nextStatus: MissionStatus) => void;
  onOpenReportModal: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onSelectStep: (index: number) => void;
  onSelectStandbyMission: (mission: StaffMission) => void;
  onOpenHistory: () => void;
}

export const StaffMissionTab: React.FC<StaffMissionTabProps> = ({
  activeMission,
  isViewingStandby,
  setIsViewingStandby,
  loadingAssignments,
  fetchError,
  fieldRequests = [],
  loadingFieldRequests = false,
  activeTrafficTask,
  onResolveTrafficTask,
  onOpenReportTrafficModal,
  onCreateFieldRequest,
  onCancelFieldRequest,
  profile,
  completedMissions,
  onRefresh,
  onStatusChange,
  onOpenReportModal,
  onNextStep,
  onPrevStep,
  onSelectStep,
  onSelectStandbyMission,
  onOpenHistory,
}) => {
  if (activeMission && !isViewingStandby) {
    return (
      <StaffActiveMissionView
        mission={activeMission}
        loadingAssignments={loadingAssignments}
        fetchError={fetchError}
        fieldRequests={fieldRequests}
        loadingFieldRequests={loadingFieldRequests}
        activeTrafficTask={activeTrafficTask}
        onResolveTrafficTask={onResolveTrafficTask}
        onOpenReportTrafficModal={onOpenReportTrafficModal}
        onCreateFieldRequest={onCreateFieldRequest}
        onCancelFieldRequest={onCancelFieldRequest}
        onRefresh={onRefresh}
        onViewStandby={() => setIsViewingStandby(true)}
        onStatusChange={onStatusChange}
        onOpenReportModal={onOpenReportModal}
        onNextStep={onNextStep}
        onPrevStep={onPrevStep}
        onSelectStep={onSelectStep}
      />
    );
  }

  return (
    <div className="space-y-4">
      {activeMission && isViewingStandby && (
        <div className="p-3 sm:p-5 lg:p-6 pb-0">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-900 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-xl text-red-600 shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold font-mono uppercase tracking-wider text-red-950">
                  Đang có 1 nhiệm vụ tác chiến #{activeMission.incidentId}
                </p>
                <p className="text-xs text-red-800 mt-0.5 font-medium">
                  {activeMission.title} – {activeMission.address}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsViewingStandby(false)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Quay lại Bảng Tác Chiến &rarr;
            </button>
          </div>
        </div>
      )}

      <StaffStandbyView
        profile={profile}
        loading={loadingAssignments}
        onRefresh={onRefresh}
        completedMissions={completedMissions}
        activeTrafficTask={activeTrafficTask}
        onResolveTrafficTask={onResolveTrafficTask}
        onOpenReportTrafficModal={onOpenReportTrafficModal}
        onSelectMission={onSelectStandbyMission}
        onOpenHistory={onOpenHistory}
      />
    </div>
  );
};
