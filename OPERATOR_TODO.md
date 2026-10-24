# Operator (Command Center): việc cần làm sau đợt cập nhật backend 22–23/10

> Cập nhật: 24/10/2026 · Đối chiếu backend commit `2c24148` với frontend nhánh `Feature/CommandCenterDashBoard`.
> Nguồn: backend `API_DOCUMENTATION.md` mục 8–11 và `FE_MOBILE_HANDOFF.md` mục 8–13.
> Phạm vi: **phân hệ Operator**. Việc của Admin, Staff, Citizen chỉ ghi tóm tắt ở mục 3.

Ký hiệu: 🔴 bắt buộc (không làm sẽ lỗi hoặc sai nghiệp vụ) · 🟡 nên làm · ⚪ dọn dẹp.

> **Trạng thái 25/10:**
> - **Đã làm:** F1–F12, F14–F30.
>   - F28: lọc `stationId` khi xe mới xuất hiện.
>   - F29: tab "Lịch sử xử lý" trong Drawer và nút "Lịch sử xử lý" trên Live Map.
> - **Không làm:** F13 (phải sửa `apiClient.ts` dùng chung), F31 (app chưa có chức năng đổi ngôn ngữ).
> - **F10:** tên trạm phụ trách hiện trong Drawer. Dòng hàng đợi chỉ hiện nhãn "Ngoài khu vực", vì Operator chỉ thấy sự cố của trạm mình nên hiện tên trạm ở đây là thừa.
> - **F13 (đọc header `X-Auth-Error` khi gặp 401) đã hoàn lại:** phải sửa `apiClient.ts`, mà file này dùng chung cho mọi role. Operator vẫn được đăng xuất kèm lý do qua `ForceLogout` (SignalR). F5 cũng giữ lại `Level4` / `Level5`, vì trang landing còn dùng.
> - **B4 đã kiểm tra:** `IncidentResponseDto.eventType` có ở cấp gốc của DTO.

---

## 1. Frontend: việc cần làm

### 1.1. 🔴 Xác minh sự cố (`IncidentDetailDrawer.tsx`, `types/incident.ts`, `incidentService.verify`)

| # | Việc | Ghi chú |
|---|---|---|
| F1 | **Chọn nhánh sự cố khi AI không xác định** | `eventType === 'None'` (AI lỗi hoặc SOS không ảnh) → bắt Operator chọn **Cháy nổ / Tai nạn**, gửi `confirmedEventType: "FireExplosion" \| "TrafficAccident"` trong body `verify`. Thiếu thì backend trả **400**. |
| F2 | **Không tự gán "Tai nạn"** khi chưa biết nhánh | `mapIncidentResponseToIncident` đang rơi về `'accident'`. Thứ tự đúng: dùng `dto.eventType` (loại đã xác nhận); nếu là `None` thì suy từ tiêu đề SOS ("Hỏa hoạn…" là Cháy nổ, "Tai nạn…" là Tai nạn); không suy được thì hiện **"Chưa xác định"**. |
| F3 | **Phân biệt AI thất bại với độ tin cậy thấp** | Khi `aiClassification.isSuccess === false`: hiện banner "AI chưa phân tích được (lỗi hoặc quá thời gian chờ) — vui lòng đánh giá thủ công". Ẩn "% tin cậy" và "Cấp độ đề xuất" (hoặc ghi "—"). Không hiện `errorMessage` cho Operator. |
| F4 | Chỉ gắn nhãn **AI** cho nút cấp độ khi `isSuccess === true` và `severityScore` nằm trong 1–3 | Đã làm một phần: ca `Unclassified` đã không chọn sẵn cấp và bắt nhập lý do. |
| F5 | Bỏ `Level4` / `Level5` khỏi `BackendSeverityLevel` và `SEVERITY_FROM_BACKEND` | ⚪ Backend chỉ còn 4 giá trị: `Unclassified`, `Level1`, `Level2`, `Level3`. |

