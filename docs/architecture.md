# Kiến trúc MiniFlow

## Nguyên tắc

Chia theo feature. Mỗi file có một trách nhiệm rõ, dùng tên quen thuộc. Không tạo interface repository, base service hay layer domain riêng cho CRUD nhỏ.

Backend: `Controller → Service → Repository → Prisma → PostgreSQL`.

- Controller nhận request, DTO validation và trả response.
- Service xử lý nghiệp vụ và quyền sở hữu. Không tin ownerId do client gửi.
- Repository chứa truy vấn Prisma. Truy vấn theo ownerId/projectId để tránh truy cập dữ liệu người khác.
- Database module cung cấp một Prisma service dùng chung, kết nối qua PostgreSQL driver adapter.
- Auth service phụ trách xác thực; users repository chứa truy vấn User. Auth repository chỉ thêm nếu có truy vấn riêng, tránh hai repository cùng làm một việc.
- Dashboard service tổng hợp số liệu từ Project/Task; không có bảng Dashboard.
- Health dùng kiểm tra DB đơn giản; không cần repository hoặc DTO nếu không có nhu cầu.

Các folder rỗng có `.gitkeep` để Git giữ lại. Chưa tạo file TypeScript rỗng hoặc class giả.

## Frontend

```text
src/app/
├── layout.tsx                         [sẽ viết] Root layout
├── page.tsx                           [sẽ viết] Chuyển vào dashboard/login
├── globals.css                        [sẽ viết] Tailwind và style chung
├── (auth)/
│   ├── layout.tsx                     [sẽ viết] Layout form auth
│   ├── login/page.tsx                  [sẽ viết]
│   └── register/page.tsx               [sẽ viết]
└── (workspace)/
    ├── layout.tsx                     [sẽ viết] Sidebar và topbar
    ├── dashboard/page.tsx              [sẽ viết]
    └── projects/
        ├── page.tsx                   [sẽ viết]
        └── [projectId]/page.tsx        [sẽ viết]
```

Route groups không xuất hiện trong URL: `/login`, `/register`, `/dashboard`, `/projects`, `/projects/:projectId`.

`features/auth` chứa form, API auth, hook phiên đăng nhập, schema Zod và types. `features/project` chứa card, modal tạo Project và API/types. `features/task` chứa bảng Task, form tạo Task, bộ lọc, dropdown và API/types. `features/dashboard` chứa thống kê và API/types tổng quan.

`shared/components` dành cho Button, Input, Modal và trạng thái tải/lỗi. `shared/lib` dành cho HTTP client. `shared/utils` dành cho hàm format ngày. Chỉ chuyển thành shared khi thực sự dùng chung.

Bắt đầu bằng fetch và React state; chưa thêm Redux, Zustand, React Query hay thư viện UI lớn. Với dữ liệu người dùng, API client không cache response dùng chung. Chi tiết cơ chế auth/cookie được chốt ở bước auth.

## Backend

Các file sẽ viết khi bắt đầu triển khai:

```text
src/main.ts                                  Bootstrap, /api, CORS, validation
src/app.module.ts                            Ghép các module
src/config/env.validation.ts                 Validate env lúc khởi động
src/database/prisma/prisma.module.ts          Cung cấp Prisma service
src/database/prisma/prisma.service.ts         PrismaClient + PrismaPg adapter
src/modules/auth/auth.module.ts
src/modules/auth/auth.controller.ts
src/modules/auth/auth.service.ts
src/modules/auth/dto/register.dto.ts
src/modules/auth/dto/login.dto.ts
src/modules/users/users.module.ts
src/modules/users/users.repository.ts
src/modules/projects/projects.module.ts
src/modules/projects/projects.controller.ts
src/modules/projects/projects.service.ts
src/modules/projects/projects.repository.ts
src/modules/projects/dto/create-project.dto.ts
src/modules/tasks/tasks.module.ts
src/modules/tasks/tasks.controller.ts
src/modules/tasks/tasks.service.ts
src/modules/tasks/tasks.repository.ts
src/modules/tasks/dto/create-task.dto.ts
src/modules/tasks/dto/update-task-status.dto.ts
src/modules/dashboard/dashboard.module.ts
src/modules/dashboard/dashboard.controller.ts
src/modules/dashboard/dashboard.service.ts
src/modules/health/health.module.ts
src/modules/health/health.controller.ts
src/modules/health/health.service.ts
src/common/guards/auth.guard.ts
src/common/decorators/current-user.decorator.ts
```

Không thêm users controller/service nếu chưa có API quản lý user. Filters/interceptors chỉ triển khai khi có nhu cầu xử lý lỗi/log chung, không bắt buộc tạo đủ class.

## API dự kiến

| Method | Đường dẫn                      | Chức năng           |
| ------ | ------------------------------ | ------------------- |
| POST   | /api/auth/register             | Đăng ký             |
| POST   | /api/auth/login                | Đăng nhập           |
| POST   | /api/auth/logout               | Đăng xuất           |
| GET    | /api/auth/me                   | User hiện tại       |
| GET    | /api/projects                  | Project của user    |
| POST   | /api/projects                  | Tạo Project         |
| GET    | /api/projects/:projectId       | Chi tiết Project    |
| GET    | /api/projects/:projectId/tasks | Task trong Project  |
| POST   | /api/projects/:projectId/tasks | Tạo Task            |
| PATCH  | /api/tasks/:taskId/status      | Đổi trạng thái      |
| GET    | /api/dashboard                 | Thống kê của user   |
| GET    | /api/health                    | Kiểm tra backend/DB |

`GET /health` trong scope ban đầu được thống nhất thành `/api/health` để đi qua cùng prefix Nginx. Health không cần đăng nhập. Các endpoint dữ liệu đều yêu cầu phiên hợp lệ và kiểm tra quyền.

## Database dự kiến

Chưa viết model trong schema. Bước database sẽ thêm:

- User: id, email unique, passwordHash, createdAt.
- Project: id, name, ownerId, createdAt.
- Task: id, title, description tùy chọn, status, projectId, createdAt.
- Enum TaskStatus: TODO, IN_PROGRESS, DONE; default TODO.
- Index trên Project.ownerId và Task.projectId.

Schema và migration nằm ở `backend/prisma`, tách khỏi Prisma service trong `backend/src`. Generated client nằm ở `src/database/prisma/generated`, không commit Git.

## Thứ tự triển khai

1. Entry Next/Nest, cấu hình env, health.
2. Model Prisma và migration.
3. Auth và kiểm tra quyền.
4. Project và Task.
5. Dashboard và UI theo mock.
6. Test quyền truy cập và luồng chính; build app.
7. Chạy Nginx native, kiểm tra Docker, deploy tay, rồi bật CI/CD app.
