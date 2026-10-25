# Kế hoạch backend: Vận hành theo trạm (Station-Scoped Operations)

> **Trạng thái:** Ready for review

## 1. Context (Bối cảnh)

Người dùng mô tả mô hình vận hành thực tế: một khu vực (VD: KCNC) có nhiều trạm, mỗi trạm 1 Operator, Operator chỉ quản lý trạm mình. Staff biết ai là Operator của mình và xem live map khi được phân công. Citizen chỉ xem live map sự cố mình báo. SOS ngoài khu vực phải báo cho Operator. Mọi thông báo khẩn cấp phải realtime. Live map phải vẽ theo đường bộ thật.

### Tồn tại ở Backend hiện tại (chưa khớp mô hình)

- Mọi Operator thấy và xử lý mọi sự cố; Operator tạo/sửa staff và tổ ở bất kỳ trạm nào.
- `headOperatorId` mới chỉ để hiển thị, chưa ràng buộc 1–1.
- `ReceiveJobAssigned` đang gửi cho toàn bộ RescueStaff mọi trạm (`SignalRRealtimeNotifier.cs:68`, nhóm `RescuersGroup`), tức là rò rỉ lệnh điều phối.
- RescueStaff xem được sự cố nếu trạm mình từng có xe tham gia, kể cả lượt đã xong hoặc bị từ chối (`IncidentService.CanAccessIncidentAsync:747`).
- Chưa có khái niệm khu vực phục vụ.
- Chỉ đường: `DispatchService.GenerateRouteTrajectoryAsync:1012` gọi OSRM demo công cộng (timeout 3s). Khi lỗi thì vẽ đường cong giả (đường thẳng cộng sin). Quãng đường và ETA tính theo chim bay (`CalculateDistanceKm`, `EstimateEtaMinutes` 35 km/h). Gợi ý xe cũng xếp theo chim bay.
- Xe đổi trạng thái (CoolDown hết hạn, Admin hoặc Operator đổi) không được đẩy realtime.

### Quyết định đã chốt

- **Phân quyền sự cố:** Sự cố tự gán cho trạm phụ trách theo vị trí: chỉ Operator trạm đó xử lý, Admin thấy tất cả. Operator vẫn điều được xe trạm khác (giữ Load-Aware của SRS); Operator trạm kia nhận thông báo "xe được điều hỗ trợ".
- **Quản lý xe:** Admin quản lý toàn bộ; Operator thêm, sửa, đổi trạng thái xe trạm mình. Xóa xe và chuyển xe sang trạm khác chỉ Admin.
- **Khu vực phục vụ:** Tâm + bán kính, Admin cấu hình. SOS ngoài vùng vẫn nhận (không từ chối người gặp nạn), gắn cờ và báo realtime.
- **Chỉ đường:** OSRM, URL cấu hình được (xem mục G). Tự host OSRM bằng Docker là bước thay URL, không phải sửa code.
- **Giao tiếp FE/Mobile:** Không sửa FE/Mobile. Việc phía client ghi nối tiếp cuối `emergency-dispatch-backend/FE_MOBILE_HANDOFF.md`. Không commit.
- **Lệch SRS cần ghi lại:** FR-OP-02 mô tả hàng đợi chung cho mọi Operator và dùng khóa mềm để tránh tranh chấp. Mô hình mới chia hàng đợi theo trạm (khóa mềm vẫn giữ, dùng khi Admin và Operator cùng mở một sự cố). Thêm dòng này vào `BACKEND_GAPS_SRS.md` ở mục "SRS cần cập nhật".

## 2. Chi tiết giải pháp kỹ thuật

### A. Ràng buộc 1 Operator ↔ 1 trạm