### 1.2. 🔴 Hủy sự cố (`incidentService.cancel`, Drawer, Live Map)

| # | Việc | Ghi chú |
|---|---|---|
| F6 | Gửi `reasonCode` khi hủy | Body: `{ reason, reasonCode: "FalseReport" \| "Duplicate" \| "TestReport" \| "Other" }`. Thêm ô chọn lý do vào form "Hủy ca báo khống" và nút hủy trên Live Map. |
| F7 | Thêm các trường hủy vào type `IncidentResponseDto` | `cancellationReason`, `cancelledAt`, `cancelledByUserId`, `cancelledByName`, `cancellationNote`. Hiện `AutoExpired` là "Tự hủy do quá hạn". |

### 1.3. 🔴 Vận hành theo trạm

| # | Việc | Ghi chú |
|---|---|---|
| F8 | **Xử lý 403 theo trạm** | Thao tác trên sự cố của trạm khác bị trả 403 "Sự cố này thuộc trạm khác phụ trách." → hiện đúng `message` (toast hoặc lỗi trong Drawer). |
| F9 | **Tài khoản chưa được gán trạm** | Backend trả 403 "Bạn chưa được Admin phân công trạm phụ trách." → hiện màn hình trống ở Hàng đợi / Live Map, kèm hướng dẫn liên hệ Admin, thay vì báo lỗi tải. |
| F10 | Hiện **trạm phụ trách** | Thêm `responsibleStationId`, `responsibleStationName`, `isOutOfServiceArea`, `distanceOutsideAreaKm` vào type. Hiện trên thẻ sự cố và trong Drawer. |
| F11 | **Nút "Chuyển trạm"** trong Drawer | `POST /api/incidents/{id}/transfer` với `{ stationId, reason ≥ 5 }`. Danh sách trạm lấy từ `GET /stations?activeOnly=true`, bỏ trạm hiện tại. Chuyển xong thì bỏ ca khỏi hàng đợi. |

### 1.4. 🔴 Phiên đăng nhập (`apiClient.ts`, `incidentHubService.ts`, `AuthContext`)

| # | Việc | Ghi chú |
|---|---|---|
| F12 | Nghe sự kiện **`ForceLogout`** `{ reason }` trên `/hubs/incidents` | Hiện `reason`, xóa token, dừng SignalR, chuyển về trang đăng nhập. |
| F13 | Đọc header **`X-Auth-Error`** khi gặp 401 | Dùng `decodeURIComponent`. Hiện đúng lý do ("Tài khoản đã bị khóa." …) thay cho thông báo chung. Đổi trạm / đổi role thì refresh token như cũ. |

### 1.5. 🟡 Tối ưu tải dữ liệu (`DispatchContext.tsx`, `incidentService.ts`, `dispatchService.ts`)

| # | Việc | Ghi chú |
|---|---|---|
| F14 | Lấy bảng điều phối bằng **1 request** | `getDispatchBoard()` đang gọi 4 trạng thái song song và tải lần lượt từng trang → đổi thành `GET /incidents?statuses=Verified,Dispatched,InProgress,Escalated&pageSize=200`. |
| F15 | Lấy mọi lượt điều phối đang chạy bằng **1 request** | Đang gọi `assignments/incident/{id}` cho từng sự cố → đổi thành `GET /dispatch/assignments/active`. Vẫn cần giữ lượt đã `Completed` / `Rejected` của sự cố đang mở (để hiện "đã báo cáo" và thông báo từ chối), xem cách kết hợp. |
| F16 | Thêm listener realtime mới | `ReceiveRescueUnitStatus` (cập nhật xe tại chỗ, `isDeleted` thì xóa xe), `ReceiveIncidentLock` (badge khóa), `ReceiveTeamChanged` (tải lại tổ), `ReceiveSettingsChanged` (tải lại cấu hình leo thang), `ReceiveNotificationRead` (đồng bộ chuông giữa các thiết bị). |
| F17 | Giảm poll | Sau F16: `POLL_MS` từ 20s → 60–120s. `REFRESH_MS` ở `useDispatchRoutes` có thể giữ hoặc tăng. |
| F18 | Leo thang 2 tầng | `ReceiveEscalationAlert` có thêm `tier`: `tier = 2` là "Cần trạm khác hỗ trợ", còi / banner mạnh hơn. |
| F19 | Cảnh báo **SOS ngoài khu vực** | `ReceiveOutOfAreaAlert` → còi + banner đỏ "SOS ngoài khu vực phục vụ". |
| F20 | Toast **xe trạm mình đi hỗ trợ** | `ReceiveSupportDispatched` → "Xe {plate} của trạm bạn được điều hỗ trợ sự cố {title}". |
| F21 | Sự cố bị **chuyển trạm** | `ReceiveIncidentTransferred` → trạm cũ bỏ ca khỏi hàng đợi; trạm mới tự nhận `ReceiveNewIncident`. |

