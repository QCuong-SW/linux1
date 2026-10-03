# MiniFlow backend

NestJS, package by feature. Tiến độ tại [flow backend](../docs/backend-plan.md).

## Chạy từ root

```bash
npm ci
cp backend/.env.example backend/.env
```

Chỉnh `DATABASE_URL` và thay `JWT_SECRET` bằng secret ngẫu nhiên ít nhất 32 ký tự (có thể tạo bằng `openssl rand -hex 32`). Backend từ chối secret placeholder. Password DB phải khớp root `.env`. PostgreSQL chạy bằng Docker; backend development chạy trên host:

```bash
docker compose up -d --wait postgres
npm run db:generate
npm run db:deploy
npm run dev:backend
```

`GET http://localhost:3001/api/health` trả `{ "status": "ok", "database": "up" }` với HTTP 200 nếu truy vấn DB thành công; HTTP 503 và `{ "status": "error", "database": "down" }` nếu DB chưa sẵn sàng. Health dùng cùng Prisma service với các feature. Backend đã có auth thật, API Project/Task/Dashboard và schema User/Session/Project/Task. Xem [hợp đồng API](../docs/api.md); frontend hiện vẫn dùng demo.

Volume `postgres_dev_data` giữ schema và dữ liệu qua stop/start. Dừng bằng `docker compose stop postgres`; không xóa volume nếu muốn giữ dữ liệu. Chỉ mở DB tại `127.0.0.1:5432`.

Migration đầu tiên đã nằm trong `prisma/migrations`. Khi thay schema ở các flow sau, tạo migration mới với `npm run prisma:migrate --workspace backend -- --name ten_thay_doi`; chạy `npm run db:generate` sau thay đổi schema. Không chỉnh migration đã áp dụng.

## Kiểm tra

```bash
npm run lint --workspace backend
npm run typecheck --workspace backend
npm test --workspace backend -- --runInBand
npm run test:e2e --workspace backend -- --runInBand
npm run build --workspace backend
```

## Integration test PostgreSQL thật

Từ root, chuẩn bị database test riêng một lần:

```bash
cp backend/test/.env.example backend/.env.test
docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE miniflow_test"'
node --env-file=backend/.env.test node_modules/prisma/build/index.js migrate deploy --config backend/prisma.config.ts
npm run test:db --workspace backend
```

Sửa credentials trong `.env.test` nếu dùng password khác. Test chỉ chấp nhận `TEST_DATABASE_URL` có tên DB kết thúc bằng `_test`; test schema chạy trong transaction và rollback; test hành trình HTTP tạo fixture có email UUID riêng và xóa sau suite. Database test đã tồn tại thì bỏ bước CREATE DATABASE. Test kiểm tra schema/Session và toàn hành trình API: auth, quyền hai tài khoản, validation/Origin, tạo/lọc/đổi trạng thái Task, thống kê, logout/hết phiên và dữ liệu/phiên sau khi backend khởi động lại.

Test HTTP dùng DB probe giả để kiểm tra contract và cấu hình app. Các lệnh test DB/HTTP có thể cần quyền truy cập localhost trong môi trường sandbox.

## Phiên đăng nhập và API

Đăng ký tự đăng nhập. Cookie `miniflow_session` là httpOnly, SameSite=Lax, Path=/, Secure khi NODE_ENV=production; tuổi thọ theo JWT_EXPIRES_IN (mặc định 1d). JWT và Session DB phải cùng hợp lệ. Logout thu hồi Session; tải lại trang gọi `/api/auth/me` để lấy User. Phiên hết hạn cần đăng nhập lại, không tự refresh token.

POST/PATCH yêu cầu header `Origin` khớp chính xác FRONTEND_ORIGIN, kể cả gọi từ curl/Postman. GET nghiệp vụ yêu cầu cookie. Browser gửi `credentials: 'include'`. Không gửi ownerId, không đọc JWT bằng JavaScript. Đăng ký/đăng nhập nhận email + password tối thiểu 8 ký tự, tối đa 72 byte UTF-8. Chi tiết payload và mã lỗi tại [API](../docs/api.md).

Session hết hạn được dọn cho tài khoản khi đăng nhập lại; chúng luôn bị guard từ chối dù còn trong bảng. Dữ liệu Project/Task lưu PostgreSQL và còn sau logout, restart app hoặc restart DB với volume giữ nguyên.