- `Station.HeadOperatorId`: thêm filtered unique index (một Operator chỉ làm trưởng 1 trạm). `StationService.ResolveHeadOperatorAsync` báo 409 nếu Operator đó đã thuộc trạm khác.
- Gán trưởng trạm thì đồng bộ `operator.StationId = station.Id`. Đổi trưởng trạm thì trưởng cũ thành `StationId = null`. Gọi `IUserSessionInvalidator` để buộc lấy token mới (có claim `StationId` mới).
- `UserService`: Operator không đổi được `StationId` của Operator khác. Admin đổi trạm của một Operator thì cập nhật `HeadOperatorId` tương ứng.
- `ICurrentUserContext` thêm `StationId` (đọc từ claim). Thêm helper `OperatorScope` (Application) với hai hàm: `IsAdmin`, `RequireOwnStation(stationId)`. Operator chưa được gán trạm thì trả 403 "Bạn chưa được Admin phân công trạm".

### B. Phạm vi của Operator

| Chức năng | Admin | Operator |
|---|---|---|
| Trạm: xem nhân sự, tổ, cấu hình | Mọi trạm | Chỉ trạm mình. Trạm khác chỉ thấy thông tin công khai (dùng lại `StationAccess.CanViewStation`, mở rộng cho Operator theo claim `StationId`) |
| Tạo/sửa tài khoản | Mọi role | Chỉ RescueStaff, và bắt buộc thuộc trạm mình (bỏ qua `stationId` client gửi) |
| Thêm staff vào trạm/tổ (`assign-station-team`, `/stations/{id}/teams`) | Mọi trạm | Chỉ trạm mình |
| Xe | Toàn bộ, kể cả xóa và chuyển trạm | Thêm, sửa, đổi trạng thái xe trạm mình. Live map vẫn thấy vị trí và trạng thái xe trạm khác (chỉ đọc) để điều hỗ trợ |
| `GET /api/users` | Toàn bộ | Chỉ staff của trạm mình |

**Các file chính liên quan:** `UserService.cs`, `StationTeamService.cs`, `RescueUnitService.cs`, `UsersController.cs`, `StationsController.cs`, `RescueUnitsController.cs`, `API/Controllers/StationAccess.cs`.

### C. Phân sự cố theo trạm (Incident ownership)

- Incident thêm cột `ResponsibleStationId` (FK, có index), `IsOutOfServiceArea` (bool), `DistanceOutsideAreaKm` (double?).
- Khi tạo SOS (`IncidentService.CreateIncidentAsync`), service mới `StationAssignment` (thuần, test được) chọn trạm phụ trách như sau:
  - Trạm đang hoạt động có bán kính phủ chứa vị trí, gần nhất.
  - Nếu không có: trạm đang hoạt động gần nhất.
  - Trạm không có Operator thì sự cố hiện cho Admin, kèm cờ "Trạm chưa có Operator".
- Lọc theo trạm ở repository (`IncidentRepository`: queue, list, detail) và kiểm tra ở service cho các thao tác lock, verify, cancel, reveal-phone, block-reporter, audit-trail, assign, recommend:
  - Operator chỉ thao tác sự cố có `ResponsibleStationId` == trạm mình.
  - Admin thao tác mọi sự cố.
- Chuyển trạm phụ trách: `POST /api/incidents/{id}/transfer { stationId, reason }`, dành cho Operator đang phụ trách hoặc Admin. Dùng cho sự cố sát ranh giới. Thao tác này ghi vào `IncidentAuditTrail` và gửi thông báo realtime cho Operator trạm nhận.
- Điều xe xuyên trạm: recommend vẫn trả xe mọi trạm (Load-Aware, mở rộng bán kính). Khi assign xe của trạm khác:
  - Thông báo `SupportDispatched` tới Operator trạm có xe.
  - Staff trạm đó nhận lệnh như bình thường.
- Leo thang: cấp 1 báo Operator trạm phụ trách và Admin. Quá gấp đôi ngưỡng mà vẫn chưa có đơn vị nhận thì báo mọi Operator (đúng BR-17 cấp 2, hiện còn nằm trong gaps).

### D. Staff

