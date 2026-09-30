# Plan frontend MiniFlow

Trạng thái: mới lập plan; chưa triển khai flow nào.

## Cách triển khai

- Giới hạn được user chốt: chỉ triển khai frontend. Chỉ sửa `frontend/` và tài liệu frontend liên quan; không sửa `backend/`, Prisma, database, hợp đồng API, cấu hình hạ tầng hoặc package/lockfile ở root trong giai đoạn này để tránh conflict. Nếu cần thay đổi ngoài phạm vi, dừng phần phụ thuộc đó và trao đổi trước.
- Không chạy backend, migration hoặc dịch vụ database. Các flow dùng adapter demo phía frontend; giai đoạn nối backend chỉ thực hiện khi user yêu cầu riêng.
- Build từng flow theo thứ tự bên dưới. Mỗi lượt chỉ triển khai một flow, kiểm tra và review xong rồi mới chuyển flow tiếp theo.
- Dùng `mock/MiniFlow-Mock-Design.md` và giao diện trong `mock/` làm chuẩn về bố cục, màu và nội dung tiếng Việt.
- Frontend đi trước backend: dùng dữ liệu mẫu và hàm bất đồng bộ trong adapter của từng feature để thao tác được; không gọi endpoint chưa tồn tại. Khi nối backend, thay adapter theo API trong `docs/architecture.md`.
- Dữ liệu demo giữ trong bộ nhớ trong phiên chạy, reset khi tải lại trang; thông tin này phải rõ trong chế độ demo. Không lưu mật khẩu hoặc giả định auth demo là xác thực thật.
- Dùng React state và fetch khi nối API; giữ cấu trúc `app`, `features`, `shared` đã chốt. Không thêm thư viện quản lý state hoặc UI lớn ở bước này.
- Mỗi flow có trạng thái tải, trống, lỗi và đang gửi phù hợp; kiểm tra bàn phím, mobile, lint/typecheck và build khi có code chạy được. Chỉ thêm test tự động cho hành vi cần bảo vệ.

## Thứ tự và checklist

| Flow | Nội dung | Trạng thái |
| --- | --- | --- |
| 01 | Khung app và điều hướng | Chưa làm |
| 02 | Đăng nhập, đăng ký, đăng xuất (demo) | Chưa làm |
| 03 | Danh sách Project | Chưa làm |
| 04 | Tạo Project | Chưa làm |
| 05 | Chi tiết Project và danh sách Task | Chưa làm |
| 06 | Tạo Task | Chưa làm |
| 07 | Đổi trạng thái và lọc Task | Chưa làm |
| 08 | Dashboard và tiến độ | Chưa làm |
| 09 | Review toàn bộ hành trình frontend | Chưa làm |

## Flow 01 — Khung app và điều hướng

**Hành trình:** mở app → vào trang demo → chuyển Dashboard / Projects → điều hướng mobile.

- Tạo root layout, global styles, layout auth và workspace theo mock.
- Sidebar, topbar, trạng thái menu đang chọn; mobile đưa menu lên đầu trang.
- Dựng route `/login`, `/register`, `/dashboard`, `/projects`, `/projects/[projectId]` với nội dung tạm rõ ràng; các màn hình chi tiết sẽ hoàn thiện ở flow sau.
- `/` chuyển đến `/dashboard` trong bước dựng khung; flow 02 sẽ bổ sung điều hướng theo phiên demo.
- Chỉ tạo thành phần dùng chung cần ngay như Button; Modal/Input thêm khi flow sử dụng.

**Hoàn thành khi:** app chạy được, các route và menu hoạt động, layout không tràn ngang ở mobile, lint/typecheck/build đạt.

## Flow 02 — Auth UI và phiên demo

**Hành trình:** `/login` ↔ `/register` → submit hợp lệ → `/dashboard` → đăng xuất → `/login`.

