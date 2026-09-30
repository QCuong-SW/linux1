# MiniFlow — mock giao diện

Mock để review UI và luồng trước khi triển khai Next.js/NestJS. Không có backend, database hay xác thực thật. Dữ liệu chỉ tồn tại trong bộ nhớ, tải lại trang sẽ khôi phục mẫu.

## Xem mock

Mở `mock/index.html` trực tiếp bằng trình duyệt, hoặc từ thư mục gốc repo chạy:

```bash
python3 -m http.server 8080 --directory mock
```

Sau đó truy cập http://localhost:8080.

Font Google là tùy chọn; khi offline giao diện dùng font hệ thống.

## Luồng review

1. Dashboard: tổng Project, số Task theo trạng thái, tiến độ từng Project.
2. Projects: danh sách và form tạo Project.
3. Project detail: tạo Task với tên/mô tả, đổi trạng thái bằng dropdown, lọc theo trạng thái.
4. Login/Register: mở qua link trên thanh đầu trang hoặc nút đăng xuất ở sidebar. Submit form chỉ chuyển vào dashboard mẫu.
5. Tạo một Project mới để xem trạng thái chưa có Task. Thu nhỏ trình duyệt để kiểm tra mobile.

## Quy ước để triển khai sau khi chốt

- Mỗi user sở hữu các Project của mình; chưa có thành viên, lời mời hay phân công Task.
- Dashboard lấy số liệu từ Project/Task, không cần bảng riêng.
- Task mới luôn bắt đầu ở TODO. Nhãn giao diện: Cần làm / Đang làm / Hoàn thành.
- Đây là artifact review độc lập. App thật sẽ theo cấu trúc feature đã chốt; không đưa file mock vào production.
- Chưa quyết định cơ chế auth qua mock này.
