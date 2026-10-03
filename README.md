# MiniFlow

Mini app quản lý Project và Task để luyện Linux, Nginx, Docker và CI/CD.

**Trạng thái: frontend đã nối backend và PostgreSQL thật.** Đăng ký/đăng nhập dùng cookie httpOnly và Session DB; Project/Task/Dashboard dùng API, dữ liệu còn sau refresh và đăng nhập lại. Đã review trình duyệt với hai tài khoản, logout, xử lý API 401 và mobile. Xem [hướng dẫn frontend](frontend/README.md), [flow backend](docs/backend-plan.md) và [hướng dẫn backend](backend/README.md). Docker image và hành trình production local đã nghiệm thu; bộ script Ubuntu/Nginx/deploy/backup/restore/rollback và CI/CD đã có. Triển khai VPS thật theo [hướng dẫn từng bước](docs/deployment.md) và [plan hạ tầng](docs/operations-plan.md).

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

## Chạy frontend demo

```bash
npm run dev:frontend
```

Mở http://localhost:3000; không cần backend/database. Phiên và dữ liệu demo mất khi tải lại hoặc đăng xuất.

## Cài package khi bắt đầu code backend

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

Sau khi chỉnh env và khởi động PostgreSQL:

```bash
npm run db:generate
npm run db:migrate
npm run dev:frontend
# Terminal khác:
npm run dev:backend
```

Frontend: `localhost:3000`. Backend: `localhost:3001`, prefix `/api`. Health: `GET /api/health`, kiểm tra kết nối DB, HTTP 200 khi sẵn sàng và 503 khi không sẵn sàng.

## Tài liệu

- [Kiến trúc và cấu trúc feature](docs/architecture.md)
- [API backend đã triển khai](docs/api.md)
- [Biến môi trường và package](docs/configuration.md)
- [Docker, Nginx, VPS và CI/CD](docs/deployment.md)
- [Lộ trình thuê Ubuntu VPS, Nginx và CI/CD](docs/operations-plan.md)
- [Thiết kế mock](mock/MiniFlow-Mock-Design.md)

Frontend đã đạt lint, typecheck, test, review trình duyệt và production build bằng webpack. Kết quả từng flow backend được ghi trong [plan backend](docs/backend-plan.md). Ba Docker image và review production local (Nginx HTTPS, migration, restart, backup/restore, rollback) đạt. VPS, DNS/certificate công khai, backup remote và CD thật cần nghiệm thu sau khi có hạ tầng; xem [deployment](docs/deployment.md).
