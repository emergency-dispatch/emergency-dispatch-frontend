# Real-time Emergency Response & Dispatch Management System

*(Hệ thống điều phối cứu hộ khẩn cấp thời gian thực ứng dụng AI phân loại mức độ nguy hiểm sự cố)*

## 0. Thông tin đề tài (theo Phiếu đăng ký Capstone)
| Tên tiếng Anh | AI-assisted emergency dispatch system with vision-language-based hazard classification and severity scoring |
| Tên tiếng Việt | Hệ thống điều phối cứu hộ khẩn cấp thời gian thực ứng dụng AI phân loại mức độ nguy hiểm sự cố |


## 1. Bối cảnh & phạm vi

**Bối cảnh triển khai:** Khu Công nghệ cao (HTP) / Khu Công nghiệp (IP) — mật độ nhà xưởng, kho bãi và hàng nghìn công nhân cao. Hiện tại việc báo sự cố chủ yếu qua điện thoại tới phòng an ninh hoặc bộ đàm, mô tả vị trí mơ hồ, điều phối theo kinh nghiệm cá nhân, không có dữ liệu tập trung để đánh giá thời gian phản ứng.

**Hai nhánh sự cố cốt lõi (có AI chấm cấp độ):**

- **Cháy nổ (`#Fire`):** cháy xưởng, chập điện, cháy kho, cháy xe…
- **Tai nạn (`#Accident`):** va chạm phương tiện vận chuyển nội bộ, tai nạn giao thông, tai nạn lao động.

**Tính năng phụ trợ:** báo cáo **ùn tắc giao thông nội khu (`#Traffic_Jam`)** — chỉ hiển thị cảnh báo trên bản đồ, **không chấm cấp độ nghiêm trọng**, dùng để hỗ trợ định tuyến cho xe cứu hộ.

**Ngoài phạm vi:** can thiệp phần cứng xe cứu hộ, điều khiển đèn tín hiệu giao thông đô thị, thanh toán/ví điện tử.

**4 vai trò người dùng (RBAC):** Citizen (Người dân/Công nhân), Operator (Điều phối viên), RescueStaff (Lực lượng cứu hộ/an ninh), Admin.

---

## 2. Tóm tắt thay đổi so với bản gốc

| Hạng mục | Bản gốc | Bản cập nhật |
| --- | --- | --- |
| Bối cảnh | Cứu hộ đô thị chung (tai nạn, hạ tầng, xe hỏng) | Khu Công nghiệp / Khu Công nghệ cao; tập trung Cháy nổ + Tai nạn; thêm báo ùn tắc phụ trợ |
| Cấp độ nghiêm trọng | Cấp 1 – 5 | Cấp 1 – 3 + **Cấp 0** (AI từ chối / nghi vấn, cần người duyệt) |
| Hazard tags | `#Fire`, `#Vehicle_Rollover`, `#Oil_Spill` | `#Fire`, `#Accident`, `#Traffic_Jam` (traffic không chấm cấp) |
| Chỉ số tin cậy | Plausibility Score | % tin cậy của AI + cơ chế Cấp 0 đẩy lên đầu hàng đợi |
| Mô hình AI | Qwen2.5-VL API | Pixtral-12B LoRA (vLLM/FastAPI, chạy cục bộ) + dự phòng Qwen2.5-VL API (xem mục G) |
| Real-time | Socket.io | WebSocket **SignalR Core** (WSS) |
| Tác vụ nền / leo thang | Node-cron; Cấp 4–5 quá 5 phút | Escalation Daemon quét mỗi 60s; Cấp 3 & Cấp 0 quá 5 phút (2.5 phút ban đêm 22h–6h) |
| Backend | Node.js (ngầm định) | ASP.NET Core Clean Architecture |
| Frontend | Mobile App + Web Client | React Native (iOS/Android) + ReactJS (Web/PWA), Monorepo dùng chung TypeScript DTO |
| Thanh toán | Tính phí cứu hộ tư nhân qua Ví | **Đã loại bỏ** |
| Analytics/Heatmap | Có (thống kê, bản đồ nhiệt) | Không còn trong FR mới (xem mục G) |
| Điều phối nhiều xe | Không đề cập | Cấp 3 cho phép điều 2 – 5 xe đồng thời |
| Thuật toán điều phối | Quét bán kính, xe Available gần nhất | Nearest-Available và Load-Aware; tự mở rộng bán kính 10 → 15 → 22.5 → 30 km |

