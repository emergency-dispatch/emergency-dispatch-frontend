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
import { StaffTeamView } from '../../components/staff/team/StaffTeamView';
import {
  initialStaffMission,
  mockStaffProfile,
  sampleIncomingMissions,
  mockRouteSteps,
  mockRoutePolyline,
} from '../../data/staffMock';
import type { StaffMission, MissionStatus, DigitalClosureReport, StaffProfile } from '../../types/staff';
import type { DispatchAssignmentResponseDto } from '../../types/dispatch';
import { dispatchService } from '../../services/dispatchService';
import { incidentHubService } from '../../services/realtime/incidentHubService';
import { SEVERITY_META } from '../../data/incidentMock';
import { HazardTagBadge } from '../../components/common/HazardTagBadge';
import { MapPin, Phone, User, ShieldAlert, Clock, RefreshCw, Radio } from 'lucide-react';
import { staffAudioService } from '../../services/staffAudioService';
import { useAuth } from '../../hooks/useAuth';
import { routingService, type RouteResult } from '../../services/routingService';

export const isGuid = (val?: string): boolean =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

function mapAssignmentDtoToMission(
  dto: DispatchAssignmentResponseDto,
  fallbackVehiclePlate?: string,
  routeResult?: RouteResult
): StaffMission {
  let missionStatus: MissionStatus = 'accepted';
  if (dto.status === 'EnRoute') missionStatus = 'en_route';
  else if (dto.status === 'OnScene') missionStatus = 'on_scene';
  else if (dto.status === 'Completed' || dto.status === 'Cancelled') missionStatus = 'completed';
  else if (dto.status === 'Accepted' || dto.status === 'Dispatched') missionStatus = 'accepted';

  let sev: 1 | 2 | 3 = 2;
  const s = String(dto.incidentSeverity).toLowerCase();
  if (s.includes('3') || s.includes('critical') || s.includes('high') || s.includes('level3')) sev = 3;
  else if (s.includes('1') || s.includes('low') || s.includes('level1')) sev = 1;

  const incLat = dto.incidentLat || 10.8441;
  const incLng = dto.incidentLng || 106.8089;
  const vehLat = dto.rescueUnit?.currentLat || incLat - 0.006;
  const vehLng = dto.rescueUnit?.currentLng || incLng - 0.006;

  const plate = dto.rescueUnit?.plateNumber || fallbackVehiclePlate || '51A-114.99';

  return {
    id: dto.id,
    incidentId: dto.incidentId,
    title: dto.incidentTitle || 'Nhiệm vụ cứu hộ khẩn cấp',
    description: dto.notes || 'Lực lượng phản ứng nhanh tiếp cận hiện trường và xử lý cứu hộ.',
    severity: sev,
    hazardTags: ['fire', 'injury'],
    area: dto.rescueUnit?.stationName || 'Khu vực quản lý',
    address: dto.incidentAddress || 'Địa chỉ sự cố đang xử lý',
    incidentLat: incLat,
    incidentLng: incLng,
    callerName: 'Tổng đài viên điều động',
    callerPhone: '114',
    assignedAt: dto.dispatchedAt,
    acceptedAt: dto.acceptedAt || undefined,
    enRouteAt: dto.status === 'EnRoute' || dto.status === 'OnScene' || dto.status === 'Completed' ? dto.dispatchedAt : undefined,
    onSceneAt: dto.arrivedAt || undefined,
    completedAt: dto.completedAt || undefined,
    vehicleId: dto.rescueUnitId,
    vehiclePlate: plate,
    vehicleType: 'fire_truck',
    vehicleLat: vehLat,
    vehicleLng: vehLng,
    status: missionStatus,
    currentStepIndex: 0,
    routeSteps: routeResult?.steps || mockRouteSteps,
    routePolyline: routeResult?.polyline || mockRoutePolyline,
    timeline: [
      {
        id: `tl-disp-${dto.id}`,
        timestamp: new Date(dto.dispatchedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'accepted',
        label: `Tổng đài điều phối kíp xe ${plate} tới hiện trường`,
      },
      ...(dto.acceptedAt ? [{
        id: `tl-acc-${dto.id}`,
        timestamp: new Date(dto.acceptedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'accepted' as MissionStatus,
        label: 'Đội xe đã xác nhận tiếp nhận lệnh',
      }] : []),
      ...(dto.arrivedAt ? [{
        id: `tl-arr-${dto.id}`,
        timestamp: new Date(dto.arrivedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'on_scene' as MissionStatus,
        label: 'Đã tiếp cận hiện trường sự cố',
      }] : []),
      ...(dto.completedAt ? [{
        id: `tl-comp-${dto.id}`,
        timestamp: new Date(dto.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        status: 'completed' as MissionStatus,
        label: 'Hoàn tất nghiệm thu & đóng nhiệm vụ',
      }] : []),
    ],
  };
}

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
  const [backendAssignments, setBackendAssignments] = useState<DispatchAssignmentResponseDto[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState<boolean>(false);

  // Modals state
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Incoming pending mission to be accepted/declined in alert modal
  const [pendingMission, setPendingMission] = useState<StaffMission | null>(null);

  // Fetch assignments from backend (GET /api/dispatch/my-assignments)
  const fetchMyAssignments = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingAssignments(true);
    try {
      const res = await dispatchService.getMyAssignments();
      if (res.success && Array.isArray(res.data)) {
        setBackendAssignments(res.data);
        if (res.data.length > 0) {
          // Find the active assignment (not completed/cancelled)
          const activeDto = res.data.find(
            (a) => a.status !== 'Completed' && a.status !== 'Cancelled'
          );
          const completedDtos = res.data.filter(
            (a) => a.status === 'Completed' || a.status === 'Cancelled'
          );

          if (activeDto) {
            const incLat = activeDto.incidentLat || 10.8441;
            const incLng = activeDto.incidentLng || 106.8089;
            const vehLat = activeDto.rescueUnit?.currentLat || incLat - 0.006;
            const vehLng = activeDto.rescueUnit?.currentLng || incLng - 0.006;

            const routeRes = await routingService.calculateDrivingRoute([vehLat, vehLng], [incLat, incLng]);
            const mapped = mapAssignmentDtoToMission(activeDto, profile.vehiclePlate, routeRes);
            setActiveMission(mapped);

            // If newly dispatched and never accepted yet, open alert modal + siren
            if (activeDto.status === 'Dispatched') {
              setPendingMission(mapped);
              setIsAlertOpen(true);
              staffAudioService.playEmergencySiren();
            }
          }

          if (completedDtos.length > 0) {
            setMissionHistory(
              completedDtos.map((c) => mapAssignmentDtoToMission(c, profile.vehiclePlate))
            );
          }
        }
      }
    } catch (err) {
      console.warn('[StaffPage] Could not load assignments from backend (using local mission):', err);
    } finally {
      if (!isSilent) setLoadingAssignments(false);
    }
  }, [profile.vehiclePlate]);

  // Connect SignalR hub and poll fallback
  useEffect(() => {
    fetchMyAssignments();

    // Start SignalR connection to /hubs/incidents
    incidentHubService.start();

    // Subscribe to new assignments pushed from CAD center (GET / Receive thông báo cứu hộ)
    const unsubAssigned = incidentHubService.onJobAssigned(async (assignmentDto) => {
      staffAudioService.playEmergencySiren();
      const incLat = assignmentDto.incidentLat || 10.8441;
      const incLng = assignmentDto.incidentLng || 106.8089;
      const vehLat = assignmentDto.rescueUnit?.currentLat || incLat - 0.006;
      const vehLng = assignmentDto.rescueUnit?.currentLng || incLng - 0.006;

      const routeRes = await routingService.calculateDrivingRoute([vehLat, vehLng], [incLat, incLng]);
      const mapped = mapAssignmentDtoToMission(assignmentDto, profile.vehiclePlate, routeRes);
      setPendingMission(mapped);
      setIsAlertOpen(true);
      setActiveTab('mission');
      fetchMyAssignments(true);
    });

    const unsubStatus = incidentHubService.onAssignmentStatus(() => {
      fetchMyAssignments(true);
    });

    // Polling fallback every 15 seconds
    const intervalId = setInterval(() => {
      fetchMyAssignments(true);
    }, 15000);

    return () => {
      unsubAssigned();
      unsubStatus();
      clearInterval(intervalId);
    };
  }, [fetchMyAssignments, profile.vehiclePlate]);

  // Tự động tính toán đường đi thực tế men theo mạng lưới đường bộ (OSRM)
  useEffect(() => {
    let isCancelled = false;
    const computeRoute = async () => {
      if (!activeMission.vehicleLat || !activeMission.incidentLat) return;
      try {
        const routeRes = await routingService.calculateDrivingRoute(
          [activeMission.vehicleLat, activeMission.vehicleLng],
          [activeMission.incidentLat, activeMission.incidentLng]
        );
        if (!isCancelled && routeRes.polyline.length > 2) {
          setActiveMission((prev) => {
            if (prev.routePolyline.length === routeRes.polyline.length) return prev;
            return {
              ...prev,
              routePolyline: routeRes.polyline,
              routeSteps: routeRes.steps,
            };
          });
        }
      } catch (err) {
        console.warn('Auto route computation warning:', err);
      }
    };

    computeRoute();
    return () => {
      isCancelled = true;
    };
  }, [activeMission.incidentLat, activeMission.incidentLng, activeMission.vehicleLat, activeMission.vehicleLng]);

  // Status transition handler (Điều phối công việc)
  const handleStatusChange = async (nextStatus: MissionStatus) => {
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
      return;
    }

    // Call backend API to update status if mission ID is a valid GUID in DB
    if (isGuid(activeMission.id)) {
      try {
        let beStatus: 'Accepted' | 'EnRoute' | 'OnScene' = 'Accepted';
        if (nextStatus === 'en_route') beStatus = 'EnRoute';
        else if (nextStatus === 'on_scene') beStatus = 'OnScene';

        await dispatchService.updateAssignmentStatus(activeMission.id, {
          status: beStatus,
          notes: statusLabels[nextStatus],
        });
        fetchMyAssignments(true);
      } catch (err) {
        console.warn('[StaffPage] Update assignment status API error:', err);
      }
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

  const handleSelectStep = (index: number) => {
    if (!activeMission.routeSteps || index < 0 || index >= activeMission.routeSteps.length) return;
    const stepCoords = activeMission.routeSteps[index];
    setActiveMission((prev) => ({
      ...prev,
      currentStepIndex: index,
      vehicleLat: stepCoords.lat,
      vehicleLng: stepCoords.lng,
    }));
  };

  // Submit Closure Report & Resolve Assignment
  const handleSubmitReport = async (report: DigitalClosureReport) => {
    const updatedMission: StaffMission = {
      ...activeMission,
      status: 'completed',
      closureReport: report,
      completedAt: report.completedAt,
    };

    setActiveMission(updatedMission);
    setMissionHistory((prev) => [updatedMission, ...prev.filter((m) => m.id !== updatedMission.id)]);
    setIsReportModalOpen(false);

    // Call backend resolve API if real GUID
    if (isGuid(activeMission.id)) {
      try {
        const photoUrls = (report.photos || []).map((p) => p.url).filter((u) => u && !u.startsWith('blob:'));
        await dispatchService.resolveAssignment(activeMission.id, {
          resolutionSummary: report.actionSummary || 'Đã hoàn tất xử lý hiện trường sự cố và bàn giao an toàn.',
          evidenceMediaUrls: photoUrls,
          handoverNotes: `Bàn giao cho: ${report.handoverEntity || 'N/A'} - ${report.handoverContactName || ''} (${report.handoverContactPhone || ''})`,
        });
        fetchMyAssignments(true);
      } catch (err) {
        console.warn('[StaffPage] Resolve assignment API error:', err);
      }
    }
  };

  // Simulate Incoming Dispatch with Siren & OSRM Route
  const handleSimulateNewMission = async () => {
    const randomSeed =
      sampleIncomingMissions[Math.floor(Math.random() * sampleIncomingMissions.length)];
    const newMissionId = `MS-2026-${Math.floor(100 + Math.random() * 900)}`;

    const incLat = randomSeed.incidentLat || 10.8441;
    const incLng = randomSeed.incidentLng || 106.8089;
    const vehLat = 10.8452;
    const vehLng = 106.7955;

    const routeRes = await routingService.calculateDrivingRoute([vehLat, vehLng], [incLat, incLng]);

    const generatedMission: StaffMission = {
      id: newMissionId,
      incidentId: randomSeed.incidentId || `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: randomSeed.title || 'Báo cáo sự cố khẩn cấp mới',
      description: randomSeed.description || 'Cần lực lượng phản ứng nhanh tới hiện trường ngay lập tức.',
      severity: randomSeed.severity || 3,
      hazardTags: randomSeed.hazardTags || ['fire', 'injury'],
      area: randomSeed.area || 'Phân khu 1',
      address: randomSeed.address || 'Đường D1, Khu Công nghệ cao TP.HCM',
      incidentLat: incLat,
      incidentLng: incLng,
      callerName: randomSeed.callerName || 'Công nhân báo tin',
      callerPhone: randomSeed.callerPhone || '0901 234 567',
      assignedAt: new Date().toISOString(),
      vehicleId: profile.id,
      vehiclePlate: profile.vehiclePlate,
      vehicleType: profile.vehicleType,
      vehicleLat: vehLat,
      vehicleLng: vehLng,
      status: 'accepted',
      currentStepIndex: 0,
      routeSteps: routeRes.steps,
      routePolyline: routeRes.polyline,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          status: 'accepted',
          label: `Tổng đài CAD điều động kíp xe ${profile.vehiclePlate} tiếp nhận nhiệm vụ diễn tập ${newMissionId}`,
        },
      ],
    };

    setPendingMission(generatedMission);
    setIsAlertOpen(true);
    setActiveTab('mission');
  };

  const handleAcceptMission = async () => {
    if (pendingMission) {
      setActiveMission(pendingMission);
      if (isGuid(pendingMission.id)) {
        try {
          await dispatchService.updateAssignmentStatus(pendingMission.id, {
            status: 'Accepted',
            notes: 'Đội xe đã xác nhận tiếp nhận lệnh điều phối.',
          });
          fetchMyAssignments(true);
        } catch (err) {
          console.warn('[StaffPage] Accept mission API update status error:', err);
        }
      }
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
        onSelectTab={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        hasActiveMission={activeMission.status !== 'completed'}
        profile={profile}
      />

      {/* 2. Main Content View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Operational Bar */}
        <StaffNavbar
          profile={profile}
          hasActiveMission={activeMission.status !== 'completed'}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onSimulateNewMission={handleSimulateNewMission}
        />

        {/* Content Body based on selected Tab */}
        <main className="flex-1 overflow-y-auto relative bg-slate-50">
          {/* TAB 1: Live Mission HUD & Tactical Navigation */}
          {activeTab === 'mission' && (
            <div className="p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Mission Controls & Telemetry (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Active Dispatches Banner / Quick Refresh */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Radio className="w-4 h-4 text-red-600 animate-pulse shrink-0" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 truncate">
                        Nhiệm Vụ Tác Chiến
                      </span>
                      {isGuid(activeMission.id) ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                          Kết Nối CAD (Trực Tuyến)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                          Chế Độ Diễn Tập
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => fetchMyAssignments(false)}
                      disabled={loadingAssignments}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer disabled:opacity-50 shrink-0"
                      title="Đồng bộ lại danh sách lệnh điều phối từ máy chủ CAD"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingAssignments ? 'animate-spin' : ''}`} />
                      <span>{loadingAssignments ? 'Đang tải...' : 'Đồng bộ CAD'}</span>
                    </button>
                  </div>

                  {!isGuid(activeMission.id) && (
                    <div className="text-[11px] text-slate-600 bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
                        <span className="truncate">
                          {backendAssignments.length === 0
                            ? 'Trực chiến sẵn sàng. Đang chờ lệnh điều động từ Tổng đài qua SignalR.'
                            : 'Đang theo dõi kịch bản diễn tập phản ứng nhanh.'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSimulateNewMission}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline shrink-0 cursor-pointer"
                        title="Đổi tình huống diễn tập khác"
                      >
                        Đổi tình huống
                      </button>
                    </div>
                  )}
                </div>

                {/* Status Stepper */}
                <StaffStatusStepper
                  mission={activeMission}
                  onStatusChange={handleStatusChange}
                  onOpenReportModal={() => setIsReportModalOpen(true)}
                />

                {/* Turn-by-Turn GPS Direction Guide */}
                <StaffTurnByTurnGuide
                  steps={activeMission.routeSteps || mockRouteSteps}
                  currentStepIndex={activeMission.currentStepIndex}
                  onNextStep={handleNextStep}
                  onPrevStep={handlePrevStep}
                  isEnRoute={activeMission.status === 'en_route'}
                />

                {/* Incident Information Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${severityMeta?.badgeClass || 'bg-red-600 text-white'}`}
                      >
                        {severityMeta?.label || `Cấp độ ${activeMission.severity}`}
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
                  onSelectStep={handleSelectStep}
                />
              </div>
            </div>
          )}

          {/* TAB 2: Xem Tổ Làm Việc & Đội Ngũ Trạm */}
          {activeTab === 'team' && <StaffTeamView />}

          {/* TAB 3: Work Schedule & Shift Management */}
          {activeTab === 'schedule' && <StaffScheduleView />}

          {/* TAB 4: Digital Closure Reports Archive */}
          {activeTab === 'reports' && (
            <StaffReportsView
              completedMissions={
                missionHistory.length > 0 ? missionHistory : [activeMission]
              }
              onOpenNewReport={() => setIsReportModalOpen(true)}
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
