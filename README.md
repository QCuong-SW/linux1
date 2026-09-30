# MiniFlow

Mini app quản lý Project và Task để luyện Linux, Nginx, Docker và CI/CD.

**Trạng thái: bộ khung kiến trúc và cấu hình. Chưa có code ứng dụng.** Mock nằm trong `mock/`; frontend/backend chưa chạy hoặc build được. Prisma chưa có model/migration. Dockerfile và pipeline app là cấu hình chuẩn bị cho bước triển khai sau.

## Cấu trúc

```text
miniflow/
├── frontend/                 Next.js, TypeScript, Tailwind
│   ├── src/app/              Route và layout
│   ├── src/features/         auth, project, task, dashboard
│   ├── src/shared/           UI và tiện ích dùng chung
│   └── public/               Asset tĩnh
├── backend/                  NestJS, TypeScript, Prisma
│   ├── src/modules/          auth, users, projects, tasks, dashboard, health
│   ├── src/common/           guard, decorator, filter, interceptor
│   ├── src/database/prisma/  Prisma service và client generated
│   ├── src/config/           Đọc và kiểm tra env
│   ├── prisma/               Schema và migration
│   └── test/                 Integration / end-to-end test
├── infra/
│   ├── nginx/                Reverse proxy HTTP và HTTPS trên host
│   └── scripts/              Script deploy trên VPS
├── .github/workflows/        CI và deploy qua SSH
├── docs/                     Kiến trúc, env và hướng dẫn deploy
├── mock/                     Mock giao diện đã review
├── compose.yaml              PostgreSQL cho development
├── compose.production.yaml   Frontend, backend, DB và migration
└── package.json              npm workspaces và lệnh chung
```

Node.js 24, npm 11. Hai package độc lập, dùng chung một `package-lock.json`; chạy npm từ thư mục gốc. Không thêm công cụ quản lý monorepo khác.

## Cài package khi bắt đầu code

```bash
nvm use
npm ci
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Chỉnh env trước khi sử dụng. Password database trong root `.env` và `backend/.env` phải khớp nhau.

```bash
docker compose up -d postgres
```

Sau khi có route Next, entrypoint Nest và model Prisma:

```bash
npm run db:generate
npm run db:migrate
npm run dev:frontend
# Terminal khác:
npm run dev:backend
```

Frontend: `localhost:3000`. Backend: `localhost:3001`, prefix `/api`. Health contract dự kiến: `GET /api/health`, kiểm tra kết nối DB, HTTP 200 khi sẵn sàng và 503 khi không sẵn sàng.

## Tài liệu

- [Kiến trúc và các file sẽ viết](docs/architecture.md)
- [Biến môi trường và package](docs/configuration.md)
- [Docker, Nginx, VPS và CI/CD](docs/deployment.md)
- [Thiết kế mock](mock/MiniFlow-Mock-Design.md)

Hiện chỉ kiểm tra cấu hình; chưa thể xác nhận app build, Docker image hoặc deployment hoạt động cho đến khi có code ứng dụng.