---

## A. Luồng nghiệp vụ cốt lõi (Business Workflow)

1. **Báo động sự cố:** Người dân/công nhân nhấn giữ nút SOS 2 giây trên Mobile App/PWA. Hệ thống lấy tọa độ GNSS, cho phép chụp ảnh, quay video ≤ 10s hoặc chọn ảnh thư viện; mô tả bằng văn bản ≤ 200 ký tự hoặc ghi âm ≤ 30s. Có nút Bypass gửi tọa độ ngay khi nguy hiểm tính mạng. Mất mạng → lưu Offline Queue và tự gửi lại.
2. **Phân loại AI:** Backend đẩy media sang AI Engine (Pixtral-12B LoRA / dự phòng Qwen2.5-VL) để xác định nhánh sự kiện (Cháy nổ / Tai nạn), chấm Cấp 1–3, % tin cậy và thẻ nguy cơ. Ảnh không hợp lệ hoặc AI lỗi → **Cấp 0** (không tự hủy).
3. **Thẩm định Human-in-the-Loop:** Sự cố vào hàng đợi ưu tiên (Cấp 3 & Cấp 0 cao nhất, FIFO giữa hai loại). Điều phối viên mở ca (khóa mềm 2 phút), đối chiếu media với kết quả AI, xác nhận hoặc ghi đè (bắt buộc lý do ≥ 5 ký tự, lưu Audit Trail), hoặc hủy ca báo khống + đưa số vào blacklist.
4. **Điều phối:** Động cơ gợi ý lọc xe đúng chủng loại, xếp hạng theo Nearest-Available hoặc Load-Aware, tự mở rộng bán kính. Điều phối viên giao 1-click hoặc kéo-thả; Cấp 3 có thể giao 2–5 xe.
5. **Tác nghiệp hiện trường:** Đội cứu hộ nhận chuông báo động ưu tiên cao, có 120 giây để Chấp nhận/Từ chối (quá hạn → trả về trung tâm). Di chuyển theo Turn-by-Turn, GPS stream 3–5s/lần về Command Center và app người dân (ETA động). Trạng thái tuần tự `Accepted → EnRoute → OnScene`.
6. **Leo thang tự động:** Cấp 3/Cấp 0 không ai nhận sau 5 phút (2.5 phút ban đêm) → trạng thái `Escalated`, báo động toàn bộ dashboard, push tới Trưởng trạm/Admin, nhân đôi bán kính tìm xe (≤ 30 km). Có đơn vị nhận → tự hạ thang.
7. **Nghiệm thu & đóng sự cố:** Đội cứu hộ nộp báo cáo số (bắt buộc ≥ 1 ảnh sau xử lý, số nạn nhân, hành động, vật tư). Xe vào trạng thái hồi sức 5 phút. Ca nhiều xe chỉ đóng khi tất cả xe đã nộp báo cáo. Người dân đánh giá 1–5 sao trong 72 giờ.

---