### 1.6. 🟡 Điều phối & bản đồ (`DispatchRecommendPanel.tsx`, `DispatchIncidentList.tsx`, `useDispatchRoutes.ts`, `MapRouteLayer.tsx`)

| # | Việc | Ghi chú |
|---|---|---|
| F22 | Gợi ý tổ: hiện **badge "Xe hỗ trợ"** khi `isSupportUnit`, quãng đường **`roadDistanceKm`** (đường bộ) thay cho `distanceKm`, thêm chữ "ước lượng" khi `isApproximate` | Thêm các trường vào `RecommendedUnitResponseDto`. |
| F23 | **Giao thêm tổ cho Cấp 1–2** | Gửi `allowExtraUnits: true` + `notes ≥ 5` ký tự. Cấp 3 tối đa 5 xe. Cần ô nhập lý do khi đã đủ 1 tổ. |
| F24 | **Tuyến ước lượng vẽ nét đứt** | `units[].isApproximateRoute = true` (chỉ 2 điểm) → `line-dasharray`, kèm chú thích "Tuyến ước lượng". |
| F25 | Gỡ phần **tự vẽ đường từ trạm bằng Mapbox** | ⚪ Backend đã sửa tọa độ xe theo trạm và trả đường bộ thật (OSRM), nên `mapboxService.getDrivingRoute` và nhánh `!hasLiveGps` trong `useDispatchRoutes` có thể bỏ. Giữ lại việc đặt xe đậu dưới ghim trạm. |
| F26 | Vẽ **vòng khu vực phục vụ** lên Live Map | `GET /api/settings/service-area` (`enabled`, `centerLat/Lng`, `radiusKm`); vẽ lại khi nhận `ReceiveSettingsChanged` với `key = serviceArea`. |

### 1.7. 🟡 Đội xe (`VehiclesPage.tsx`, `DispatchContext.tsx`)

| # | Việc | Ghi chú |
|---|---|---|
| F27 | Khóa nút Bảo trì khi xe ở `Dispatched` / `OnScene` / `Returning` | Backend không có trạng thái `OnMission`. `CoolDown` là "Hồi sức". Lỗi nghiệp vụ giờ trả **400** kèm message thay cho 500 → hiện đúng message. |
| F28 | Có thể dùng `GET /rescue-units?stationId=&status=` | Tùy chọn, nếu muốn chỉ tải xe trạm mình. |

### 1.8. ⚪ Khác

| # | Việc |
|---|---|
| F29 | Hiện trường `cancellationReason` / người hủy trong lịch sử thao tác (`GET /incidents/{id}/audit-trail`), nếu làm tab "Lịch sử xử lý". |
| F30 | Đồng bộ tài liệu: chép `API_DOCUMENTATION.md` và `FE_MOBILE_HANDOFF.md` mới từ repo backend sang repo frontend (bản trong frontend đã cũ / không có). |
| F31 | Song ngữ: nếu app có đổi ngôn ngữ thì gửi `Accept-Language` và nối SignalR với `?culture=`. Hiện chưa cần. |

