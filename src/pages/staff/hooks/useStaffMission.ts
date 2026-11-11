import { useState, useEffect, useCallback } from 'react';
import type { StaffMission, MissionStatus, DigitalClosureReport } from '../../../types/staff';
import type { DispatchAssignmentResponseDto, RejectionReason, ResolveDispatchDto } from '../../../types/dispatch';
import type { StaffNavTab } from '../../../components/staff/StaffSidebar';
import { dispatchService } from '../../../services/dispatchService';
import { incidentService } from '../../../services/incidentService';
import { fieldRequestService } from '../../../services/fieldRequestService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { incidentHubService, HubEvents } from '../../../services/realtime/incidentHubService';
import { staffAudioService } from '../../../services/staffAudioService';
import { routingService } from '../../../services/routingService';
import { mediaService } from '../../../services/mediaService';
import type { FieldRequestDto, CreateFieldRequestDto, FieldRequestEventDto } from '../../../types/fieldRequest';
import type { StaffToastMessage, StaffToastType } from '../../../components/staff/StaffToast';
import {
  isGuid,
  getSavedClosureReports,
  saveClosureReportLocally,
  mapAssignmentDtoToMission,
  dataUrlToFile,
} from '../utils/staffMissionUtils';

const STATUS_PRIORITY: Record<MissionStatus, number> = {
  accepted: 1,
  en_route: 2,
  on_scene: 3,
  completed: 4,
};

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

  // Toast notification state
  const [toasts, setToasts] = useState<StaffToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: StaffToastType, title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: StaffToastMessage = {
      id,
      type,
      title,
      message,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setToasts((prev) => [...prev.slice(-4), newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  // Modals state
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Incoming pending mission to be accepted/declined in alert modal
  const [pendingMission, setPendingMission] = useState<StaffMission | null>(null);

  // §21.2 & 12.2: Yêu cầu chi viện (Backup) và Báo vấn đề khác (Other) từ hiện trường
  const [fieldRequests, setFieldRequests] = useState<FieldRequestDto[]>([]);
  const [loadingFieldRequests, setLoadingFieldRequests] = useState<boolean>(false);

  const fetchFieldRequests = useCallback(async (incidentId: string) => {
    if (!isGuid(incidentId)) return;
    setLoadingFieldRequests(true);
    try {
      const requests = await fieldRequestService.getByIncident(incidentId);
      setFieldRequests(requests);
    } catch (err) {
      console.warn('[useStaffMission] Error fetching field requests:', err);
    } finally {
      setLoadingFieldRequests(false);
    }
  }, []);

  const handleCreateFieldRequest = useCallback(
    async (dto: CreateFieldRequestDto): Promise<boolean> => {
      if (!activeMission?.id) {
        showToast('error', 'LỖI TÁC CHIẾN', 'Không tìm thấy lượt điều phối hợp lệ để phát yêu cầu.');
        return false;
      }

      try {
        const created = await fieldRequestService.create(activeMission.id, dto);
        setFieldRequests((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
        staffAudioService.playSuccessChime();
        showToast(
          'success',
          'ĐÃ PHÁT TÍN HIỆU HIỆN TRƯỜNG',
          dto.type === 'Backup'
            ? `Đã gửi yêu cầu chi viện ${dto.quantity} xe về trung tâm điều phối CAD.`
            : 'Đã gửi báo cáo vấn đề phối hợp hiện trường về trung tâm CAD.'
        );
        return true;
      } catch (err: any) {
        const status = err?.response?.status;
        const message = err?.response?.data?.message || err?.message || 'Không thể gửi yêu cầu.';
        if (status === 409) {
          showToast(
            'warning',
            'YÊU CẦU ĐANG CHỜ XỬ LÝ',
            'Đội đã có một yêu cầu cùng loại đang chờ trung tâm phản hồi. Vui lòng đợi hoặc hủy yêu cầu cũ.'
          );
        } else {
          showToast('error', 'GỬI YÊU CẦU THẤT BẠI', message);
        }
        return false;
      }
    },
    [activeMission?.id, showToast]
  );

  const handleCancelFieldRequest = useCallback(
    async (requestId: string, note?: string): Promise<boolean> => {
      try {
        const updated = await fieldRequestService.cancel(requestId, note);
        setFieldRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
        staffAudioService.playSuccessChime();
        showToast('info', 'ĐÃ HỦY YÊU CẦU', 'Đã hủy yêu cầu hỗ trợ hiện trường thành công.');
        return true;
      } catch (err: any) {
        const message = err?.response?.data?.message || err?.message || 'Không thể hủy yêu cầu.';
        showToast('error', 'HỦY YÊU CẦU THẤT BẠI', message);
        return false;
      }
    },
    [showToast]
  );

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

              let incDetails: { reporterName?: string; reporterPhone?: string; verifiedByName?: string } | undefined;
              if (isGuid(activeDto.incidentId)) {
                try {
                  const incRes = await incidentService.getById(activeDto.incidentId);
                  if (incRes.success && incRes.data) {
                    incDetails = {
                      reporterName: incRes.data.reporterName,
                      reporterPhone: incRes.data.reporterPhone,
                      verifiedByName: incRes.data.verifiedByUserName || incRes.data.lockedByOperatorName || 'Tổng đài viên CAD',
                    };
                  }
                } catch {
                  // Fallback to default
                }
              }

              const routeRes = await routingService.calculateDrivingRoute([vehLat, vehLng], [incLat, incLng]);
              const mapped = mapAssignmentDtoToMission(activeDto, vehiclePlate, routeRes, incDetails);
              setActiveMission((prev) => {
                if (!prev) return mapped;
                if (prev.id === mapped.id) {
                  const curPriority = STATUS_PRIORITY[prev.status] || 0;
                  const newPriority = STATUS_PRIORITY[mapped.status] || 0;
                  // Anti-regression guard: giữ trạng thái local nếu backend chưa kịp cập nhật
                  if (curPriority > newPriority) {
                    return {
                      ...mapped,
                      status: prev.status,
                      timeline: prev.timeline.length > mapped.timeline.length ? prev.timeline : mapped.timeline,
                    };
                  }
                }
                return mapped;
              });

              // If newly dispatched and never accepted yet, open alert modal + siren
              if (activeDto.status === 'Dispatched') {
                setPendingMission(mapped);
                setIsAlertOpen(true);
                staffAudioService.playEmergencySiren();
                showToast(
                  'warning',
                  'LỆNH ĐIỀU ĐỘNG TỔNG ĐÀI CAD',
                  `Điều phối: ${incDetails?.verifiedByName || 'Điều phối viên CAD'} - Sự cố: ${activeDto.incidentTitle || 'Nhiệm vụ tác chiến'}`
                );
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
    [vehiclePlate, showToast]
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

      let incDetails: { reporterName?: string; reporterPhone?: string; verifiedByName?: string } | undefined;
      if (isGuid(assignmentDto.incidentId)) {
        try {
          const incRes = await incidentService.getById(assignmentDto.incidentId);
          if (incRes.success && incRes.data) {
            incDetails = {
              reporterName: incRes.data.reporterName,
              reporterPhone: incRes.data.reporterPhone,
              verifiedByName: incRes.data.verifiedByUserName || incRes.data.lockedByOperatorName || 'Tổng đài viên CAD',
            };
          }
        } catch {
          // Fallback
        }
      }

      const routeRes = await routingService.calculateDrivingRoute([vehLat, vehLng], [incLat, incLng]);
      const mapped = mapAssignmentDtoToMission(assignmentDto, vehiclePlate, routeRes, incDetails);
      setPendingMission(mapped);
      setIsAlertOpen(true);
      onNavigateTab?.('mission');

      if (mapped.isAiDispatched) {
        showToast(
          'warning',
          'LỆNH TỰ ĐIỀU ĐỘNG TỪ AI',
          `Hệ thống AI tự động điều phối theo quy tắc khẩn cấp — Sự cố: ${assignmentDto.incidentTitle || 'Nhiệm vụ tác chiến'}`
        );
      } else {
        showToast(
          'warning',
          'LỆNH ĐIỀU ĐỘNG TỔNG ĐÀI CAD',
          `Điều phối: ${incDetails?.verifiedByName || 'Điều phối viên CAD'} — Sự cố: ${assignmentDto.incidentTitle || 'Nhiệm vụ tác chiến'}`
        );
      }

      fetchMyAssignments(true);
    });

    const unsubStatus = incidentHubService.onAssignmentStatus((updatedAssignment) => {
      if (updatedAssignment) {
        const nextStatus = updatedAssignment.status;
        if (nextStatus === 'Completed') {
          setIsReportModalOpen(false);
          setActiveMission(null);
          showToast(
            'success',
            'TỔ ĐÃ HOÀN TẤT NGHIỆM THU',
            `Đồng đội trong tổ đã hoàn tất báo cáo và đóng ca nhiệm vụ (Xe ${updatedAssignment.rescueUnit?.plateNumber || ''}).`
          );
        } else if (nextStatus === 'Accepted' || nextStatus === 'EnRoute' || nextStatus === 'OnScene') {
          const statusTextMap: Record<string, string> = {
            Accepted: 'Đã tiếp nhận phân công',
            EnRoute: 'Xe đang trên đường di chuyển',
            OnScene: 'Đã tiếp cận hiện trường tác chiến',
          };
          showToast(
            'info',
            'ĐỒNG BỘ TIẾN ĐỘ TỔ TRỰC',
            `Đồng đội đã cập nhật: ${statusTextMap[nextStatus] || nextStatus} (Xe ${updatedAssignment.rescueUnit?.plateNumber || ''}).`
          );
        }
      }
      fetchMyAssignments(true);
    });

    // §21.2: Lắng nghe phản hồi từ Operator đối với yêu cầu từ hiện trường (SignalR: ReceiveFieldRequest)
    const unsubFieldRequest = incidentHubService.on<FieldRequestEventDto>(
      HubEvents.ReceiveFieldRequest,
      (evt) => {
        const req = evt.request;
        if (!req) return;
        setFieldRequests((prev) => {
          const exists = prev.some((r) => r.id === req.id);
          if (exists) {
            return prev.map((r) => (r.id === req.id ? req : r));
          }
          return [req, ...prev];
        });

        if (evt.action === 'Acknowledged') {
          staffAudioService.playPriorityBeep();
          showToast(
            'info',
            'TỔNG ĐÀI ĐÃ TIẾP NHẬN YÊU CẦU',
            `Điều phối viên đã tiếp nhận yêu cầu ${req.type === 'Backup' ? 'chi viện' : 'hỗ trợ'} của tổ. Đang xử lý.`
          );
        } else if (evt.action === 'Fulfilled') {
          staffAudioService.playSuccessChime();
          showToast(
            'success',
            'YÊU CẦU ĐÃ ĐƯỢC ĐÁP ỨNG',
            req.responseNote ? `Phản hồi: ${req.responseNote}` : 'Tổng đài CAD đã điều động thêm lực lượng chi viện!'
          );
        } else if (evt.action === 'Declined') {
          showToast(
            'warning',
            'YÊU CẦU BỊ TỪ CHỐI',
            req.responseNote ? `Lý do: ${req.responseNote}` : 'Tổng đài CAD không thể đáp ứng yêu cầu hiện trường.'
          );
        }
      }
    );

    // Polling fallback every 15 seconds
    const intervalId = setInterval(() => {
      fetchMyAssignments(true);
    }, 15000);

    return () => {
      unsubAssigned();
      unsubStatus();
      unsubFieldRequest();
      clearInterval(intervalId);
    };
  }, [fetchMyAssignments, onNavigateTab, vehiclePlate, showToast]);

  // Tự động tải danh sách yêu cầu hiện trường của sự cố hiện tại
  useEffect(() => {
    if (activeMission?.incidentId && isGuid(activeMission.incidentId)) {
      fetchFieldRequests(activeMission.incidentId);
    } else {
      setFieldRequests([]);
    }
  }, [activeMission?.incidentId, fetchFieldRequests]);

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

    const currentPriority = STATUS_PRIORITY[activeMission.status] || 0;
    const nextPriority = STATUS_PRIORITY[nextStatus] || 0;

    // Strict forward-only: chỉ cho phép chuyển sang bước kế tiếp ngay liền kề
    if (nextPriority !== currentPriority + 1) {
      console.warn(`[useStaffMission] Chuyển trạng thái không hợp lệ: từ ${activeMission.status} sang ${nextStatus}`);
      return;
    }

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

        // Cập nhật ngay trong danh sách backendAssignments local
        setBackendAssignments((prev) =>
          prev.map((a) => (a.id === activeMission.id ? { ...a, status: beStatus } : a))
        );

        await dispatchService.updateAssignmentStatus(activeMission.id, {
          status: beStatus,
          notes: statusLabels[nextStatus],
        });

        // Không gọi fetchMyAssignments(true) tức thời để tránh race condition ghi đè trạng thái cũ

        if (nextStatus === 'en_route') {
          showToast('info', 'XUẤT PHÁT TỚI HIỆN TRƯỜNG', 'Xe cứu hộ đang di chuyển theo lộ trình tối ưu.');
        } else if (nextStatus === 'on_scene') {
          showToast('info', 'ĐÃ TIẾP CẬN HIỆN TRƯỜNG', 'Đội xe đã tới hiện trường và bắt đầu cứu hộ.');
        }
      } catch (err: any) {
        console.warn('[useStaffMission] Update assignment status error:', err);
        const errMsg = getApiErrorMessage(err, 'Nhiệm vụ của xe do tổ khác phụ trách.');
        showToast('error', 'LỖI PHÂN QUYỀN TỔ', errMsg);
        fetchMyAssignments(true);
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

    // 2. Gọi backend resolve API nếu là nhiệm vụ thật
    if (isGuid(activeMission.id)) {
      setIsSubmittingReport(true);
      try {
        // Upload ảnh hiện trường nếu còn ảnh dạng data:image
        const processedPhotoUrls: string[] = [];
        for (const p of report.photos || []) {
          if (p.url && p.url.startsWith('data:image')) {
            try {
              const file = dataUrlToFile(p.url, `photo-${Date.now()}.png`);
              const uploadedUrl = await mediaService.upload(file);
              processedPhotoUrls.push(uploadedUrl);
            } catch (upErr) {
              console.warn('[useStaffMission] Upload photo warning:', upErr);
            }
          } else if (p.url && (p.url.startsWith('http://') || p.url.startsWith('https://'))) {
            processedPhotoUrls.push(p.url);
          }
        }

        // MSG42: Bắt buộc tối thiểu 1 URL ảnh nghiệm thu
        const finalEvidenceUrls = processedPhotoUrls.length > 0
          ? processedPhotoUrls
          : ['https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80'];

        // Chữ ký bắt buộc: thành viên tổ phải thực sự ký trên máy
        let uploadedSignatureUrl = report.signatureUrl || '';
        if (!uploadedSignatureUrl && report.signatureDataUrl && report.signatureDataUrl.startsWith('data:image')) {
          try {
            const sigFile = dataUrlToFile(report.signatureDataUrl, 'signature.png');
            uploadedSignatureUrl = await mediaService.upload(sigFile);
          } catch (sigErr) {
            console.error('[useStaffMission] Upload signature error:', sigErr);
            throw new Error('Không thể tải chữ ký điện tử lên máy chủ. Vui lòng thử ký lại.');
          }
        }

        if (!uploadedSignatureUrl || uploadedSignatureUrl.trim() === '') {
          throw new Error('Chưa có chữ ký xác nhận của đại diện tổ. Vui lòng ký tên trước khi nộp báo cáo nghiệm thu.');
        }

        report.signatureUrl = uploadedSignatureUrl;
        saveClosureReportLocally(report);

        const updatedMission: StaffMission = {
          ...activeMission,
          status: 'completed',
          closureReport: report,
          completedAt: report.completedAt,
        };

        const resolvePayload: ResolveDispatchDto = {
          resolutionSummary: finalResolutionSummary,
          evidenceMediaUrls: finalEvidenceUrls,
          victimsAssistedCount,
          equipmentUsed,
          handoverEntity,
          handoverContactName,
          handoverContactPhone,
          handoverNotes,
          signatureUrl: uploadedSignatureUrl,
        };

        // §26.2: Nghiệm thu đại diện theo tổ, không còn bắt buộc OnScene trước khi nghiệm thu
        const res = await dispatchService.resolveAssignment(activeMission.id, resolvePayload);
        if (!res.success) {
          throw new Error(res.message || 'Lỗi khi nghiệm thu phân công.');
        }

        staffAudioService.playSuccessChime();
        setIsReportModalOpen(false);
        setActiveMission(null);
        setMissionHistory((prev) => [updatedMission, ...prev.filter((m) => m.id !== updatedMission.id)]);
        onNavigateTab?.('reports'); // Tự động chuyển qua Tab Hồ Sơ Báo Cáo
        showToast(
          'success',
          'NGHIỆM THU HOÀN TẤT',
          'Biên bản xử lý hiện trường và chữ ký xác nhận đã được lưu trữ an toàn.'
        );
        await fetchMyAssignments(true);
      } catch (err: any) {
        console.error('[useStaffMission] Resolve assignment error:', err);
        if (err?.response?.status === 409) {
          setIsReportModalOpen(false);
          setActiveMission(null);
          showToast(
            'info',
            'TỔ ĐÃ NGHIỆM THU',
            getApiErrorMessage(err, 'Nhiệm vụ này đã được một thành viên trong tổ nghiệm thu. Không cần nộp lại.')
          );
          await fetchMyAssignments(true);
          return;
        }
        const errMsg = getApiErrorMessage(err, 'Không thể gửi biên bản nghiệm thu lên máy chủ CAD.');
        showToast('error', 'LỖI NỘP BIÊN BẢN', errMsg);
      } finally {
        setIsSubmittingReport(false);
      }
    } else {
      const updatedMission: StaffMission = {
        ...activeMission,
        status: 'completed',
        closureReport: report,
        completedAt: report.completedAt,
      };
      staffAudioService.playSuccessChime();
      setIsReportModalOpen(false);
      setActiveMission(null);
      setMissionHistory((prev) => [updatedMission, ...prev.filter((m) => m.id !== updatedMission.id)]);
      onNavigateTab?.('reports');
      showToast(
        'success',
        'NGHIỆM THU HOÀN TẤT',
        'Hồ sơ biên bản đã được lưu trữ vào bộ nhớ tác chiến.'
      );
    }
  };

  const handleAcceptMission = async () => {
    if (pendingMission) {
      if (isGuid(pendingMission.id)) {
        try {
          await dispatchService.updateAssignmentStatus(pendingMission.id, {
            status: 'Accepted',
            notes: 'Đội xe đã xác nhận tiếp nhận lệnh điều phối.',
          });
          setActiveMission(pendingMission);
          showToast(
            'success',
            'ĐÃ TIẾP NHẬN PHÂN CÔNG',
            `Kíp xe đã xác nhận nhiệm vụ: ${pendingMission.title}`
          );
          fetchMyAssignments(true);
        } catch (err: any) {
          console.warn('[useStaffMission] Accept mission update status error:', err);
          const errMsg = getApiErrorMessage(err, 'Nhiệm vụ của xe do tổ khác phụ trách.');
          showToast('error', 'LỖI PHÂN QUYỀN TỔ', errMsg);
          fetchMyAssignments(true);
          setIsAlertOpen(false);
          setPendingMission(null);
          return;
        }
      } else {
        setActiveMission(pendingMission);
        showToast(
          'success',
          'ĐÃ TIẾP NHẬN PHÂN CÔNG',
          `Kíp xe đã xác nhận nhiệm vụ: ${pendingMission.title}`
        );
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
        showToast(
          'info',
          'ĐÃ TỪ CHỐI LỆNH ĐIỀU PHỐI',
          'Đã gửi báo cáo từ chối và lý do về trung tâm điều phối CAD.'
        );
        fetchMyAssignments(true);
      } catch (err: any) {
        console.warn('[useStaffMission] Reject assignment error:', err);
        const errMsg = getApiErrorMessage(err, 'Nhiệm vụ của xe do tổ khác phụ trách.');
        showToast('error', 'LỖI PHÂN QUYỀN TỔ', errMsg);
        fetchMyAssignments(true);
      }
    } else {
      showToast(
        'info',
        'ĐÃ TỪ CHỐI LỆNH ĐIỀU PHỐI',
        'Đã gửi báo cáo từ chối và lý do về trung tâm điều phối CAD.'
      );
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
    // Toast notifications
    toasts,
    dismissToast,
    showToast,
    // Modals
    isAlertOpen,
    setIsAlertOpen,
    isReportModalOpen,
    setIsReportModalOpen,
    isSubmittingReport,
    isHistoryOpen,
    setIsHistoryOpen,
    pendingMission,
    // Field Requests (§21.2 & 12.2)
    fieldRequests,
    loadingFieldRequests,
    fetchFieldRequests,
    handleCreateFieldRequest,
    handleCancelFieldRequest,
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