## B. Kiến trúc & công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Mobile | React Native (iOS/Android) — Citizen App & Staff App |
| Web | ReactJS — Command Center Dashboard, Admin, Citizen PWA |
| Backend | ASP.NET Core, Clean Architecture (Domain / Application / Infrastructure / API) |
| Real-time | SignalR Core qua WSS (kênh theo `incident_{id}`) |
| CSDL | PostgreSQL 16 + PostGIS (Neon Cloud) |
| AI | Pixtral-12B LoRA (vLLM/FastAPI container) + dự phòng Qwen2.5-VL API; Polly (timeout 20s, retry 3 lần, circuit breaker) |
| Media | Cloudinary CDN |
| Thông báo | Google FCM v1 (mobile) + Web Push API (web/PWA) |
| Bản đồ | Goong Maps / OpenStreetMap |
| Lưu trữ offline | AsyncStorage (mobile), IndexedDB (web) |
| Triển khai | Docker / Docker Compose; CI/CD build web tĩnh + .apk/.ipa |
| Monorepo | Dùng chung 100% TypeScript DTO, schema validate, API hooks giữa Web và Mobile |

---

## C. Yêu cầu chức năng theo phân hệ

### Phân hệ 1: Người dân / Công nhân (Citizen) — React Native + PWA

- **FR-CIT-01 – SOS 1 chạm & thu thập hiện trường:** nhấn giữ 2 giây kèm vòng tiến trình (chống bấm nhầm); GNSS độ chính xác cao, fallback kéo-thả ghim thủ công; chụp ảnh / quay video ≤ 10s / chọn ảnh thư viện; watermark số (Device ID, UTC, GPS) cho ảnh chụp trực tiếp, đọc EXIF ảnh thư viện; nút Bypass gửi tọa độ ngay.
- **FR-CIT-02 – Đóng gói & gửi báo cáo:** văn bản ≤ 200 ký tự hoặc ghi âm ≤ 30s (AAC/Opus); UUID v4 phía client (idempotency); Offline Queue với backoff 2s → 4s → 8s → 16s; chống spam tối đa 1 sự cố hoạt động / thiết bị / 3 phút (BR-CIT-01).
- **FR-CIT-03 – Theo dõi xe & ETA động:** nhận GPS xe 3–5s/lần qua SignalR, vẽ tuyến và đếm ngược ETA; Cấp 3 hiển thị đồng thời nhiều xe với ETA riêng; chuông + rung khi xe OnScene; khóa quyền tự hủy khi xe đã Dispatched/EnRoute.
- **FR-CIT-04 – Thông báo đẩy đa kênh:** FCM v1 + Web Push tại các mốc: tiếp nhận, xe xuất phát (kèm ETA), sắp đến (< 2 phút), đã đến, hoàn thành; Deep-link mở màn hình theo dõi; độ trễ ≤ 3s.
- **FR-CIT-05 – Lịch sử sự cố:** danh sách phân trang + bộ lọc (Tất cả / Hoàn thành / Đã hủy); đánh giá 1–5 sao và nhận xét trong 72 giờ, sau đó khóa (BR-CIT-08).
- **Báo cáo ùn tắc nội khu (theo Phiếu):** gửi điểm ùn tắc kèm ghi chú ngắn và ảnh tùy chọn; AI gắn thẻ `#Traffic_Jam`, không chấm cấp độ.

### Phân hệ 2: Điều phối viên (Command Center Operator) — ReactJS Web

