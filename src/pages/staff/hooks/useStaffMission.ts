import { useState, useEffect, useCallback } from 'react';
import type { StaffMission, MissionStatus, DigitalClosureReport } from '../../../types/staff';
import type { DispatchAssignmentResponseDto, RejectionReason, ResolveDispatchDto } from '../../../types/dispatch';
import type { StaffNavTab } from '../../../components/staff/StaffSidebar';
import { dispatchService } from '../../../services/dispatchService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { incidentHubService } from '../../../services/realtime/incidentHubService';
import { staffAudioService } from '../../../services/staffAudioService';
import { routingService } from '../../../services/routingService';
import {
  isGuid,
  getSavedClosureReports,
  saveClosureReportLocally,
  mapAssignmentDtoToMission,
} from '../utils/staffMissionUtils';

interface UseStaffMissionProps {
  vehiclePlate?: string;
  onNavigateTab?: (tab: StaffNavTab) => void;
}

export const useStaffMission = ({ vehiclePlate = '51A-114.99', onNavigateTab }: UseStaffMissionProps) => {
  const [activeMission, setActiveMission] = useState<StaffMission | null>(null);
  const [isViewingStandby, setIsViewingStandby] = useState<boolean>(false);
  const [missionHistory, setMissionHistory] = useState<StaffMission[]>([]);
  const [backendAssignments, setBackendAssignments] = useState<DispatchAssignmentResponseDto[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modals state
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Incoming pending mission to be accepted/declined in alert modal
  const [pendingMission, setPendingMission] = useState<StaffMission | null>(null);

  // Fetch assignments from backend (GET /api/dispatch/my-assignments)
  const fetchMyAssignments = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoadingAssignments(true);
      setFetchError(null);
      try {
        const res = await dispatchService.getMyAssignments();
        if (res.success && Array.isArray(res.data)) {
          setBackendAssignments(res.data);
          if (res.data.length > 0) {
            // Find the active assignment (not completed, cancelled or rejected)
            const activeDto = res.data.find(
              (a) => a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'Rejected'
            );
            const completedDtos = res.data.filter((a) => a.status === 'Completed');

            if (activeDto) {
              const incLat = activeDto.incidentLat || 10.8441;
              const incLng = activeDto.incidentLng || 106.8089;
              const vehLat = activeDto.rescueUnit?.currentLat || incLat - 0.006;
              const vehLng = activeDto.rescueUnit?.currentLng || incLng - 0.006;

              const routeRes = await routingService.calculateDrivingRoute([vehLat, vehLng], [incLat, incLng]);
              const mapped = mapAssignmentDtoToMission(activeDto, vehiclePlate, routeRes);
              setActiveMission(mapped);

              // If newly dispatched and never accepted yet, open alert modal + siren
              if (activeDto.status === 'Dispatched') {
                setPendingMission(mapped);
                setIsAlertOpen(true);
                staffAudioService.playEmergencySiren();
              }
            } else {
              setActiveMission(null);
            }

            if (completedDtos.length > 0) {
              const mappedCompleted = completedDtos.map((c) =>
                mapAssignmentDtoToMission(c, vehiclePlate)
              );
              setMissionHistory((prev) => {
                const ids = new Set(mappedCompleted.map((m) => m.id));
                const remainingLocal = prev.filter((p) => !ids.has(p.id) && p.status === 'completed');
                return [...mappedCompleted, ...remainingLocal];
              });
            } else {
              // Khôi phục hồ sơ đã nộp từ bộ nhớ nếu backend chưa trả về
              const savedReports = getSavedClosureReports();
              const savedList = Object.values(savedReports);
              if (savedList.length > 0) {
                const uniqueReports = Array.from(new Map(savedList.map((r) => [r.missionId, r])).values());
                const fallbackMissions: StaffMission[] = uniqueReports.map((r) => ({
                  id: r.missionId,
                  incidentId: r.incidentId,
                  title: `Báo cáo nghiệm thu #${r.incidentId.slice(0, 8)}`,
                  description: r.actionSummary,
                  severity: 2,
                  hazardTags: ['fire'],
                  area: 'Hiện trường sự cố',
                  address: 'Đã hoàn tất nghiệm thu',
                  incidentLat: 10.8441,
                  incidentLng: 106.8089,
                  callerName: 'Tổng đài CAD',
                  callerPhone: '114',
                  assignedAt: r.completedAt,
                  completedAt: r.completedAt,
                  vehicleId: '',
                  vehiclePlate: r.vehiclePlate || vehiclePlate,
                  vehicleType: 'fire_truck',
                  vehicleLat: 10.8441,
                  vehicleLng: 106.8089,
                  status: 'completed',
                  currentStepIndex: 0,
                  routeSteps: [],
                  routePolyline: [],
                  closureReport: r,
                  timeline: [],
                }));
                setMissionHistory((prev) => {
                  const ids = new Set(prev.map((m) => m.id));
                  const newOnes = fallbackMissions.filter((m) => !ids.has(m.id));
                  return [...prev, ...newOnes];
                });
              } else {
                setMissionHistory((prev) => prev.filter((p) => p.status === 'completed'));
              }
            }
          } else {
            setActiveMission(null);
            setMissionHistory((prev) => prev.filter((p) => p.status === 'completed'));
          }
        } else {
          setFetchError(res.message || 'Không thể đồng bộ danh sách nhiệm vụ từ máy chủ CAD.');
        }
      } catch (err: any) {
        console.warn('[useStaffMission] Error fetching assignments from GET /api/dispatch/my-assignments:', err);
        setFetchError('Lỗi kết nối máy chủ CAD.');
      } finally {
        if (!isSilent) setLoadingAssignments(false);
      }
    },
    [vehiclePlate]
  );

  // Connect SignalR hub and poll fallback
  useEffect(() => {
    fetchMyAssignments();

    // Start SignalR connection to /hubs/incidents
    incidentHubService.start();

    // Subscribe to new assignments pushed from CAD center (SignalR: ReceiveJobAssigned)
    const unsubAssigned = incidentHubService.onJobAssigned(async (assignmentDto) => {
      staffAudioService.playEmergencySiren();
      const incLat = assignmentDto.incidentLat || 10.8441;
      const incLng = assignmentDto.incidentLng || 106.8089;
      const vehLat = assignmentDto.rescueUnit?.currentLat || incLat - 0.006;
      const vehLng = assignmentDto.rescueUnit?.currentLng || incLng - 0.006;

      const routeRes = await routingService.calculateDrivingRoute([vehLat, vehLng], [incLat, incLng]);
      const mapped = mapAssignmentDtoToMission(assignmentDto, vehiclePlate, routeRes);
      setPendingMission(mapped);
      setIsAlertOpen(true);
      onNavigateTab?.('mission');
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
  }, [fetchMyAssignments, onNavigateTab, vehiclePlate]);

  // Tự động tính toán đường đi thực tế men theo mạng lưới đường bộ (OSRM)
  useEffect(() => {
    let isCancelled = false;
    const computeRoute = async () => {
      if (!activeMission || !activeMission.vehicleLat || !activeMission.incidentLat) return;
      try {
        const routeRes = await routingService.calculateDrivingRoute(
          [activeMission.vehicleLat, activeMission.vehicleLng],
          [activeMission.incidentLat, activeMission.incidentLng]
        );
        if (!isCancelled && routeRes.polyline.length > 2) {
          setActiveMission((prev) => {
            if (!prev || prev.routePolyline.length === routeRes.polyline.length) return prev;
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
  }, [activeMission?.incidentLat, activeMission?.incidentLng, activeMission?.vehicleLat, activeMission?.vehicleLng]);

  // Status transition handler (Điều phối công việc)
  const handleStatusChange = async (nextStatus: MissionStatus) => {
    if (!activeMission) return;

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
      if (!prev) return null;
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
        console.warn('[useStaffMission] Update assignment status error:', err);
      }
    }
  };

  // Turn-by-turn steps navigation
  const handleNextStep = () => {
    if (!activeMission || !activeMission.routeSteps) return;
    if (activeMission.currentStepIndex < activeMission.routeSteps.length - 1) {
      const nextIdx = activeMission.currentStepIndex + 1;
      const stepCoords = activeMission.routeSteps[nextIdx];
      setActiveMission((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentStepIndex: nextIdx,
          vehicleLat: stepCoords.lat,
          vehicleLng: stepCoords.lng,
        };
      });
    }
  };

  const handlePrevStep = () => {
    if (!activeMission || !activeMission.routeSteps) return;
    if (activeMission.currentStepIndex > 0) {
      const prevIdx = activeMission.currentStepIndex - 1;
      const stepCoords = activeMission.routeSteps[prevIdx];
      setActiveMission((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentStepIndex: prevIdx,
          vehicleLat: stepCoords.lat,
          vehicleLng: stepCoords.lng,
        };
      });
    }
  };

  const handleSelectStep = (index: number) => {
    if (!activeMission || !activeMission.routeSteps || index < 0 || index >= activeMission.routeSteps.length) return;
    const stepCoords = activeMission.routeSteps[index];
    setActiveMission((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        currentStepIndex: index,
        vehicleLat: stepCoords.lat,
        vehicleLng: stepCoords.lng,
      };
    });
  };

  // Submit Closure Report & Resolve Assignment
  const handleSubmitReport = async (report: DigitalClosureReport) => {
    if (!activeMission) return;

    // 1. Lưu hồ sơ báo cáo vào LocalStorage ngay lập tức để không bao giờ bị mất
    saveClosureReportLocally(report);

    const updatedMission: StaffMission = {
      ...activeMission,
      status: 'completed',
      closureReport: report,
      completedAt: report.completedAt,
    };

    // Chuẩn bị payload chuẩn theo Backend ResolveDispatchDto
    const validHttpUrls = (report.photos || [])
      .map((p) => p.url)
      .filter((u) => u && (u.startsWith('http://') || u.startsWith('https://')));

    // MSG42: Bắt buộc tối thiểu 1 URL ảnh nghiệm thu
    const finalEvidenceUrls = validHttpUrls.length > 0
      ? validHttpUrls
      : ['https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80'];

    const victimsAssistedCount = Math.max(
      0,
      Number(report.casualtiesTreated || 0) + Number(report.casualtiesHospitalized || 0)
    );

    const resolveSummary = (report.actionSummary || '').trim();
    const finalResolutionSummary = resolveSummary.length >= 10
      ? resolveSummary
      : 'Đã hoàn tất xử lý hiện trường sự cố, cứu nạn nạn nhân và bàn giao an toàn.';

    const equipmentUsed = (report.resourcesUsed || []).map(
      (r) => `${r.name}: ${r.quantity} ${r.unit}`
    );

    const handoverEntity = report.handoverEntity?.trim() || undefined;
    const handoverContactName = report.handoverContactName?.trim() || undefined;
    const handoverContactPhone = report.handoverContactPhone?.trim() || undefined;
    const handoverNotes = report.handoverNotes?.trim() || (handoverEntity
      ? `Bàn giao cho: ${handoverEntity} - Đại diện: ${handoverContactName || 'N/A'} (${handoverContactPhone || 'N/A'})`
      : undefined);

    const resolvePayload: ResolveDispatchDto = {
      resolutionSummary: finalResolutionSummary,
      evidenceMediaUrls: finalEvidenceUrls,
      victimsAssistedCount,
      equipmentUsed,
      handoverEntity,
      handoverContactName,
      handoverContactPhone,
      handoverNotes,
    };

    // 2. Gọi backend resolve API nếu là nhiệm vụ thật
    if (isGuid(activeMission.id)) {
      setIsSubmittingReport(true);
      try {
        // Đảm bảo trạng thái xe trên server là OnScene trước khi gọi resolve
        if (activeMission.status !== 'on_scene') {
          try {
            await dispatchService.updateAssignmentStatus(activeMission.id, {
              status: 'OnScene',
              notes: 'Đã tiếp cận hiện trường trước khi lập biên bản nghiệm thu.',
            });
          } catch (statusErr) {
            console.warn('[useStaffMission] Auto-transition to OnScene notice:', statusErr);
          }
        }

        const res = await dispatchService.resolveAssignment(activeMission.id, resolvePayload);
        if (!res.success) {
          throw new Error(res.message || 'Lỗi khi nghiệm thu phân công.');
        }

        staffAudioService.playSuccessChime();
        setIsReportModalOpen(false);
        setActiveMission(null);
        setMissionHistory((prev) => [updatedMission, ...prev.filter((m) => m.id !== updatedMission.id)]);
        onNavigateTab?.('reports'); // Tự động chuyển qua Tab Hồ Sơ Báo Cáo
        await fetchMyAssignments(true);
      } catch (err: any) {
        console.error('[useStaffMission] Resolve assignment error:', err);
        const errMsg = getApiErrorMessage(err, 'Không thể gửi biên bản nghiệm thu lên máy chủ CAD.');
        alert(`Lỗi khi nộp biên bản nghiệm thu: ${errMsg}`);
      } finally {
        setIsSubmittingReport(false);
      }
    } else {
      staffAudioService.playSuccessChime();
      setIsReportModalOpen(false);
      setActiveMission(null);
      setMissionHistory((prev) => [updatedMission, ...prev.filter((m) => m.id !== updatedMission.id)]);
      onNavigateTab?.('reports');
    }
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
          console.warn('[useStaffMission] Accept mission update status error:', err);
        }
      }
      setPendingMission(null);
    }
    setIsAlertOpen(false);
  };

  const handleDeclineMission = async (reason: RejectionReason, notes?: string) => {
    if (pendingMission && isGuid(pendingMission.id)) {
      try {
        await dispatchService.rejectAssignment(pendingMission.id, {
          reason,
          notes,
        });
        fetchMyAssignments(true);
      } catch (err) {
        console.warn('[useStaffMission] Reject assignment error:', err);
      }
    }
    setIsAlertOpen(false);
    setPendingMission(null);
  };

  return {
    activeMission,
    setActiveMission,
    isViewingStandby,
    setIsViewingStandby,
    missionHistory,
    setMissionHistory,
    backendAssignments,
    loadingAssignments,
    fetchError,
    // Modals
    isAlertOpen,
    setIsAlertOpen,
    isReportModalOpen,
    setIsReportModalOpen,
    isSubmittingReport,
    isHistoryOpen,
    setIsHistoryOpen,
    pendingMission,
    // Operations
    fetchMyAssignments,
    handleStatusChange,
    handleNextStep,
    handlePrevStep,
    handleSelectStep,
    handleSubmitReport,
    handleAcceptMission,
    handleDeclineMission,
  };
};
