import React, { useState, useEffect, useCallback } from 'react';
import { StaffNavbar } from '../../components/staff/StaffNavbar';
import { StaffSidebar, type StaffNavTab } from '../../components/staff/StaffSidebar';
import { StaffStatusStepper } from '../../components/staff/StaffStatusStepper';
import { StaffTurnByTurnGuide } from '../../components/staff/StaffTurnByTurnGuide';
import { StaffNavigationMap } from '../../components/staff/StaffNavigationMap';
import { StaffMissionAlertModal } from '../../components/staff/StaffMissionAlertModal';
import { StaffClosureReportModal } from '../../components/staff/StaffClosureReportModal';
import { StaffQuickActionPanel } from '../../components/staff/StaffQuickActionPanel';
import { StaffMissionHistoryModal } from '../../components/staff/StaffMissionHistoryModal';
import { StaffScheduleView } from '../../components/staff/schedule/StaffScheduleView';
import { StaffReportsView } from '../../components/staff/reports/StaffReportsView';
import { StaffEquipmentView } from '../../components/staff/equipment/StaffEquipmentView';
import { StaffProfileView } from '../../components/staff/profile/StaffProfileView';
import {
  initialStaffMission,
  mockStaffProfile,
  sampleIncomingMissions,
  mockRouteSteps,
  mockRoutePolyline,
} from '../../data/staffMock';
import type { StaffMission, MissionStatus, DigitalClosureReport, StaffProfile } from '../../types/staff';
import { SEVERITY_META } from '../../data/incidentMock';
import { HazardTagBadge } from '../../components/dashboard/incidents/HazardTagBadge';
import { MapPin, Phone, User, ShieldAlert, Clock } from 'lucide-react';
import { staffAudioService } from '../../services/staffAudioService';
import { useAuth } from '../../hooks/useAuth';