- **FR-OP-01 – CAD Live Map & giám sát đội xe:** bản đồ GIS thời gian thực hiển thị sự cố theo 2 nhánh (🔥 Cháy nổ, 🚗 Tai nạn), mã màu theo Cấp 1–3 + Cấp 0, vị trí xe và trạm cố định, điểm ùn tắc; desktop bố cục 65% bản đồ / 35% hàng đợi; tablet thu thành Bottom Sheet; gom cụm marker; kéo-thả xe vào sự cố.
- **FR-OP-02 – Hàng đợi ưu tiên & khóa đồng thời:** thứ tự Cấp 3 = Cấp 0 (FIFO giữa hai loại, Cấp 0 có dải cờ vàng) → Cấp 2 → Cấp 1; khóa mềm 2 phút (`LockedByOperatorId`) + optimistic concurrency (`RowVersion`) chặn 2 người điều cùng 1 xe (HTTP 409).
- **FR-OP-03 – Thẩm định AI (Human-in-the-Loop):** bố cục song song media ↔ kết quả AI (sự kiện, cấp 0–3, % tin cậy, thẻ nguy cơ); xác nhận hoặc ghi đè (lý do ≥ 5 ký tự, lưu `IncidentAuditTrail`); che số điện thoại (098\*\*\*456), bấm “Hiện số” được ghi vết; hủy ca báo khống, khóa số vào `BlockedPhoneNumberList` (7 ngày / 30 ngày / 1 năm / vĩnh viễn).
- **FR-OP-04 – Gợi ý điều phối & điều nhiều xe:** khớp loại xe theo sự cố (Cháy nổ → xe cứu hỏa; Tai nạn → xe cứu thương); 2 thuật toán: Nearest-Available (Haversine hoặc khoảng cách mạng lưới đường) và Load-Aware (`Cost = 0.5 × Khoảng cách + 0.3 × Tải trạm + 0.2 × Nhiệm vụ đang chạy`); tự mở rộng bán kính 10 → 15 → 22.5 → 30 km; Cấp 3 chọn 2–5 xe.

### Phân hệ 3: Lực lượng cứu hộ (Rescue Staff) — React Native (+ Web fallback)

- **FR-RS-01 – Cảnh báo nhiệm vụ:** chuông ưu tiên cao + rung mạnh, vượt chế độ DND (không dùng còi hú liên tục); thẻ tác chiến gồm loại sự kiện, cấp độ, địa chỉ, khoảng cách, ETA, tóm tắt y tế nạn nhân; 120 giây để Chấp nhận/Từ chối (từ chối bắt buộc chọn lý do), quá hạn tự trả về trung tâm (MSG35).
- **FR-RS-02 – Điều hướng & truyền viễn trắc:** Turn-by-Turn tích hợp + mở Google/Apple Maps; dịch vụ nền gửi GPS, vận tốc, hướng 3–5s/lần (BR-23), cảnh báo nếu mất GPS > 60s; trạng thái tuần tự `Accepted → EnRoute → OnScene` (không nhảy cóc); gọi nhanh cho nạn nhân (số được che); hiển thị điểm ùn tắc để chọn tuyến.
- **FR-RS-03 – Báo cáo kết thúc nhiệm vụ:** bắt buộc ≥ 1 ảnh sau xử lý qua Cloudinary (BR-25); nhập số nạn nhân, hành động nghiệp vụ, vật tư tiêu hao; xe vào trạng thái hồi sức 5 phút (BR-27); ca nhiều xe chỉ hoàn tất khi tất cả xe nộp báo cáo.

### Phân hệ 4: Quản trị & Dịch vụ nền (Admin & Background Services)

- **FR-AD-01 – Quản lý trạm, cơ sở vật chất & đội xe:** CRUD + xóa mềm trạm (tọa độ, bán kính phủ sóng, hotline) và xe (biển số, chủng loại, trạng thái bảo trì, nhân sự); cấm xóa/bảo trì xe OnMission; xóa trạm → xe thuộc trạm chuyển OutOfService; xóa mềm toàn hệ thống (`IsDeleted`).
- **Quản lý tài khoản & phân quyền (theo Phiếu):** quản lý người dùng theo vai trò Operator, RescueStaff, Admin; cấu hình ngưỡng leo thang.
- **FR-SYS-01 – AI Engine đa phương thức:**
  - Nhánh Cháy nổ: Cấp 1 (cháy nhỏ/rác/khói bếp) · Cấp 2 (cháy nhà/ô tô/khói đen lan rộng) · Cấp 3 (cháy lớn chung cư/nhà máy/kho xưởng/có người kẹt).
  - Nhánh Tai nạn: Cấp 1 (va quẹt nhẹ) · Cấp 2 (va chạm mạnh, lật xe, gãy xương/bất tỉnh) · Cấp 3 (liên hoàn nhiều xe, biến dạng, nạn nhân kẹt cần banh cắt thủy lực).
  - Cấp 0: ảnh không có sự cố (phong cảnh, tối/mờ, selfie, spam) hoặc AI lỗi → không tự hủy, đẩy lên đầu hàng đợi ngang Cấp 3.
  - Chịu lỗi (Polly): timeout 20s, retry 3 lần lùi số mũ, circuit breaker ngắt 30s khi 5 lỗi liên tiếp trong 2 phút.