- Form email/mật khẩu, nhãn, lỗi cạnh trường và trạng thái đang gửi.
- Đăng ký yêu cầu mật khẩu tối thiểu 8 ký tự; email hợp lệ và các trường bắt buộc.
- Adapter auth demo chỉ mô phỏng thành công/thất bại; không gửi hoặc lưu mật khẩu. Thông báo rõ đây là demo.
- Phiên demo dùng chung cho điều hướng: chưa có phiên vào workspace thì về login; đang có phiên vào auth thì về dashboard; đăng xuất xóa dữ liệu demo của phiên.
- Có trạng thái khởi tạo phiên để tránh nháy nội dung workspace. Auth thật và cookie chốt khi backend auth sẵn sàng.

**Hoàn thành khi:** chuyển hai form đúng, lỗi và pending rõ, submit không lặp, logout và truy cập trực tiếp route đúng với phiên demo.

## Flow 03 — Danh sách Project

**Hành trình:** menu Projects → tải danh sách → xem card → mở chi tiết Project.

- Adapter project và dữ liệu mẫu dùng chung trong workspace.
- Card có tên, số Task, số hoàn thành, phần trăm tiến độ và ngày tạo; Project không có Task là 0%.
- Danh sách responsive, loading, lỗi có thử lại, trạng thái chưa có Project.
- Chưa bật thao tác tạo Project cho đến flow 04; không để nút có vẻ hoạt động nhưng không xử lý.

**Hoàn thành khi:** card và link đúng dữ liệu, kiểm tra được danh sách có dữ liệu/trống/lỗi, điều hướng đến đúng Project.

## Flow 04 — Tạo Project

**Hành trình:** Projects → Tạo Project → nhập tên → gửi → đóng modal → thấy card mới.

- Modal có trường tên bắt buộc, trim khoảng trắng, tối đa 100 ký tự.
- Hủy/đóng không tạo dữ liệu; lỗi giữ nguyên nội dung để thử lại; đang gửi chặn submit lặp.
- Thành công cập nhật danh sách, thông báo ngắn; Project mới có 0 Task và tiến độ 0%.
- Modal hỗ trợ focus ban đầu, giữ focus bên trong, Escape và trả focus về nút mở; không đóng giữa lúc đang gửi.
- Form dùng lại ở Dashboard khi triển khai flow 08.

**Hoàn thành khi:** tạo đúng một Project, validation đúng giới hạn, modal dùng được bằng bàn phím, dữ liệu còn khi chuyển route trong phiên demo.

## Flow 05 — Chi tiết Project và danh sách Task

**Hành trình:** card Project → `/projects/:projectId` → xem thông tin, thống kê và Task → quay lại Projects.

- Tên Project, ngày tạo, link quay lại và bốn thống kê theo toàn bộ Task.
- Bảng tên/mô tả và nhãn trạng thái: Cần làm / Đang làm / Hoàn thành.
- Loading, lỗi có thử lại, Project không tồn tại/không có quyền với link quay lại, Project chưa có Task.
- Bảng đọc được trên mobile, cho cuộn ngang trong vùng bảng khi cần.
- Tạo Task và đổi trạng thái sẽ bật ở flow 06–07.

**Hoàn thành khi:** mở trực tiếp URL đúng, số liệu chính xác, xử lý ID không hợp lệ và dữ liệu trống, quay lại danh sách được.

## Flow 06 — Tạo Task

**Hành trình:** chi tiết Project → Tạo Task → nhập tên/mô tả → gửi → thấy Task mới.

- Tên bắt buộc sau khi trim, tối đa 100 ký tự; mô tả tùy chọn, tối đa 1.000 ký tự.
- Lấy Project từ route đang mở; Task mới luôn là TODO.
- Tái sử dụng hành vi modal của flow 04; pending, lỗi giữ nội dung và thông báo thành công.
- Cập nhật bảng, thống kê Project và dữ liệu card cùng nguồn; khi đã có bộ lọc ở flow 07, tạo thành công đưa bộ lọc về Tất cả.