export const StaffPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();

  const [profile, setProfile] = useState<StaffProfile>(() => {
    if (user) {
      return {
        ...mockStaffProfile,
        id: user.id || mockStaffProfile.id,
        name: user.fullName || mockStaffProfile.name,
        email: user.email || mockStaffProfile.email,
        phone: user.phoneNumber || mockStaffProfile.phone,
        role: user.role === 'RescueStaff' ? 'Chỉ Huy Xe Phản Ứng Cứu Hộ' : (user.role || mockStaffProfile.role),
        stationName: user.stationName || mockStaffProfile.stationName,
        badgeNumber: user.id ? `ED-${user.id.slice(-4).toUpperCase()}` : mockStaffProfile.badgeNumber,
      };
    }
    return mockStaffProfile;
  });

  useEffect(() => {
    refreshProfile().then((userData) => {
      if (userData) {
        setProfile((prev) => ({
          ...prev,
          id: userData.id || prev.id,
          name: userData.fullName || prev.name,
          email: userData.email || prev.email,
          phone: userData.phoneNumber || prev.phone,
          role: userData.role === 'RescueStaff' ? 'Chỉ Huy Xe Phản Ứng Cứu Hộ' : (userData.role || prev.role),
          stationName: userData.stationName || prev.stationName,
          badgeNumber: userData.citizenIdNumber ? `ED-${userData.citizenIdNumber.slice(-4)}` : (userData.id ? `ED-${userData.id.slice(-4).toUpperCase()}` : prev.badgeNumber),
        }));
      }
    });
  }, [refreshProfile]);

  const handleProfileUpdated = useCallback((updatedUser: any) => {
    if (updatedUser) {
      setProfile((prev) => ({
        ...prev,
        id: updatedUser.id || prev.id,
        name: updatedUser.fullName || prev.name,
        email: updatedUser.email || prev.email,
        phone: updatedUser.phoneNumber || prev.phone,
        role: updatedUser.role === 'RescueStaff' ? 'Chỉ Huy Xe Phản Ứng Cứu Hộ' : (updatedUser.role || prev.role),
        stationName: updatedUser.stationName || prev.stationName,
        badgeNumber: updatedUser.citizenIdNumber ? `ED-${updatedUser.citizenIdNumber.slice(-4)}` : (updatedUser.id ? `ED-${updatedUser.id.slice(-4).toUpperCase()}` : prev.badgeNumber),
      }));
    }
  }, []);

  const [activeTab, setActiveTab] = useState<StaffNavTab>('mission');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const [activeMission, setActiveMission] = useState<StaffMission>(initialStaffMission);
  const [missionHistory, setMissionHistory] = useState<StaffMission[]>([]);

  // Modals state
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Incoming pending mission to be accepted/declined in alert modal
  const [pendingMission, setPendingMission] = useState<StaffMission | null>(null);

  // Status transition handler
  const handleStatusChange = (nextStatus: MissionStatus) => {
    const timestamp = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const statusLabels: Record<MissionStatus, string> = {
      accepted: 'Đã tiếp nhận phân công nhiệm vụ',
      en_route: 'Xe xuất phát - Đang trên đường tới hiện trường',
      on_scene: 'Đã tiếp cận hiện trường - Triển khai đội hình cứu nạn',
      completed: 'Hoàn tất xử lý sự cố & Lập báo cáo điện tử',
    };

    setActiveMission((prev) => {
      const updatedTimeline = [
        ...prev.timeline,
        {
          id: `tl-${Date.now()}`,
          timestamp,
          status: nextStatus,
          label: statusLabels[nextStatus],
        },
      ];

      return {
        ...prev,
        status: nextStatus,
        timeline: updatedTimeline,
        ...(nextStatus === 'en_route' ? { enRouteAt: new Date().toISOString() } : {}),
        ...(nextStatus === 'on_scene' ? { onSceneAt: new Date().toISOString() } : {}),
        ...(nextStatus === 'completed' ? { completedAt: new Date().toISOString() } : {}),
      };
    });

    if (nextStatus === 'completed') {
      setIsReportModalOpen(true);
    }
  };

  // Turn-by-turn steps navigation
  const handleNextStep = () => {
    if (!activeMission.routeSteps) return;
    if (activeMission.currentStepIndex < activeMission.routeSteps.length - 1) {
      const nextIdx = activeMission.currentStepIndex + 1;
      const stepCoords = activeMission.routeSteps[nextIdx];
      setActiveMission((prev) => ({
        ...prev,
        currentStepIndex: nextIdx,
        vehicleLat: stepCoords.lat,
        vehicleLng: stepCoords.lng,
      }));
    }
  };

  const handlePrevStep = () => {
    if (!activeMission.routeSteps) return;
    if (activeMission.currentStepIndex > 0) {
      const prevIdx = activeMission.currentStepIndex - 1;
      const stepCoords = activeMission.routeSteps[prevIdx];
      setActiveMission((prev) => ({
        ...prev,
        currentStepIndex: prevIdx,
        vehicleLat: stepCoords.lat,
        vehicleLng: stepCoords.lng,
      }));
    }
  };

  // Submit Closure Report
  const handleSubmitReport = (report: DigitalClosureReport) => {
    const updatedMission: StaffMission = {
      ...activeMission,
      status: 'completed',
      closureReport: report,
      completedAt: report.completedAt,
    };

    setActiveMission(updatedMission);
    setMissionHistory((prev) => [updatedMission, ...prev.filter((m) => m.id !== updatedMission.id)]);
    setIsReportModalOpen(false);
  };

  // Simulate Incoming Dispatch with Siren
  const handleSimulateNewMission = () => {
    const randomSeed =
      sampleIncomingMissions[Math.floor(Math.random() * sampleIncomingMissions.length)];
    const newMissionId = `MS-2026-${Math.floor(100 + Math.random() * 900)}`;

    const generatedMission: StaffMission = {
      id: newMissionId,
      incidentId: randomSeed.incidentId || `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: randomSeed.title || 'Báo cáo sự cố khẩn cấp mới',
      description: randomSeed.description || 'Cần lực lượng phản ứng nhanh tới hiện trường ngay lập tức.',
      severity: randomSeed.severity || 4,
      hazardTags: randomSeed.hazardTags || ['fire', 'injury'],
      area: randomSeed.area || 'Quận 1',
      address: randomSeed.address || 'Giao lộ trung tâm TP.HCM',
      incidentLat: randomSeed.incidentLat || 10.7725,
      incidentLng: randomSeed.incidentLng || 106.6980,
      callerName: randomSeed.callerName || 'Người dân báo tin',
      callerPhone: randomSeed.callerPhone || '0901 234 567',
      assignedAt: new Date().toISOString(),
      vehicleId: profile.id,
      vehiclePlate: profile.vehiclePlate,
      vehicleType: profile.vehicleType,
      vehicleLat: 10.7769,
      vehicleLng: 106.7009,
      status: 'accepted',
      currentStepIndex: 0,
      routeSteps: mockRouteSteps,
      routePolyline: mockRoutePolyline,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          status: 'accepted',
          label: `Tổng đài CAD điều động kíp xe ${profile.vehiclePlate} tiếp nhận nhiệm vụ ${newMissionId}`,
        },
      ],
    };

    setPendingMission(generatedMission);
    setIsAlertOpen(true);
    setActiveTab('mission'); // Auto switch to mission tab
  };

  const handleAcceptMission = () => {
    if (pendingMission) {
      setActiveMission(pendingMission);
      setPendingMission(null);
    }
    setIsAlertOpen(false);
  };

  const handleDeclineMission = (reason: string) => {
    setIsAlertOpen(false);
    setPendingMission(null);
  };

  const severityMeta = SEVERITY_META[activeMission.severity];

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans select-none">
      {/* 1. Left Feature Sidebar Component */}
      <StaffSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        hasActiveMission={Boolean(activeMission)}
        profile={profile}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar */}
        <StaffNavbar
          profile={profile}
          hasActiveMission={Boolean(activeMission)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onSimulateNewMission={handleSimulateNewMission}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 min-h-0 p-3 sm:p-4 md:p-5 overflow-y-auto">
          {/* TAB 1: Live Mission & Navigation HUD */}
          {activeTab === 'mission' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pb-8">
              {/* Left Column: Mission Status & Navigation HUD & Actions (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Status Stepper */}
                <StaffStatusStepper
                  mission={activeMission}
                  onStatusChange={handleStatusChange}
                  onOpenReportModal={() => setIsReportModalOpen(true)}
                />

                {/* Turn-by-Turn Navigation Guide HUD */}
                <StaffTurnByTurnGuide
                  steps={activeMission.routeSteps}
                  currentStepIndex={activeMission.currentStepIndex}
                  onNextStep={handleNextStep}
                  onPrevStep={handlePrevStep}
                  isEnRoute={activeMission.status === 'en_route'}
                />

                {/* Incident Summary Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold flex items-center gap-1 border ${severityMeta.badgeClass}`}>
                        <ShieldAlert className="w-3.5 h-3.5" />
                        MỨC ĐỘ {activeMission.severity} ({severityMeta.label})
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        #{activeMission.incidentId}
                      </span>
                    </div>

                    <span className="text-xs text-red-600 font-mono font-bold">
                      {activeMission.area}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {activeMission.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeMission.description}
                  </p>

                  {/* Hazard Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {activeMission.hazardTags.map((tag) => (
                      <HazardTagBadge key={tag} tag={tag} size="sm" />
                    ))}
                  </div>

                  {/* Address & Caller */}
                  <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span className="font-medium text-slate-900">{activeMission.address}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-red-600" />
                        <span>Người báo: <strong className="text-slate-900">{activeMission.callerName}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-red-600" />
                        <a href={`tel:${activeMission.callerPhone}`} className="text-red-600 font-mono font-bold hover:underline">
                          {activeMission.callerPhone}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Quick Action Panel */}
                <StaffQuickActionPanel missionId={activeMission.id} />
              </div>

              {/* Right Column: Navigation Map (7 cols) */}
              <div className="lg:col-span-7 h-[500px] lg:h-[calc(100vh-130px)] lg:sticky lg:top-0 min-h-[420px]">
                <StaffNavigationMap
                  mission={activeMission}
                  currentStepIndex={activeMission.currentStepIndex}
                />
              </div>
            </div>
          )}

          {/* TAB 2: Work Schedule & Shift Management */}
          {activeTab === 'schedule' && <StaffScheduleView />}

          {/* TAB 3: Digital Closure Reports Archive */}
          {activeTab === 'reports' && (
            <StaffReportsView
              completedMissions={
                missionHistory.length > 0 ? missionHistory : [activeMission]
              }
              onOpenNewReport={() => setIsReportModalOpen(true)}
            />
          )}

          {/* TAB 4: Vehicle & Equipment Checklist */}
          {activeTab === 'equipment' && <StaffEquipmentView />}

          {/* TAB 5: Staff Profile & Certifications */}
          {activeTab === 'profile' && (
            <StaffProfileView profile={profile} onProfileUpdated={handleProfileUpdated} />
          )}
        </main>
      </div>

      {/* Emergency Siren Mission Alert Modal */}
      <StaffMissionAlertModal
        mission={pendingMission || activeMission}
        isOpen={isAlertOpen}
        onAccept={handleAcceptMission}
        onDecline={handleDeclineMission}
      />

      {/* Digital Closure Report Modal */}
      <StaffClosureReportModal
        mission={activeMission}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={handleSubmitReport}
      />

      {/* Mission History Modal */}
      <StaffMissionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        missions={missionHistory.length > 0 ? missionHistory : [activeMission]}
        onSelectMission={(m) => {
          setActiveMission(m);
          setActiveTab('mission');
        }}
      />
    </div>
  );
};