---

## 2. Backend: việc cần thay đổi / cần xác nhận

| # | Việc | Lý do |
|---|---|---|
| B1 | **Operator không lấy được danh sách nhân viên chưa có trạm** | `GET /api/users` lọc theo trạm của Operator (`FilterStationId`), nên chỉ trả nhân sự trạm mình. Nhưng `assign-station-team` lại cho Operator **kéo nhân viên chưa có trạm** về. Màn "Thêm nhân sự" của Station Teams không có ai để chọn. Đề xuất: cho Operator gọi `GET /api/users?role=RescueStaff&unassigned=true` (hoặc `stationId=null`). |
| B2 | **Dữ liệu tài khoản Operator mẫu** | `operator@emergencydispatch.com` vẫn trỏ tới trạm Q1 đã xóa nên không thấy sự cố nào → Admin gán lại trạm (hoặc làm Operator phụ trách FPT Station). |
| B3 | **Lượt điều phối test còn mở** | Xe `51A-115.01` vẫn `Accepted` cho "Emergency SOS Alarm" từ 22/10. Hủy sự cố đó qua `PUT /incidents/{id}/cancel` để thu hồi xe. |
| B4 | **Xác nhận `IncidentResponseDto.eventType`** | Tài liệu ghi `eventType` là loại đã xác nhận. Cần chắc trường này có ở cấp gốc của DTO (không chỉ trong `aiClassification`) và có giá trị cho ca chưa xác minh, để FE dùng cho F1/F2. |
| B5 | **Rà lại các mục cũ của `API_DOCUMENTATION.md`** | Mục 5.1, 5.3, 5.5, 5.8, 5.9, 9.1, 13 (từ đợt trước) mô tả khác code: `maxDistanceKm` mặc định 15, `assign` trả 1 object, `tracking` / `assignments/incident` công khai, body `resolve` thiếu trường bắt buộc, Operator tạo được mọi role… Các mục mới (8–11) đã đúng, nhưng các mục cũ chưa sửa theo. |
| B6 | **Giữ lại lượt đã kết thúc trong `assignments/active`?** | FE vẫn cần lượt `Completed` / `Rejected` của sự cố **đang mở** để hiện "đã nộp báo cáo" và thông báo đội từ chối. Hoặc thêm tham số `includeFinishedOfOpenIncidents`, hoặc FE sẽ gọi thêm `assignments/incident/{id}` cho riêng các ca có sự kiện từ chối / hoàn tất. |

---

## 3. Ngoài phạm vi Operator (tóm tắt để chuyển cho người phụ trách)

- **Admin:**
  - Form quy tắc leo thang bỏ `timeoutMinutes` / `expandRadiusPercent`.
  - Form trạm có ô **Operator phụ trách trạm** (`headOperatorId`).
  - **Nhật ký quản trị** thay mock bằng `GET /api/audit-trail/system`.
  - Trang **Báo cáo / Xuất CSV-PDF** (`/api/reports/incidents`).
  - Trang **Khu vực phục vụ**.
- **Staff (Web + Mobile):**
  - Thẻ "Điều phối viên phụ trách" (`my-team.stationOperator`).
  - Live map nhiệm vụ dùng `tracking/incident/{id}`.
  - Báo hoàn thành hiện trường qua `resolve` (≥ 1 ảnh, `victimsAssistedCount`).
  - Xử lý `ForceLogout` và tải lại `my-team` khi đổi trạm.
- **Citizen:**
  - Cảnh báo "ngoài khu vực phục vụ" trước khi gửi SOS (không chặn gửi).
  - Theo dõi xe bắt buộc đăng nhập.
- **Nghiên cứu (RQ2 / RQ3):** nút tải `GET /api/benchmark/incidents?format=Csv`.