**Hoàn thành khi:** Task thuộc đúng Project, validation đúng, tạo không lặp, thống kê và card cập nhật sau khi chuyển route.

## Flow 07 — Đổi trạng thái và lọc Task

**Hành trình:** chọn trạng thái trong dropdown → chờ cập nhật → xem số liệu mới → chọn bộ lọc.

- Cho đổi trực tiếp giữa TODO, IN_PROGRESS, DONE, không bắt buộc theo thứ tự.
- Trong lúc cập nhật khóa dropdown của Task đó; chỉ cập nhật dữ liệu sau khi adapter thành công, lỗi giữ trạng thái cũ và cho thử lại.
- Bộ lọc Tất cả / Cần làm / Đang làm / Hoàn thành có số lượng; chỉ lọc bảng, thống kê vẫn tính toàn Project.
- Trạng thái trống riêng cho bộ lọc; Task đổi trạng thái có thể rời khỏi bộ lọc hiện tại.
- Tạo Task mới đưa bộ lọc về Tất cả; card Project cập nhật tiến độ.

**Hoàn thành khi:** đổi trạng thái thành công/thất bại đúng, số lượng và tiến độ đồng bộ, lọc đúng và không ảnh hưởng Project khác.

## Flow 08 — Dashboard và tiến độ

**Hành trình:** Dashboard → xem tổng quan → tạo/mở Project → thao tác Task → quay lại Dashboard thấy tiến độ mới.

- Bốn card: tổng Project và số Task theo ba trạng thái.
- Card Project dùng lại từ flow 03, link Xem tất cả đến Projects, modal tạo từ flow 04.
- Tối đa 5 Task chưa hoàn thành trong mục Task cần chú ý; dùng thứ tự mới tạo trước để kết quả ổn định, không thêm deadline/ưu tiên.
- Task cần chú ý dẫn đến Project tương ứng; đổi trạng thái tại trang chi tiết.
- Loading, lỗi có thử lại, chưa có Project và không còn Task cần chú ý.
- Tổng hợp từ cùng dữ liệu demo Project/Task, không hard-code số thống kê riêng.

**Hoàn thành khi:** tạo Project/Task và đổi trạng thái phản ánh đúng trên Dashboard; tiến độ 0 Task không gây chia cho 0; mobile đúng mock.

## Flow 09 — Review hành trình hoàn chỉnh

**Hành trình kiểm tra:** đăng ký demo → tạo Project → mở Project → tạo Task → lọc → đổi trạng thái → xem Dashboard → đăng xuất.

- Review với dữ liệu có sẵn và phiên demo trống, refresh, URL trực tiếp và Project không tồn tại.
- Kiểm tra mobile/desktop, bàn phím, focus modal, lỗi form, pending và retry qua kịch bản adapter demo có thể tái hiện.
- Chạy lint, typecheck, production build; ghi lại kết quả và hạn chế còn lại.
- Cập nhật README theo khả năng app đã có, không tuyên bố auth/API thật đã hoạt động.

**Hoàn thành khi:** toàn hành trình chạy nhất quán, không còn thao tác chết hoặc số liệu lệch; từng flow có ghi nhận review.

## Mốc nối backend sau frontend

Là giai đoạn riêng, chưa thuộc các flow demo bên trên: chốt hợp đồng response/lỗi và cơ chế cookie; thay adapter auth, project, task, dashboard lần lượt bằng HTTP client; kiểm tra hết phiên, quyền truy cập và lỗi server với backend thật. Route guard frontend phục vụ điều hướng; backend vẫn phải xác thực và kiểm tra quyền.

## Nhật ký triển khai

Mỗi flow hoàn thành ghi: ngày, phạm vi đã làm, kiểm tra đã chạy, kết quả review và việc còn lại. Hiện chưa có flow hoàn thành.
