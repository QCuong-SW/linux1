# Triển khai MiniFlow trên Ubuntu

Bộ này giữ Nginx native, Next/Nest/PostgreSQL trong Docker Compose và build image trên VPS. Không cần Kubernetes, registry hoặc công cụ quản lý hạ tầng bổ sung. Image được gắn tag theo Git SHA; script đủ ngắn để đọc và sửa từng bước.

```text
Domain → Nginx Ubuntu :443
           ├── /     → 127.0.0.1:3000 → Next
           └── /api/ → 127.0.0.1:3001 → Nest → PostgreSQL
```

PostgreSQL production không publish port. App chỉ bind loopback. DB development và production có project/volume riêng. Docker log giới hạn 3 file × 10 MB mỗi container; bootstrap giới hạn journal 200 MB.

## 1. Chuẩn bị code và VPS

Commit/push code và đảm bảo CI xanh trước khi triển khai. VPS mới dùng Ubuntu 24.04 LTS, SSH port 22 theo workflow; build trên VPS nên bắt đầu với khoảng 4 GiB RAM và đo tài nguyên thực tế. Thuê máy/domain và cấu hình thanh toán là bước thực hiện trong tài khoản của bạn.

Trỏ DNS A của `app.your-domain.com` về IPv4 VPS. Chỉ thêm AAAA khi đã cấu hình IPv6. Mở SSH, 80 và 443 trên firewall của nhà cung cấp.

