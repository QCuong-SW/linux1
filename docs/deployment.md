# Docker, Nginx và deploy

Đây là hướng dẫn và cấu hình chuẩn bị. Chưa build image, chạy server, migration hay deploy. Hoàn thành app và kiểm tra luồng chính trước khi làm các bước bên dưới.

## Development

Compose mặc định chỉ chạy PostgreSQL 17. Next/Nest chạy native để luyện process, port và log Linux. DB chỉ bind `127.0.0.1:5432`. Volume dev và production tách riêng.

## Production

```text
Internet :80/:443
       ↓
Nginx trên host Ubuntu
       ├── /      → 127.0.0.1:3000 → Next container
       └── /api/  → 127.0.0.1:3001 → Nest container
                                           ↓
                                     postgres:5432
```

Nginx nằm trên host để luyện systemctl và log. Production Compose không publish port PostgreSQL; frontend/backend chỉ publish trên loopback. Compose có network mặc định, không cần đặt network riêng cho stack nhỏ.

Dockerfile frontend có dependency/build/runtime stages, dùng Next standalone. Backend có build/runtime và migration target. Runtime chạy user `node`. Prisma CLI nằm trong migration image; migration chạy xong trước khi backend khởi động. Healthcheck frontend dùng `/login`, backend dùng `/api/health`, DB dùng `pg_isready`.

## Deploy tay sau khi app hoàn thành

1. Cài Docker Engine + Compose, Nginx, Git và curl trên VPS Ubuntu.
2. Clone repo vào `/opt/miniflow`, user deploy có quyền thư mục và chạy Docker. Nếu repo private, cấu hình deploy key read-only để VPS fetch được GitHub.
3. Copy `.env.production.example` thành `.env.production`, đổi DB password, JWT secret, origin và domain. Không commit env thật.
4. Chạy từ root repo:

```bash
bash infra/scripts/deploy.sh
```

Script build image, chạy DB, tạo lại migration container để apply migration mới, khởi động app, chờ healthcheck và kiểm tra health HTTP. Script dừng ngay nếu build, migration hoặc health thất bại; không tự rollback database.

5. Copy `infra/nginx/miniflow.http.conf` vào `/etc/nginx/sites-available/miniflow`, thay domain rồi symlink sang sites-enabled. Chọn một config Miniflow đang hoạt động, không bật cả HTTP và HTTPS cùng lúc.
6. Kiểm tra và reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

7. Trỏ DNS domain về VPS, cấp chứng chỉ bằng Certbot; sau khi certificate tồn tại, dùng config HTTPS với domain/path chứng chỉ tương ứng. Thiết lập và kiểm tra tự động renew certificate.
8. Kiểm tra trang login, đăng ký/đăng nhập, CRUD trong scope, `/api/health` và proxy qua domain.

`proxy_pass http://127.0.0.1:3001` không có slash cuối nên giữ nguyên `/api/`. Nest phải đặt global prefix `api` để khớp.

## CI/CD

CI hiện chạy install với `--ignore-scripts` và format check, kiểm tra bộ khung config. Job app đang tắt khi GitHub variable `APPLICATION_READY` chưa bằng `true`; không tuyên bố build/test pass khi chưa có source.

Sau khi code, test, build và deploy tay chạy được:

- Bật repository variable `APPLICATION_READY=true`.
- Job app chạy install → Prisma generate → lint → typecheck → unit test → build.
- Test CI hiện dự kiến là unit test không cần DB. Khi thêm integration test, thêm PostgreSQL service, env và migration tương ứng vào CI.
- Deploy tự chạy sau CI thành công cho push vào `main`, checkout đúng SHA đã qua CI. Cũng có manual dispatch trên main; lần chạy tay dành cho commit đã được kiểm tra.
- Workflow dùng GitHub environment `production`; thiết lập approval protection nếu quy trình của repo cần.

GitHub environment/repository secrets cần cấu hình:

| Secret          | Nội dung                                      |
| --------------- | --------------------------------------------- |
| SERVER_HOST     | IP/hostname VPS                               |
| SERVER_USER     | User SSH deploy                               |
| SSH_PRIVATE_KEY | Private key tương ứng public key trên VPS     |
| SSH_KNOWN_HOSTS | Dòng known_hosts đã đối chiếu fingerprint VPS |

VPS dùng SSH port 22 và repo ở `/opt/miniflow` theo template; chỉnh cấu hình nếu môi trường khác. Deploy yêu cầu working tree sạch, fetch main rồi checkout detached SHA. Không sửa tracked file trực tiếp trên VPS.

## Debug

```bash
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml logs --tail=100 backend
docker compose --env-file .env.production -f compose.production.yaml logs --tail=100 migrate
sudo systemctl status nginx
sudo tail -n 100 /var/log/nginx/error.log
curl -i http://127.0.0.1:3001/api/health
```

## Giới hạn phiên bản đầu

Deploy rebuild trên VPS, có thể có downtime ngắn. Chưa có zero-downtime rollout hoặc tự rollback. Trước khi thay schema production cần backup DB và kiểm tra migration. Nếu rollback code, migration đã apply vẫn tồn tại; không xóa volume để rollback. Quy trình backup/restore sẽ thực hành ở bước VPS.