- **FR-SYS-02 – Escalation Daemon:** quét mỗi 60s; Cấp 3 hoặc Cấp 0 chờ > 5 phút (> 2.5 phút từ 22h–6h) chưa có đội nhận → `Escalated`, báo động + viền đỏ toàn bộ dashboard (MSG45/MSG46), push FCM tới Trưởng trạm & Admin, nhân đôi bán kính (≤ 30 km); có đơn vị nhận → tự hạ thang.

---

## D. Yêu cầu phi chức năng

| Nhóm | Chỉ tiêu |
| --- | --- |
| Hiệu năng | Tiếp nhận SOS < 3.0s · Suy luận AI ≤ 20s · Độ trễ GPS qua SignalR < 500ms · Đồng bộ dashboard 1–3s · Tải Live Map (100 xe + 50 sự cố) < 2.0s · Gợi ý điều phối < 1.0s · ≥ 100 req/s REST và 200 kết nối WebSocket đồng thời |
| Khả dụng | Gửi SOS ≤ 3 chạm và ≤ 5 giây · Nút ≥ 48×48 dp · Mã màu: Cấp 1 xanh lục, Cấp 2 hổ phách/cam, Cấp 3 đỏ thẫm, Cấp 0 tím/vàng sọc · Song ngữ Việt (chính) – Anh |
| Tin cậy & sẵn sàng | Uptime ≥ 99.5% · MTBF ≥ 720 giờ · MTTR ≤ 15 phút (Docker tự khởi động lại) · Graceful degradation: AI lỗi → Cấp 0, điều phối không dừng · Offline Queue phía client |
| Bảo mật | JWT HMAC-SHA256 (access 15 phút, refresh 7 ngày xoay vòng) · BCrypt work factor 10 · RBAC 4 vai trò · Khóa 15 phút sau 5 lần sai mật khẩu · HTTPS TLS 1.3, WSS · Kiểm tra định dạng/kích thước media trước khi đưa vào AI |
| Quyền riêng tư | Che số điện thoại · Chỉ đội đang nhận nhiệm vụ mới xem GPS chính xác và hồ sơ y tế nạn nhân, tự thu hồi khi đóng ca |
| Toàn vẹn dữ liệu | Immutable Audit Trail cho mọi thay đổi trạng thái, ghi đè AI, bàn giao (cấm UPDATE/DELETE) · Xóa mềm toàn hệ thống |
| Bảo trì & di động | Clean Architecture · Monorepo TypeScript dùng chung · Hỗ trợ Chrome/Firefox/Safari/Edge · Docker Compose · Tài liệu REST/WebSocket API, test tự động cho luồng điều phối và AI |
| Đa nền tảng | NFR-CP-01 trừu tượng phần cứng (`getLocation`, `openMediaCapture`) · NFR-CP-02 3 điểm ngắt: < 600px / 600–1024px / > 1024px · NFR-CP-03 mobile 60 FPS, web FCP ≤ 1.5s, bản đồ WebGL/Canvas · NFR-CP-04 AsyncStorage/IndexedDB · NFR-CP-05 CI/CD chung |

---

## E. Nội dung nghiên cứu

- **RQ1:** VLM phân loại sự cố (cháy, tai nạn), phát hiện ùn tắc và chấm Cấp 1–3 chính xác và hiệu quả đến đâu so với nhãn do người gán?
- **RQ2:** Nearest-Available so với Load-Aware khác nhau thế nào về thời gian phản ứng trung bình và độ cân bằng tải giữa các đội cứu hộ?
- **RQ3:** Thẩm định có AI hỗ trợ (Human-in-the-Loop) giảm thời gian ra quyết định điều phối bao nhiêu so với thẩm định thủ công?

