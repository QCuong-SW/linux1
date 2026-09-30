# MiniFlow frontend

Flow 01 đã có khung giao diện và điều hướng. Các màn hình hiện là placeholder; chưa có dữ liệu, form auth hoặc kết nối backend.

## Chạy riêng frontend

Từ thư mục gốc, nếu đã cài dependency:

```bash
npm run dev:frontend
```

Mở http://localhost:3000. Không cần chạy backend hoặc database.

Nếu chỉ cài dependency cho frontend trong giai đoạn này, dùng lệnh sau để giữ nguyên package và lockfile ở root:

```bash
npm install --prefix frontend --workspaces=false --package-lock=false
```

## Review flow 01

- `/` chuyển đến `/dashboard`.
- Menu Dashboard và Projects chuyển route và đánh dấu trang đang chọn.
- Mở `/projects/demo` để xem khung chi tiết; Projects vẫn được đánh dấu trên menu và có link quay lại.
- Link Xem đăng nhập mở `/login`; chuyển qua `/register` và quay lại workspace bằng link.
- Thu nhỏ về mobile: menu ở đầu trang, nội dung và card auth vừa màn hình.
- Dùng Tab để kiểm tra focus và link Đến nội dung chính.

Chưa có tài khoản hay phiên demo ở flow này. Nội dung các màn hình sẽ được hoàn thiện lần lượt theo [plan frontend](../docs/frontend-plan.md).

## Kiểm tra riêng frontend

```bash
npm run lint --prefix frontend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```
