# MiniFlow frontend

Frontend dùng API thật cho auth, Project, Task và Dashboard. Phiên đăng nhập nằm trong cookie httpOnly; dữ liệu lưu PostgreSQL, giữ nguyên sau refresh hoặc đăng nhập lại. Giao diện có loading, lỗi/retry, trạng thái trống và modal hỗ trợ bàn phím.

## Chạy frontend

Từ thư mục gốc, cài dependency bằng `npm ci`, cấu hình env và khởi động PostgreSQL/backend theo [README](../README.md). Copy `frontend/.env.example` sang `frontend/.env.local`, sau đó:

```bash
npm run dev:frontend
```

Mở http://localhost:3000. `NEXT_PUBLIC_API_URL=/api` dùng proxy Next đến `BACKEND_API_URL=http://127.0.0.1:3001/api`; backend cần `FRONTEND_ORIGIN=http://localhost:3000`. Đăng ký tài khoản mới với mật khẩu ít nhất 8 ký tự và tối đa 72 byte UTF-8.

## Kiểm tra

```bash
npm run lint --workspace frontend
npm run typecheck --workspace frontend
node --test frontend/test/api.test.mjs
npm run build --workspace frontend -- --webpack
```

Review trình duyệt với backend và PostgreSQL development đang chạy:

```bash
npm install --prefix /tmp/miniflow-review-tools --no-package-lock playwright
node /tmp/miniflow-review-tools/node_modules/playwright/cli.js install chromium
MINIFLOW_PLAYWRIGHT_MODULE=/tmp/miniflow-review-tools/node_modules/playwright/index.mjs node frontend/test/api-browser-review.mjs
```

Playwright và Chromium cài riêng cho công cụ review, không thêm vào dependency app. Có thể đặt `MINIFLOW_BASE_URL` (mặc định `http://localhost:3000`) và `MINIFLOW_REVIEW_ARTIFACTS` (mặc định `/tmp/miniflow-review/artifacts`). Runner tạo hai tài khoản `@example.test` riêng mỗi lần và để lại dữ liệu review trong DB development; không chạy với production.

Review API thật kiểm tra đăng ký, tạo Project/Task, đổi trạng thái, refresh, Dashboard, cách ly tài khoản, logout/đăng nhập lại, API 401 và không tràn ngang ở 320/390/768/1440px. Script `browser-review.mjs` cũ là kịch bản lịch sử cho frontend demo, không dùng nghiệm thu phiên bản API thật.

Dashboard hiển thị ba Project gần nhất và tối đa năm Task mới nhất chưa hoàn thành. Scope hiện tại chưa có sửa/xóa Project/Task hoặc phân công Task.