Tạo key deploy riêng trên máy cá nhân:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/miniflow_deploy -C miniflow-deploy
scp infra/scripts/setup-vps.sh ~/.ssh/miniflow_deploy.pub root@VPS_IP:/tmp/
ssh root@VPS_IP
bash /tmp/setup-vps.sh --fresh-vps /tmp/miniflow_deploy.pub
```

Script cài Docker từ repository chính thức, Compose, Nginx, UFW, Fail2ban, Certbot, cập nhật bảo mật tự động; tạo user `deploy`, thư mục `/opt/miniflow` và thêm public key. Nó cho phép SSH port đang cấu hình trước khi bật UFW. User deploy có Docker và sudo không mật khẩu để thực hành quản trị; key này có quyền quản trị máy và cần được bảo vệ tương ứng. Bootstrap dành cho VPS mới, không chạy trên laptop hoặc máy có dịch vụ khác.

Giữ phiên root đang mở. Mở terminal thứ hai:

```bash
ssh -i ~/.ssh/miniflow_deploy deploy@VPS_IP
sudo -n true
docker compose version
```

Sau khi kiểm tra key/sudo/Docker thành công, clone repo bằng user deploy:

```bash
git clone https://github.com/QCuong-SW/linux1.git /opt/miniflow
cd /opt/miniflow
git checkout main
sudo bash infra/scripts/harden-ssh.sh --deploy-login-verified
```

Repo private: cấu hình GitHub deploy key read-only riêng trên VPS rồi clone qua SSH. Key VPS → GitHub khác key GitHub Actions → VPS. Đối chiếu host key của VPS qua console nhà cung cấp; không coi riêng `ssh-keyscan` là bằng chứng tin cậy. Giữ phiên SSH cũ đến khi mở được phiên deploy mới sau hardening.

## 2. Secrets và HTTPS

Tạo env production bằng user deploy, không in secrets:

```bash
cd /opt/miniflow
bash infra/scripts/init-env.sh app.your-domain.com
mkdir -p .miniflow
chmod 700 .miniflow
cp infra/operations.env.example .miniflow/operations.env
chmod 600 .miniflow/operations.env
nano .miniflow/operations.env
```

Thay `MINIFLOW_PUBLIC_URL` bằng domain thật. File operations dùng literal `KEY=value`, không có quote hoặc shell expansion; các biến môi trường truyền trực tiếp có ưu tiên cao hơn. `.env.production` chứa DB password/JWT secret mode 600. Generator từ chối ghi đè file đã tồn tại. Không chỉ đổi `POSTGRES_PASSWORD` trong env để đổi password của DB đã khởi tạo; cần đổi role PostgreSQL và URL tương ứng.

Sau khi DNS đúng và cổng 80/443 mở:

```bash
sudo bash infra/scripts/setup-nginx.sh app.your-domain.com your-email@example.com
```

Script bật HTTP phục vụ ACME, xin certificate qua Certbot webroot, kiểm tra rồi bật config HTTPS và chạy `certbot renew --dry-run`. Hook renew kiểm tra config và reload Nginx. Có thể chỉ truyền domain để dựng HTTP trước. Trước khi app chạy, `/` có thể trả 502; đây chưa phải nghiệm thu app. Đăng nhập chỉ dùng HTTPS.

Nginx giữ nguyên prefix `/api/` khi proxy đến Nest. Image frontend cũng có proxy `/api` đến `backend:3001`, nên cả truy cập qua Nginx lẫn smoke test nội bộ đều hoạt động.

## 3. Deploy tay

```bash
cd /opt/miniflow
bash infra/scripts/deploy.sh
```

Thứ tự: kiểm tra working tree sạch/env → khóa deploy → build ba image theo SHA → đợi DB healthy → backup → chạy migration đến khi exit → khởi động app và đợi healthy → kiểm tra `/login`, `/api/health` qua frontend và domain HTTPS → ghi release thành công.

Migration được chạy bằng `docker compose run --rm --no-deps`; script nhận exit code thật và dừng trước bước thay app khi migration lỗi. Không tự rollback schema. Deploy hoặc rollback lỗi sẽ không cập nhật `current-release`; xem log vì app có thể đã được thay nếu lỗi xảy ra ở health/smoke test.

```bash
cat .miniflow/current-release
cat .miniflow/previous-release
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml logs --tail=100 backend frontend
curl --fail https://app.your-domain.com/api/health
```

Kiểm tra đăng ký → tạo Project/Task → đổi trạng thái → refresh → logout/đăng nhập lại qua domain. Sau đó reboot VPS, kiểm tra SSH, container, Nginx, certificate và dữ liệu. Container có `restart: unless-stopped`; Docker/Nginx được enable trên host. Không dùng `down -v` với production.

## 4. Backup, restore và rollback

Backup tay:

```bash
bash infra/scripts/backup.sh
```

Archive custom-format và SHA-256 nằm ở `.miniflow/backups`, mode riêng tư; file chỉ đổi từ `.partial` sang `.dump` sau khi `pg_dump` thành công. Backup được chạy trước mỗi migration, kể cả DB trống lần đầu. Không tự xóa backup hoặc image cũ.

Để copy ngoài VPS, tạo thư mục đích trên máy backup/NAS, cấu hình SSH key và xác minh host key, rồi đặt trong `.miniflow/operations.env`:

```text
MINIFLOW_BACKUP_REMOTE=backup@backup-host:/srv/backups/miniflow/
```

`rsync` dùng BatchMode/StrictHostKeyChecking; lỗi copy làm job backup lỗi. Backup local không thay thế bản sao ngoài VPS. Dọn các archive đã hết hạn sau khi xác nhận bản sao ngoài máy và giữ ít nhất các bản phục vụ rollback; kiểm tra dung lượng thường xuyên.

Restore diễn tập vào DB MỚI:

```bash
bash infra/scripts/restore.sh /path/to/backup.dump rehearsal_restore_test
```

Tên DB phải kết thúc `_restore_test`; script từ chối DB hiện có và DB ứng dụng. Kiểm tra checksum nếu có, restore nguyên tử và in số Project/Task. DB diễn tập giữ lại để kiểm tra; DB production không bị ghi đè. Với sự cố thật, restore vào DB mới, kiểm tra đầy đủ rồi lên kế hoạch chuyển `DATABASE_URL`, không sửa script để đè production.

Rollback app sau khi review code cũ tương thích schema hiện tại:

```bash
bash infra/scripts/rollback.sh --schema-compatible
# Hoặc chọn image đã giữ:
bash infra/scripts/rollback.sh --schema-compatible GIT_SHA
```

Mặc định dùng `previous-release`. Nếu deploy mới thất bại trước khi ghi release, chọn SHA trong `current-release` để quay về bản đã biết chạy tốt. Script kiểm tra image tồn tại, thay frontend/backend, kiểm tra health/HTTPS rồi ghi release. Không checkout source, build lại, chạy migration cũ hoặc xóa volume. Giữ image đang chạy và image rollback; không chạy prune toàn bộ theo lịch.

## 5. Lịch chạy và giám sát

```bash
sudo bash infra/scripts/install-timers.sh
sudo systemctl start miniflow-backup.service miniflow-health.service
systemctl list-timers 'miniflow-*'
journalctl -u miniflow-backup.service -u miniflow-health.service --since today
```

Backup chạy hằng ngày khoảng 03:00 UTC, có chạy bù khi máy khởi động lại. Health chạy mỗi 5 phút: trạng thái DB/app, proxy, HTTPS, disk ≥85%, RAM ≥90%, backup local/bản sao remote quá 30 giờ. Ngưỡng chỉnh trong operations.env. Service lỗi có trạng thái failed và log trong journal.

Có thể đặt `MINIFLOW_ALERT_WEBHOOK` là HTTPS webhook nhận JSON `{"text":"..."}`; systemd gọi notify khi backup/health thất bại. Nếu không đặt, chỉ ghi log. Cần monitor từ ngoài VPS cho `/api/health` để phát hiện cả trường hợp máy mất điện hoặc mất mạng; kiểm tra nội bộ không báo được khi chính VPS đã dừng. Webhook và backup remote cần nghiệm thu trên dịch vụ thật sau khi cấu hình.

## 6. GitHub CI/CD

CI trên PR/main: format → ShellCheck/test script → Prisma generate/migrate với PostgreSQL test → lint/typecheck → backend unit/HTTP/DB + frontend test → build app/image → review container production (backup/restore, rollback, migration lỗi, Nginx/TLS). Artifact log giữ 7 ngày; secrets test nằm ngoài artifact.

Sau khi deploy tay, HTTPS, reboot và backup remote/restore đã nghiệm thu, cấu hình environment `production` trên GitHub:

| Loại     | Tên             | Giá trị                                  |
| -------- | --------------- | ---------------------------------------- |
| Secret   | SERVER_HOST     | IPv4/hostname VPS                        |
| Secret   | SERVER_USER     | deploy                                   |
| Secret   | SSH_PRIVATE_KEY | Private key deploy riêng                 |
| Secret   | SSH_KNOWN_HOSTS | known_hosts đã đối chiếu fingerprint VPS |
| Variable | PRODUCTION_URL  | https://app.your-domain.com              |
| Variable | DEPLOY_ENABLED  | true                                     |

Deploy chỉ nhận push main có CI thành công, cùng repository, đúng SHA. Workflow khóa deploy song song, bỏ CI run cũ nếu main đã tiến thêm, kiểm tra working tree sạch trên VPS, fetch/checkout SHA rồi chạy script. Env production giữ trên VPS. Repo private cần deploy key để fetch. Không có manual dispatch vượt CI.

Đây là deploy có downtime ngắn, không có rollout zero-downtime hoặc auto rollback. Không bật DEPLOY_ENABLED trước khi các điều kiện trên đạt.

## 7. Chạy lại kiểm tra local

```bash
for script in infra/scripts/*.sh; do bash -n "$script"; done
shellcheck -x infra/scripts/*.sh
node --test infra/test/scripts.test.mjs
docker build -f backend/Dockerfile --target migration -t miniflow-migration:ci .
docker build -f backend/Dockerfile --target runner -t miniflow-backend:ci .
docker build -f frontend/Dockerfile --target runner -t miniflow-frontend:ci .
node infra/test/production-review.mjs --image-tag ci
```

Runner tạo project/volume riêng, port 13000/13001/18080/18443, certificate local, dữ liệu test và env ngẫu nhiên; kết thúc sẽ dọn đúng container/volume do nó tạo. Không tác động Compose development. Có thể đổi port bằng `MINIFLOW_REVIEW_PORT`, `MINIFLOW_REVIEW_API_PORT`, `MINIFLOW_REVIEW_HTTP_PORT`, `MINIFLOW_REVIEW_HTTPS_PORT`. Log ở `/tmp/miniflow-production-review`. Diễn tập rollback dùng hai tag của cùng bản code; tương thích schema giữa hai phiên bản thực cần review riêng.

## Nguồn kỹ thuật

Cài Docker theo [hướng dẫn Ubuntu chính thức](https://docs.docker.com/engine/install/ubuntu/). Migration one-off dùng [Compose run](https://docs.docker.com/reference/cli/docker/compose/run/). Backup/restore dựa trên [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html) và [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html). Theo dõi nghiệm thu hạ tầng thật tại [operations plan](operations-plan.md).
