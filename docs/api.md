# API MiniFlow

Backend đã triển khai và kiểm thử với PostgreSQL thật. Base path mặc định `/api`; thời gian trả dạng ISO 8601 UTC, id dạng UUID. Response thành công là JSON trực tiếp, không bọc `data`. Frontend hiện vẫn dùng adapter demo.

## Xác thực

| Method | Path             | Body                  | Thành công                         |
| ------ | ---------------- | --------------------- | ---------------------------------- |
| POST   | `/auth/register` | `{ email, password }` | 201, User + Set-Cookie             |
| POST   | `/auth/login`    | `{ email, password }` | 200, User + Set-Cookie             |
| GET    | `/auth/me`       | —                     | 200, User                          |
| POST   | `/auth/logout`   | —                     | 204, xóa cookie và thu hồi Session |

User trả `{ id, email, createdAt }`; không trả passwordHash, Session hoặc JWT trong JSON. Email trim/lowercase, tối đa 254 ký tự, phải hợp lệ. Password tối thiểu 8 ký tự, tối đa 72 byte UTF-8 (giới hạn bcrypt); không trim password. Đăng ký tạo User/Session nguyên tử và tự đăng nhập; trùng email trả 409, kể cả đăng ký đồng thời. Email không tồn tại/sai mật khẩu đều trả 401 với cùng thông báo.

Cookie `miniflow_session`: HttpOnly, SameSite=Lax, Path=/, Secure ở production. JWT HS256 có issuer/audience và tham chiếu Session lưu PostgreSQL; guard kiểm tra JWT + hạn Session. Thời hạn theo JWT_EXPIRES_IN, mặc định 1d; cookie hết hạn cùng JWT. Tải lại trang gọi `/auth/me` để lấy User; phiên vẫn dùng được khi backend restart. Hết hạn trả 401 và cần đăng nhập lại; không có endpoint refresh token hoặc tự gia hạn phiên. Logout lặp lại/không có cookie vẫn trả 204. Token đã logout không dùng lại được.

Mọi POST/PATCH, kể cả auth/logout, yêu cầu `Origin` khớp FRONTEND_ORIGIN; thiếu/sai Origin trả 403. CORS chỉ cấp quyền cho origin cấu hình, cho phép credentials. Browser dùng `credentials: 'include'`; curl/Postman cũng phải gửi Origin cho thao tác ghi. Tất cả endpoint nghiệp vụ bên dưới yêu cầu cookie; không có phiên/phiên sai/hết hạn trả 401. Health là public.

## Project

| Method | Path                   | Body       | Thành công            |
| ------ | ---------------------- | ---------- | --------------------- |
| GET    | `/projects`            | —          | 200, ProjectSummary[] |
| POST   | `/projects`            | `{ name }` | 201, ProjectSummary   |
| GET    | `/projects/:projectId` | —          | 200, ProjectDetail    |

`name` trim, bắt buộc 1–100 ký tự sau trim. Owner lấy từ phiên; gửi ownerId hoặc trường lạ trả 400. List sắp createdAt giảm dần, id giảm dần khi trùng thời gian. Tài khoản mới trả `[]`.

```json
{
  "id": "UUID",
  "name": "MiniFlow",
  "createdAt": "2026-10-02T00:00:00.000Z",
  "totalTasks": 3,
  "completedTasks": 1,
  "progress": 33
}
```

ProjectDetail thêm `todoTasks` và `inProgressTasks`. Progress làm tròn completedTasks / totalTasks × 100; Project không có Task trả 0%. Response không có ownerId. Chi tiết không nhúng danh sách Task, dùng endpoint Task riêng. Project không tồn tại hoặc thuộc user khác đều trả 404; id không phải UUID trả 400.

## Task

| Method | Path                         | Body / Query              | Thành công            |
| ------ | ---------------------------- | ------------------------- | --------------------- |
| GET    | `/projects/:projectId/tasks` | `?status=TODO` tùy chọn   | 200, Task[]           |
| POST   | `/projects/:projectId/tasks` | `{ title, description? }` | 201, Task             |
| PATCH  | `/tasks/:taskId/status`      | `{ status }`              | 200, Task đã cập nhật |

Status chỉ gồm `TODO`, `IN_PROGRESS`, `DONE`. Không truyền bộ lọc thì lấy toàn bộ Task; `status=ALL` không hợp lệ. List sắp createdAt giảm dần, id giảm dần khi trùng thời gian. Project hợp lệ không có Task hoặc bộ lọc không khớp trả `[]`; Project không tồn tại/không thuộc user trả 404.

Title trim, bắt buộc 1–100 ký tự; description tùy chọn, chuỗi tối đa 1.000 ký tự sau trim. Description thiếu/rỗng lưu và trả null; gửi null trong request tạo Task trả 400. Task mới luôn TODO; gửi status/projectId/ownerId trong body tạo Task trả 400. projectId lấy từ URL đã kiểm tra chủ sở hữu.

```json
{
  "id": "UUID",
  "title": "Viết API",
  "description": "Kiểm tra quyền hai tài khoản",
  "status": "TODO",
  "projectId": "UUID",
  "createdAt": "2026-10-02T00:00:00.000Z"
}
```

PATCH chỉ đổi status; gửi lại status hiện tại vẫn thành công. Điều kiện chủ sở hữu áp dụng ngay trong UPDATE. Task không tồn tại/không thuộc user trả 404; id/status không hợp lệ hoặc trường lạ trả 400. Đổi trạng thái giữ createdAt nguyên vẹn. Dữ liệu tồn tại qua tải lại trang, logout và restart app.

## Dashboard

`GET /dashboard` trả thống kê theo user:

```json
{
  "totalProjects": 1,
  "totalTasks": 3,
  "todoTasks": 1,
  "inProgressTasks": 1,
  "completedTasks": 1,
  "recentProjects": [],
  "pendingTasks": []
}
```

`recentProjects` chứa tối đa ba ProjectSummary mới nhất. `pendingTasks` chứa tối đa năm Task mới nhất chưa DONE; mỗi Task thêm `project: { id, name }` để liên kết về chi tiết Project. Tài khoản mới trả các số 0 và hai list rỗng. Tổng hợp Project/Dashboard dùng transaction RepeatableRead để giữ số liệu nhất quán trong một response. Sau mutation, frontend cần tải lại danh sách/chi tiết/thống kê liên quan.

## Health và lỗi

`GET /health` trả 200 với `{ status: "ok", database: "up" }`; DB không sẵn sàng trả 503 với `{ status: "error", database: "down" }`.

Các lỗi khác theo Nest, `{ statusCode, message, error }`; message validation có thể là mảng chuỗi. Các mã chính: 400 input sai, 401 phiên hoặc credentials sai, 403 Origin sai, 404 tài nguyên không thuộc user/không tồn tại, 409 email trùng. Không đưa passwordHash/token/chi tiết lỗi PostgreSQL vào response.

List Project/Task hiện chưa phân trang. Scope hiện tại không có sửa/xóa Project, sửa nội dung/xóa Task hoặc chia sẻ/phân công thành viên. Triển khai frontend và production là giai đoạn riêng.
