import React, { useState } from 'react';
import { StaffNavbar } from '../../components/staff/StaffNavbar';
import { StaffSidebar, type StaffNavTab } from '../../components/staff/StaffSidebar';
import { StaffMissionAlertModal } from '../../components/staff/StaffMissionAlertModal';
import { StaffClosureReportModal } from '../../components/staff/StaffClosureReportModal';
import { StaffMissionHistoryModal } from '../../components/staff/StaffMissionHistoryModal';
import { StaffToastContainer } from '../../components/staff/StaffToast';
import { StaffScheduleView } from '../../components/staff/schedule/StaffScheduleView';
import { StaffReportsView } from '../../components/staff/reports/StaffReportsView';
import { StaffEquipmentView } from '../../components/staff/equipment/StaffEquipmentView';
import { StaffProfileView } from '../../components/staff/profile/StaffProfileView';
import { StaffTeamView } from '../../components/staff/team/StaffTeamView';
import { StaffMissionTab } from './components/StaffMissionTab';
import { useStaffProfile } from './hooks/useStaffProfile';
import { useStaffMission } from './hooks/useStaffMission';
import {
  isGuid,
  getSavedClosureReports,
  saveClosureReportLocally,
} from './utils/staffMissionUtils';

// Re-export utilities for backward compatibility
export { isGuid, getSavedClosureReports, saveClosureReportLocally };

export const StaffPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StaffNavTab>('mission');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const { profile, handleProfileUpdated } = useStaffProfile();

  const {
    activeMission,
    setActiveMission,
    isViewingStandby,
    setIsViewingStandby,
    missionHistory,
    loadingAssignments,
    fetchError,
    toasts,
    dismissToast,
    isAlertOpen,
    isReportModalOpen,
    setIsReportModalOpen,
    isSubmittingReport,
    isHistoryOpen,
    setIsHistoryOpen,
    pendingMission,
    fetchMyAssignments,
    handleStatusChange,
    handleNextStep,
    handlePrevStep,
    handleSelectStep,
    handleSubmitReport,
    handleAcceptMission,
    handleDeclineMission,
  } = useStaffMission({
    vehiclePlate: profile.vehiclePlate,
    onNavigateTab: setActiveTab,
  });

  const hasActiveMission = Boolean(activeMission && activeMission.status !== 'completed');

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans select-none">
      {/* 1. Left Feature Sidebar Component */}
      <StaffSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        hasActiveMission={hasActiveMission}
        profile={profile}
      />

      {/* 2. Main Content View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Operational Bar */}
        <StaffNavbar
          profile={profile}
          hasActiveMission={hasActiveMission}
          onOpenHistory={() => setIsHistoryOpen(true)}
        />

        {/* Content Body based on selected Tab */}
        <main className="flex-1 overflow-y-auto relative bg-slate-50">
          {/* TAB 1: Live Mission HUD & Tactical Navigation OR Standby Readiness */}
          {activeTab === 'mission' && (
            <StaffMissionTab
              activeMission={activeMission}
              isViewingStandby={isViewingStandby}
              setIsViewingStandby={setIsViewingStandby}
              loadingAssignments={loadingAssignments}
              fetchError={fetchError}
              profile={profile}
              completedMissions={missionHistory}
              onRefresh={() => fetchMyAssignments(false)}
              onStatusChange={handleStatusChange}
              onOpenReportModal={() => setIsReportModalOpen(true)}
              onNextStep={handleNextStep}
              onPrevStep={handlePrevStep}
              onSelectStep={handleSelectStep}
              onSelectStandbyMission={(m) => {
                setActiveMission(m);
                setIsViewingStandby(false);
              }}
              onOpenHistory={() => setIsHistoryOpen(true)}
            />
          )}

          {/* TAB 2: Xem Tổ Làm Việc & Đội Ngũ Trạm */}
          {activeTab === 'team' && <StaffTeamView />}

          {/* TAB 3: Work Schedule & Shift Management */}
          {activeTab === 'schedule' && <StaffScheduleView />}

          {/* TAB 4: Digital Closure Reports Archive */}
          {activeTab === 'reports' && (
            <StaffReportsView
              completedMissions={missionHistory}
              onOpenNewReport={() => {
                if (activeMission) setIsReportModalOpen(true);
              }}
            />
          )}

          {/* TAB 5: Vehicle & Equipment Checklist */}
          {activeTab === 'equipment' && <StaffEquipmentView />}

          {/* TAB 6: Staff Profile & Certifications */}
          {activeTab === 'profile' && (
            <StaffProfileView profile={profile} onProfileUpdated={handleProfileUpdated} />
          )}
        </main>
      </div>

      {/* Emergency Siren Mission Alert Modal */}
      {pendingMission && (
        <StaffMissionAlertModal
          mission={pendingMission}
          isOpen={isAlertOpen}
          onAccept={handleAcceptMission}
          onDecline={handleDeclineMission}
        />
      )}

      {/* Digital Closure Report Modal */}
      {activeMission && (
        <StaffClosureReportModal
          mission={activeMission}
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSubmitReport={handleSubmitReport}
          isSubmitting={isSubmittingReport}
        />
      )}

      {/* Mission History Modal */}
      <StaffMissionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        missions={missionHistory}
        onSelectMission={(m) => {
          setActiveMission(m);
          setActiveTab('mission');
        }}
      />

      {/* Staff Floating Toast Notifications */}
      <StaffToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