- `GET /api/users/my-team` thêm `stationOperator { id, fullName, phoneNumber, avatarUrl }` (trưởng trạm).
- Live map khi được phân công: sửa `CanAccessIncidentAsync` / `CanSeeFullPhoneAsync`. RescueStaff chỉ xem sự cố khi xe của trạm mình có lượt phân công đang hoạt động (`IsActive`) hoặc vừa hoàn tất (≤ 30 phút, để nộp báo cáo). Áp dụng cho `GET tracking/incident/{id}`, `SubscribeIncident` (cả 2 hub) và chi tiết sự cố.
- Tracking trả về: vị trí sự cố, tuyến đường bộ của xe mình, và các xe khác cùng sự cố (dùng lại `CitizenTrackingResponseDto.Units`).
- Sửa rò rỉ: `ReceiveJobAssigned` chỉ gửi tới `StationGroup(stationId)` của xe được giao, bỏ gửi `RescuersGroup` (`SignalRRealtimeNotifier.cs:68`).

### E. Citizen

- Đã đúng: chỉ xem tracking sự cố mình báo (`CanAccessIncidentAsync`, Citizen). Giữ nguyên. Kiểm tra lại sau khi đổi mục D.

### F. Khu vực phục vụ (tâm + bán kính)

Settings key mới `serviceArea: { enabled, name, centerLat, centerLng, radiusKm }`. API `GET/PUT /api/settings/service-area`: Admin sửa, mọi người đã đăng nhập xem được (Citizen app có thể cảnh báo trước). Dùng lại `SystemSettingsService` (`LoadAsync` / `UpsertAsync`) và có ghi nhật ký quản trị.

SOS: tính khoảng cách tới tâm. Ngoài bán kính thì:

- `IsOutOfServiceArea = true`, `DistanceOutsideAreaKm`.
- Vẫn tiếp nhận.
- Ghi audit.

Realtime `ReceiveOutOfAreaAlert` cùng thông báo HighPriority tới Operator trạm gần nhất và Admin.

`IncidentResponseDto` có thêm 2 trường mới.

Tạo hoặc sửa trạm nằm ngoài khu vực thì chỉ cảnh báo (`warnings` trong response), không chặn.

### G. Chỉ đường đúng đường bộ (OSRM)

**Giải thích cho người dùng:** Backend hiện đã gọi OSRM qua HTTP API chuẩn (`/route/v1/driving/...`). OSRM tự host bằng Docker có cùng API. Vì vậy chỉ cần đổi URL trong `appsettings.json` (`Routing:OsrmBaseUrl`, ví dụ `http://localhost:5001`) là backend dùng server riêng. Server riêng ổn định hơn: không timeout, không giới hạn lượt gọi.

#### Cách dựng OSRM (ghi vào README)

1. Tải `vietnam-latest.osm.pbf` từ Geofabrik (~250 MB).
2. Chạy `osrm-extract -p /opt/car.lua`, `osrm-partition`, `osrm-customize` bằng image `osrm/osrm-backend`.
3. Chạy `osrm-routed --algorithm mld`, mở cổng 5001.

#### Cập nhật code backend

`IRoutingService` (interface ở Application, cài đặt `OsrmRoutingService` ở Infrastructure) với 2 hàm:

- `GetRouteAsync(from, to)`: trả `{ points, distanceKm, durationMinutes, isApproximate }`.
- `GetDurationsAsync(origins[], destination)`: gọi OSRM `/table`.

Dùng `IHttpClientFactory` client có tên `Routing` (timeout lấy từ cấu hình, mặc định 5s). Cache tuyến theo cặp tọa độ làm tròn 4 chữ số trong 60 giây (`IMemoryCache`).

#### Thay thế trong DispatchService

- Bỏ `GenerateRouteTrajectoryAsync` và bỏ đường cong giả. OSRM lỗi thì trả đường thẳng 2 điểm, `isApproximateRoute = true` để FE vẽ nét đứt.
- ETA và `DistanceKm` trong tracking và assign lấy từ OSRM (duration + 2 phút chuẩn bị xuất xe). Fallback dùng công thức cũ.
- Gợi ý xe: lọc ứng viên bằng chim bay như hiện tại. Với tối đa 25 xe gần nhất, gọi `/table` để lấy thời gian đường bộ thật. Thành phần D/R trong cost Load-Aware dùng quãng đường đường bộ. Response thêm `roadDistanceKm`, `roadDurationMinutes`, `isApproximate`.