**Chỉ số đánh giá:** Accuracy & F1-score cho các thẻ `#Fire`, `#Accident`, `#Traffic_Jam`; Weighted Cohen's Kappa cho mức đồng thuận cấp độ AI ↔ người; thời gian trung bình từ sự cố đến điều phối theo từng thuật toán; phương sai tải giữa các đội; thời gian time-to-dispatch có AI so với baseline thủ công.

**Dữ liệu & phương pháp:** bộ dữ liệu ảnh/video gán nhãn (cháy nhà xưởng, chập điện, tai nạn lao động, va chạm xe, ùn tắc nội khu) kết hợp mô phỏng điều phối có kiểm soát dưới tải cao.

---

## F. Sản phẩm bàn giao & phân chia công việc

**Sản phẩm:** App người dân (Mobile + Web/PWA) · App lực lượng cứu hộ · Web Dashboard điều phối · Module quản trị · Module AI-1 kèm báo cáo đánh giá thực nghiệm · Backend, hạ tầng WebSocket, CSDL · Tài liệu SRS, Use Case, ERD, API, Test Plan, User Manual · Mã nguồn, báo cáo kiểm thử và bản demo triển khai.

| Gói việc | Nội dung |
| --- | --- |
| TP1 – Phân tích & thiết kế (cả nhóm) | Khảo sát quy trình, xác định 4 vai trò, SRS, UI/UX, CSDL, API spec, kiến trúc |
| TP2 – App SOS & AI cốt lõi | Client báo cáo (SOS cháy/tai nạn, báo ùn tắc); tích hợp VLM phân loại và chấm cấp độ; đánh giá mô hình |
| TP3 – Command Center & Live Map | Web Dashboard, Live Map real-time, hàng đợi ưu tiên, thuật toán điều phối |
| TP4 – App cứu hộ & Admin | Nhận nhiệm vụ, điều hướng, báo cáo kết thúc; module leo thang và quản lý tài sản |
| TP5 – Tích hợp, kiểm thử & bàn giao (cả nhóm) | Tích hợp end-to-end, kiểm thử chức năng/bảo mật/hiệu năng, Docker, deploy prototype |

---

## G. Điểm chưa thống nhất giữa FR/NFR và Phiếu đăng ký (cần chốt)

*Trong tài liệu này, chi tiết kỹ thuật đang theo bản FR/NFR (mới và chi tiết hơn); phạm vi và nghiên cứu theo Phiếu. Các điểm dưới đây nên được nhóm chốt lại.*

| Hạng mục | FR/NFR | Phiếu đăng ký |
| --- | --- | --- |
| Mô hình AI | Pixtral-12B LoRA cục bộ, Qwen2.5-VL làm dự phòng | Qwen2.5-VL API là mô hình chính (RQ1 cũng ghi Qwen2.5-VL) |
| Báo cáo ùn tắc (`#Traffic_Jam`) | Chưa có FR riêng | Là tính năng phụ trợ của Citizen, Operator, Staff và nằm trong RQ1 |
| Ngưỡng leo thang | 5 phút (2.5 phút ban đêm), áp dụng Cấp 3 & Cấp 0 | Ví dụ 3–5 phút; gồm cả “tê liệt giao thông hoàn toàn” |
| Quản lý tài khoản | FR-AD-01 chỉ nói trạm và xe | Admin quản lý tài khoản & phân quyền |
| Bối cảnh | Còn chi tiết kiểu đô thị: hotline 115, ca nô cho đuối nước, cháy chung cư | Khu Công nghiệp / Khu Công nghệ cao |
| Analytics / Heatmap | Không có | Không có (chỉ có trong bản gốc), xác nhận đã bỏ khỏi phạm vi |
