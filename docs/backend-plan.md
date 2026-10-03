# Flow nối backend MiniFlow

Giai đoạn này được bắt đầu ngày 2026-10-01. Triển khai từng flow; mỗi flow có code, kiểm tra và ghi nhận kết quả trước khi sang flow tiếp theo. Trạng thái ngày 2026-10-03: backend flow 01–07 và frontend auth/Project/Task/Dashboard đã hoàn thành với API và PostgreSQL thật; hành trình trình duyệt đã được review. Nhật ký bên dưới giữ các mốc backend và frontend riêng.

## Kiến trúc

- Giữ package by feature: `modules/auth`, `users`, `projects`, `tasks`, `dashboard`, `health`.
- Luồng dữ liệu: Controller → Service → Repository → Prisma → PostgreSQL. Service kiểm tra nghiệp vụ và quyền; repository chứa truy vấn, luôn giới hạn dữ liệu theo chủ sở hữu.
- `config`, `database`, `common` chỉ chứa hạ tầng dùng chung. Không thêm base service hoặc repository interface cho CRUD này.
- Giữ các feature frontend hiện tại; HTTP client nằm trong `shared/lib`, API và types thuộc từng feature. Chuyển adapter theo từng flow đã có backend hoạt động.
- API dùng prefix `/api`, response thành công là JSON trực tiếp. Lỗi theo cấu trúc Nest (`statusCode`, `message`, `error`); health có payload riêng. Không trả passwordHash, token hoặc chi tiết lỗi DB.
- Auth dùng JWT trong cookie httpOnly, SameSite=Lax, Secure ở production và Session trong DB để thu hồi khi logout. Mọi thao tác ghi yêu cầu Origin đúng FRONTEND_ORIGIN. Khi nối UI, fetch dùng credentials và xử lý 401; không lưu token trong localStorage.

## Các flow

| Flow | Hành trình và đầu ra                               | Điều kiện hoàn thành                                                                                             | Trạng thái |
| ---- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------- |
| 01   | Nền Nest: bootstrap, env, CORS, validation, health | Env, HTTP prefix/CORS/validation và health 200/503 đạt; build đạt                                                | Hoàn thành |
| 02   | User → Project → Task trong PostgreSQL             | Prisma service dùng chung, schema, migration, FK/index, generate và kiểm tra DB Docker thật                      | Hoàn thành |
| 03   | Đăng ký → đăng nhập → refresh → đăng xuất          | Hash mật khẩu, cookie, `/auth/me`, guard, Origin; nối auth frontend; kiểm tra email trùng/sai mật khẩu/hết phiên | Hoàn thành |
| 04   | Danh sách → tạo → chi tiết Project                 | API và UI dùng DB; validation tên; owner lấy từ phiên; user khác không xem được                                  | Hoàn thành |
| 05   | Tạo → lọc → đổi trạng thái Task                    | API và UI; Task đúng Project; dữ liệu và quyền nhất quán; loading/error/retry                                    | Hoàn thành |
| 06   | Dashboard cập nhật theo Project/Task               | Thống kê theo user, ba Project gần nhất và tối đa năm Task chưa hoàn thành; frontend bỏ dữ liệu demo             | Hoàn thành |
| 07   | Review toàn hành trình với API thật                | Hai user cách ly dữ liệu; refresh giữ dữ liệu; logout/hết phiên; lỗi API; mobile; test và build hai app          | Hoàn thành |

## Chi tiết triển khai

Flow 02 thêm User (`id`, `email` unique, `passwordHash`, `createdAt`), Project (`id`, `name`, `ownerId`, `createdAt`) và Task (`id`, `title`, `description`, `status`, `projectId`, `createdAt`). TaskStatus gồm TODO, IN_PROGRESS, DONE. Index Project.ownerId và Task.projectId. Health chuyển sang Prisma service sau khi client đã được sinh.

Flow 03 giữ users repository trong feature users; auth service dùng repository đó. Đăng ký tự đăng nhập, email trim/lowercase; xử lý race email trùng từ DB. Chốt thời hạn cookie theo JWT và xóa cookie với cùng thuộc tính. Guard xác thực phía backend. Trong scope ngày 2026-10-02, chỉ triển khai backend và DB; workspace vẫn dùng adapter demo. Việc chuyển sang API thật thực hiện ở giai đoạn frontend riêng.

Flow 04–05 không nhận ownerId từ client. Không lộ sự tồn tại Project/Task của user khác; trả 404 cho tài nguyên không thuộc user. Giữ giới hạn tên 100 ký tự và mô tả 1.000 ký tự như frontend. Mỗi mutation cập nhật dữ liệu màn hình và thống kê liên quan; dữ liệu tồn tại sau refresh.

Flow 06 tổng hợp cùng nguồn DB, không có bảng Dashboard. Flow 07 kiểm tra endpoint thực với DB test riêng, không dùng DB production. Các điều kiện liên quan nối UI và mobile trong bảng là nghiệm thu toàn sản phẩm sau giai đoạn backend. Deployment/Docker/Nginx là giai đoạn sau.

## Nhật ký

