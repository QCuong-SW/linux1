# Tiến độ MiniFlow

Cập nhật 2026-10-03:

- Linux, Git trên Linux: hoàn thành phần nền tảng.
- Frontend, backend, PostgreSQL và kết nối API: đã hoàn thành, review local đạt.
- PR #4: đang nghiệm thu CI; sửa lỗi DATABASE_URL trong production review.
- VPS Ubuntu, DNS, Nginx và HTTPS công khai: chưa nghiệm thu trên máy thật.
- Backup ngoài VPS, restore, cảnh báo và rollback giữa hai phiên bản: cần nghiệm thu trước khi bật CD.

## Thứ tự triển khai

1. Rà soát, commit/push PR #4; CI xanh mới merge.
2. Chốt ngân sách, thuê VPS Ubuntu, cấu hình SSH key và DNS. Có thể cân nhắc sslip.io khi thực hành domain; vẫn cần VPS chạy ứng dụng.
3. Thiết lập user deploy, firewall, Docker/Compose, Nginx và thư mục app; kiểm tra SSH/reboot.
4. Cấp certificate Let's Encrypt, kiểm tra redirect và gia hạn.
5. Deploy tay, migration, health, đăng ký/đăng nhập và Project/Task qua domain; reboot giữ dữ liệu.
6. Backup ngoài VPS, restore bản copy, cảnh báo downtime/disk/RAM và rollback giữa hai phiên bản thực.
7. Cấu hình GitHub secrets/deploy key; bật DEPLOY_ENABLED khi các bước trước đạt; xác nhận deploy đúng SHA qua CI.
8. Cập nhật tài liệu theo bằng chứng nghiệm thu.

Chi tiết tại [hướng dẫn triển khai](../docs/deployment.md) và [tiến độ vận hành](../docs/operations-plan.md). Mock trong thư mục này vẫn là artifact giao diện độc lập; ứng dụng thật nằm trong frontend/backend.