**Cấu hình `appsettings.json`:** `Routing:OsrmBaseUrl` (mặc định giữ server demo để không hỏng khi chưa dựng Docker), `Routing:TimeoutSeconds`.

### H. Realtime cho mọi thông báo / khẩn cấp

Chuẩn hóa nhóm SignalR trong `IncidentHub.OnConnectedAsync`:

- `operators:station:{id}` cho Operator, theo claim `StationId`.
- `AdminsGroup`.
- `StationGroup` cho staff.
- `OperatorsGroup` toàn cục chỉ dùng cho leo thang cấp 2.

**Danh sách sự kiện, người nhận và trạng thái hiện tại:**

| Sự kiện | Người nhận | Hiện tại |
|---|---|---|
| `ReceiveNewIncident`, `ReceiveIncidentUpdate`, `ReceiveIncidentStatus` | Operator trạm phụ trách + Admin (+ nhóm incident) | Gửi mọi Operator → sửa |
| `ReceiveJobAssigned` | Staff trạm có xe + Operator trạm đó | Gửi mọi staff → sửa |
| `ReceiveAssignmentStatus` | Operator phụ trách, Operator trạm có xe, nhóm incident | Một phần → bổ sung |
| `ReceiveEscalationAlert` | Cấp 1: trạm + Admin; cấp 2: mọi Operator | Mọi Operator → sửa |
| `ReceiveOutOfAreaAlert` | Mới | — |
| `ReceiveSupportDispatched` | Mới: Operator trạm có xe được điều hỗ trợ | — |
| `ReceiveIncidentTransferred` | Mới: Operator trạm nhận | — |
| `ReceiveRescueUnitStatus` | Mới: Operator, Admin, staff trạm. Phát khi xe đổi trạng thái (assign, resolve, CoolDown hết hạn trong `VehicleCoolDownWorker`, đổi tay) | Chưa có |
| `ReceiveRescueUnitLocation` | Operator, Admin, nhóm incident | Đã có |
| `ReceiveNotification`, `ForceLogout` | Theo người dùng | Đã có |

\* Mọi thông báo khẩn cấp đều đi qua cả 3 kênh: `NotificationService` (lưu DB), SignalR và FCM HighPriority.

## 3. Migration, Tài liệu & Kiểm thử

### I. Migration

Migration name: **`Station_Scoped_Operations`**, chỉ thêm:

- `Incidents.ResponsibleStationId`, `IsOutOfServiceArea`, `DistanceOutsideAreaKm`.
- Filtered unique index `Stations.HeadOperatorId`.

**Data migration:**

- Gán `ResponsibleStationId` cho sự cố đang mở theo trạm gần nhất.
- Đồng bộ `Users.StationId` cho các Operator đang là trưởng trạm.

\* Đọc kỹ file sinh ra rồi mới `database update`.

### J. Tài liệu

- **`API_DOCUMENTATION.md`:** thêm mục 9.
- **`FE_MOBILE_HANDOFF.md`:** ghi nối tiếp mục 10 ở cuối file:
  - Hàng đợi theo trạm, nút "Chuyển trạm".
  - Badge "Ngoài phạm vi", "Xe hỗ trợ".
  - Các sự kiện realtime mới.
  - Màn hình staff "Operator của tôi".
  - Live map của staff.
  - Vẽ nét đứt khi `isApproximateRoute`.
  - Trang Admin cấu hình khu vực.
- **`BACKEND_GAPS_SRS.md`:** thêm giai đoạn 5, đánh dấu BR-17 cấp 2, ghi chú lệch FR-OP-02.
- **`README.md`:** hướng dẫn Docker OSRM.

### K. Kiểm tra (Testing / QA)