- Flow 01: thêm entrypoint, AppModule, env validation, cấu hình HTTP chung và feature health. Health dùng pool PostgreSQL nhỏ với timeout 2 giây; flow 02 sẽ chuyển probe sang Prisma dùng chung. Frontend chưa chuyển adapter.
- Kiểm tra flow 01: lint, typecheck và Nest production build đạt; 16 unit test env/health và 4 test HTTP prefix/CORS/validation/health đạt. Test HTTP cần quyền mở cổng localhost trong môi trường sandbox. Health probe được giả lập trong test; chưa xác nhận kết nối DB thật, migration hoặc hành trình frontend/backend.
- Flow 02: schema User/Project/Task với UUID, TaskStatus, email unique, khóa ngoại Restrict, giới hạn chuỗi và index ownerId/projectId. Migration `20261001180036_init` đã áp dụng trên PostgreSQL 17 Docker cho DB development và DB test riêng. PrismaModule cung cấp PrismaService dùng PostgreSQL adapter; health dùng cùng client, đóng kết nối khi shutdown. Generated client không commit.
- Kiểm tra flow 02: schema validate/generate, lint, typecheck, Nest build, 15 unit test, 4 HTTP test và 7 integration test PostgreSQL thật đạt. Các fixture DB test rollback. Backend thật trả health HTTP 200; dừng DB trả 503; khởi động DB lại tự phục hồi về 200, bảng và lịch sử migration còn nguyên trong volume. PostgreSQL development được để chạy healthy tại localhost:5432; server backend dùng kiểm tra được dừng sau review.

- 2026-10-02, flow 03 (backend): đăng ký tạo User + Session nguyên tử; email trim/lowercase, bcrypt cost 12, từ chối mật khẩu vượt 72 byte UTF-8. Đăng nhập trả cùng lỗi cho email không tồn tại/sai mật khẩu. JWT HS256 có issuer/audience, thời hạn đồng bộ với Session/cookie. `/auth/me` xác thực JWT và phiên DB; tải lại trang/khởi động lại backend vẫn giữ phiên. Logout xóa Session và cookie, token cũ bị từ chối; không có endpoint refresh token hoặc tự gia hạn phiên. Migration `20261002091125_auth_sessions` thêm FK cascade và index userId/expiresAt; đã apply development + DB test. AuthRepository chứa truy vấn phiên; UsersRepository tạo User và Session bằng nested write.
- 2026-10-02, flow 04–05 (backend): GET/POST Projects, chi tiết Project, GET/POST Task trong Project, lọc theo TaskStatus, PATCH trạng thái Task. DTO trim và kiểm tra độ dài, từ chối trường lạ/ownerId/status khi tạo. Tất cả route nghiệp vụ yêu cầu AuthGuard; đọc/ghi giới hạn theo chủ sở hữu, tài nguyên của user khác trả 404. Đổi trạng thái có điều kiện owner ngay trong UPDATE. Project trả số Task/hoàn thành và phần trăm; Project không có Task là 0%.
- 2026-10-02, flow 06 (backend): Dashboard đếm Project và Task theo trạng thái từ cùng DB, tối đa ba Project gần nhất và năm Task mới nhất chưa hoàn thành. Tổng hợp Project/Dashboard chạy transaction RepeatableRead để số liệu trong một response nhất quán; không tạo bảng Dashboard.
- 2026-10-02, flow 07 (backend): 24 test PostgreSQL thật (9 schema/session + 15 hành trình API) đạt. Bao gồm hai tài khoản cách ly dữ liệu, đăng ký đồng thời email trùng (201/409), lỗi input/Origin, JWT giả/hết hạn, phiên DB hết hạn, logout chống replay, đăng nhập lại giữ dữ liệu và đóng/mở lại Nest app giữ phiên/thống kê. Fixture HTTP được xóa theo email UUID riêng; test schema dùng rollback. 15 unit test, 4 HTTP foundation test, Prisma validate/generate, lint, typecheck và production build Nest đạt (tổng 43 test). Không chạy DB production.
- Phần còn lại tại mốc 2026-10-02: nối auth/Project/Task/Dashboard của frontend vào API thật và review giao diện toàn hành trình; deployment production theo plan hạ tầng. Frontend không thay đổi trong lượt backend này. Hợp đồng request/response tại `docs/api.md`.
- 2026-10-03: tiếp tục phần frontend đang triển khai trong working tree. Đã nối auth/Project/Task/Dashboard với API, sửa lint khởi tạo provider và test giả lập window trong Node. Review Chromium với PostgreSQL development thật đạt: đăng ký, tạo Project/Task, đổi trạng thái, refresh giữ dữ liệu, Dashboard, hai tài khoản cách ly, logout/đăng nhập lại và chuyển về login khi API trả 401. Không tràn ngang ở 320/390/768/1440px; ảnh tại `/tmp/miniflow-review/artifacts`. Runner mới `frontend/test/api-browser-review.mjs`; dùng tài khoản review UUID riêng, dữ liệu để lại trong DB development. Frontend lint, typecheck, 6 test HTTP client/validation và production build webpack đạt; backend lint/typecheck và 15 unit test đạt. Docker image/CI trên GitHub và deployment production chưa được nghiệm thu trong lượt này.