- **`dotnet build`:** 0 lỗi, 0 cảnh báo (build ra thư mục tạm nếu backend đang chạy).
- **Logic thuần trong scratchpad:** chọn trạm phụ trách, kiểm tra trong/ngoài vùng, ngưỡng leo thang cấp 2.
- **E2E bằng API thật** (script Python giống `e2e_admin.py`), dữ liệu tạm và dọn lại sau khi chạy:
  - Admin gán Operator A → trạm 1. Gán A tiếp cho trạm 2 → 409. Token cũ của A bị 401, refresh → claim trạm mới.
  - Operator A tạo staff → staff tự thuộc trạm 1. A sửa staff trạm 2 → 403. A sửa xe trạm 2 → 403, xe trạm 1 → 200.
  - Citizen SOS gần trạm 1 → `responsibleStationId` = trạm 1. Operator B (trạm 2) gọi queue → không thấy; verify → 403. Admin thấy.
  - A điều xe trạm 2 → B nhận `ReceiveSupportDispatched` (client SignalR Python `signalrcore`, hoặc kiểm tra bảng Notification). Chỉ staff trạm 2 nhận `ReceiveJobAssigned`.
  - Staff trạm 2 gọi tracking → 200, có tuyến đường. Staff trạm 3 → 403. Sau khi hoàn tất 30 phút → 403.
  - SOS ngoài bán kính khu vực → 200, `isOutOfServiceArea = true`, có thông báo HighPriority.
  - `my-team` của staff có `stationOperator`.
  - Routing: OSRM tắt hoặc URL sai → tracking trả `isApproximateRoute = true`, không còn đường cong giả. OSRM bật → tuyến nhiều điểm, ETA khác ETA chim bay.

**Regression test:** Chạy lại `e2e_admin.py` (37 bài) và `e2e_flow.py` để chắc không hồi quy.

## 4. Những gì đã làm

> Chuyển từ ảnh chụp ở cuối file gốc.

| Yêu cầu | Kết quả |
|---|---|
| 1 Operator – 1 trạm | Admin gán trưởng trạm thì Operator tự thuộc trạm đó. Gán một Operator cho trạm thứ hai bị chặn. Token cũ bị hủy ngay. |
| Operator chỉ quản lý trạm mình | Sự cố tự gán cho trạm gần nhất theo vị trí. Operator chỉ thấy và xử lý sự cố trạm mình; đụng sự cố trạm khác bị 403. Có thêm API chuyển sự cố sang trạm khác. |
| Operator thêm staff, tổ, quản lý xe | Staff do Operator tạo luôn thuộc trạm của Operator. Tổ và xe chỉ của trạm mình. Chuyển xe sang trạm khác và xóa xe chỉ Admin. |
| Điều xe trạm khác | Vẫn được, đúng Load-Aware của SRS. Xe được đánh dấu "hỗ trợ"; Operator trạm có xe nhận thông báo realtime. |
| Staff biết Operator của mình | `my-team` có thêm `stationOperator`. |
| Staff xem live map khi được phân công | Chỉ xem được khi xe trạm mình đang làm nhiệm vụ đó (hoặc vừa xong 30 phút). |
| Citizen chỉ xem sự cố mình | Giữ như cũ, đã kiểm tra lại. |
| Giới hạn khu vực | Admin cấu hình tâm + bán kính. SOS ngoài vùng **vẫn được nhận** (không bỏ rơi người gặp nạn), nhưng gắn cờ và báo realtime cho Operator và Admin. |
| Thông báo realtime | Sự kiện được gửi đúng người theo trạm. Thêm 4 sự kiện mới, trong đó có báo xe đổi trạng thái, kể cả khi hết CoolDown. Thêm leo thang cấp 2 (BR-17): quá gấp đôi ngưỡng thì báo mọi Operator. |
| Live map đúng đường bộ | Tuyến đường bộ thật từ OSRM. Lần test: 418 điểm, 20,7 km đường bộ (chim bay 16,4 km), ETA 24 phút. Gợi ý xe cũng xếp theo đường bộ. |
