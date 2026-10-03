# Lộ trình Ubuntu VPS, Nginx và CI/CD

Ngày lập: 2026-10-01; cập nhật triển khai 2026-10-03. Frontend/backend đã nối API và PostgreSQL thật. Bộ Docker và script vận hành đã được triển khai, kiểm tra local; chưa thuê VPS hoặc thay đổi dịch vụ bên ngoài. Hướng dẫn chạy từng bước tại [deployment](deployment.md).

## Kiến trúc triển khai

```text
Domain → Ubuntu VPS :80/:443 → Nginx trên host
                                ├── /     → 127.0.0.1:3000 → Next container
                                └── /api/ → 127.0.0.1:3001 → Nest container
                                                              ↓
                                                      PostgreSQL container
                                                      volume production
```

Giữ Nginx native để học systemctl, reverse proxy, log và TLS. App và PostgreSQL chạy Docker Compose production. DB không publish port; app chỉ bind loopback. Frontend dùng `/api`, backend prefix `api`, origin là `https://DOMAIN`. Khi đã nối auth, frontend và API cùng origin.

## Phương án thuê VPS

Đề xuất khởi đầu: DigitalOcean Basic Regular, Singapore, Ubuntu Server 24.04 LTS x86_64, 2 vCPU / 4 GiB RAM / 80 GiB SSD, giá niêm yết **24 USD/tháng**. Chọn 4 GiB vì script hiện build Next/Nest ngay trên VPS; đây là dự trù kỹ thuật, không phải cam kết đủ RAM cho mọi lần build. Ubuntu 24.04 vẫn trong kỳ hỗ trợ tiêu chuẩn. Nguồn: [giá Droplet](https://www.digitalocean.com/pricing/droplets), [region](https://docs.digitalocean.com/platform/regional-availability/), [Ubuntu release cycle](https://ubuntu.com/about/release-cycle).

Phương án tiết kiệm: 1 vCPU / 2 GiB / 50 GiB, **12 USD/tháng**, khi chuyển build image sang GitHub Actions rồi VPS chỉ pull/run. Cần đo RAM của Next + Nest + PostgreSQL trước khi chọn; swap chỉ hỗ trợ, không thay RAM. Giá tham khảo tại ngày lập, chưa gồm thuế, domain, backup/snapshot, storage bổ sung hoặc băng thông vượt gói. Kiểm tra giá cuối cùng trên màn hình thanh toán.

Trước lúc mua, chốt ngân sách và domain/subdomain. Có thể dùng subdomain của domain đã sở hữu. Không cần mua managed database hoặc load balancer cho bài này. Làm CI và kiểm tra image trên máy hiện tại trước để giảm thời gian thuê máy chờ code.

Các bước thuê:

1. Tạo tài khoản nhà cung cấp, bật MFA và cấu hình thanh toán trong dashboard của nhà cung cấp.
2. Tạo SSH key riêng cho quản trị VPS; thêm public key vào dashboard. Không gửi private key hoặc thông tin thẻ vào chat.
3. Chọn đúng region, Ubuntu LTS, x86_64 và gói đã chốt; review tổng tiền rồi xác nhận thuê.
4. Ghi lại IPv4, fingerprint SSH qua console nhà cung cấp; đặt tên máy `miniflow-prod`, bật cảnh báo chi phí.
5. Trỏ bản ghi A cho `app.DOMAIN` về IPv4; chỉ thêm AAAA khi IPv6 đã cấu hình và kiểm tra.

## Thứ tự flow

| Flow | Công việc                                | Hoàn thành khi                                                                                                                                      |
| ---- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| H01  | CI cho code hiện có và review Dockerfile | PR chạy format/lint/typecheck/unit test, frontend test, DB test với PostgreSQL service, generate/migration và build; kiểm tra được image production |
| H02  | Chốt ngân sách, thuê Ubuntu VPS và DNS   | Có máy, đăng nhập SSH key được, domain phân giải đúng IP                                                                                            |
| H03  | Chuẩn bị Ubuntu                          | User deploy, SSH, firewall, Docker Engine + Compose, Nginx, `/opt/miniflow`, log rotation và cập nhật bảo mật hoạt động                             |
| H04  | Nginx HTTP → HTTPS                       | Proxy đúng `/` và `/api/`, HTTP chuyển HTTPS, certificate renew dry-run đạt                                                                         |
| H05  | Deploy tay                               | Build → DB healthy → migration exit 0 → app healthy → kiểm tra qua domain; reboot VPS vẫn lên                                                       |
| H06  | CD sau CI                                | Commit đã qua CI được deploy đúng SHA; khóa deploy song song; secrets và host key đúng; thất bại dừng rollout                                       |
| H07  | Backup, rollback và vận hành             | Backup ngoài VPS, restore DB thử đạt, rollback code theo SHA chạy được, cảnh báo downtime/disk/RAM hoạt động                                        |

H01 làm được ngay, song song về tiến độ với backend nghiệp vụ. H02–H04 có thể làm trước khi app hoàn chỉnh. H05 có hai mốc: kiểm tra hạ tầng với frontend demo + health thật; nghiệm thu sản phẩm sau backend flow 03–07. Chỉ bật CD production khi deploy tay, HTTPS, backup và luồng cần đưa lên đã được kiểm tra. Mỗi flow được build/review riêng; bảng này chưa đánh dấu các bước hạ tầng là hoàn thành.

## H01 — CI và image

- `.github/workflows/ci.yml` chạy format và app job trên PR/main, không phụ thuộc cờ bật deploy.
- PostgreSQL service cho DB test dùng database riêng `miniflow_test`; đặt DATABASE_URL và TEST_DATABASE_URL cùng DB test, migrate deploy rồi chạy `test:db`. Env và secret trong CI chỉ là giá trị test.
- Giữ thứ tự install → Prisma generate → migration test → lint/typecheck → unit/frontend/HTTP/DB tests → build. Lệnh frontend test hiện là Node test, không dùng root `npm test` để suy ra frontend đã được test.
- Review format toàn repo; chỉ sửa file thuộc phạm vi đã chốt. Không tự ghi đè thay đổi người dùng khi format job lỗi.
- Build kiểm tra Dockerfile frontend/backend/migration với env build giả, không đưa production secret vào image. Test `.env.production` không bị COPY vào image qua `.dockerignore`.
- Cờ `DEPLOY_ENABLED` chỉ điều khiển CD; CI chạy trên PR/main. Action hiện dùng tag v4; pin commit SHA khi hardening workflow.

## H03–H04 — Ubuntu và Nginx

- Cài Docker theo [hướng dẫn Ubuntu chính thức](https://docs.docker.com/engine/install/ubuntu/), gồm Compose plugin; cài Nginx trên host.
- Tạo user `deploy`, cấu hình quyền Docker theo nhu cầu quản trị. Docker group có quyền cao trên host; dùng key deploy riêng, không tái sử dụng key cá nhân.
- Mở 80/443; SSH giới hạn nguồn khi phù hợp. Giữ phiên SSH hiện tại và kiểm tra phiên mới trước khi thay đổi đăng nhập root/password. Kiểm tra cả cloud firewall và firewall host.
- Clone vào `/opt/miniflow`; nếu private repo, VPS dùng deploy key GitHub read-only. Key này khác key GitHub Actions SSH vào VPS.
- Copy `.env.production.example`, thay các placeholder; chmod 600, không in env trong CI log. Production database URL dùng host `postgres`, không dùng localhost.
- Dùng `infra/nginx/miniflow.http.conf` để bootstrap; chỉ bật một site MiniFlow. Giữ `proxy_pass` backend không có slash cuối để `/api/` còn nguyên, theo [Nginx proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).
- Trong lúc chưa có app, kiểm tra HTTP bằng trang tĩnh tạm thời; không coi 502 là deploy app thành công. Origin production vẫn cấu hình HTTPS.
- Cấp certificate sau khi DNS và cổng 80 hoạt động; cấu hình TLS theo [Certbot Nginx](https://certbot.eff.org/instructions?ws=nginx&os=snap). Review config HTTPS, `nginx -t`, reload, kiểm tra redirect và `certbot renew --dry-run`. Không đăng nhập bằng tài khoản thật trước HTTPS.

## H05–H06 — Deploy và CD

Giữ bước đầu build trên VPS bằng `infra/scripts/deploy.sh` để hiểu quy trình. Script hiện chờ migration hoàn tất bằng Compose run và kiểm tra exit code rõ ràng. Backup chạy trước migration; chỉ ghi SHA thành công sau khi app/HTTPS smoke test đạt. Image theo SHA được giữ để rollback code.

```text
PR → CI pass → merge main → CI pass đúng SHA
  → SSH VPS → checkout SHA → build images
  → PostgreSQL healthy → migration hoàn tất
  → backend/frontend healthy → smoke test HTTPS → ghi SHA thành công
```

Secrets hiện có: SERVER_HOST, SERVER_USER, SSH_PRIVATE_KEY, SSH_KNOWN_HOSTS. Xác minh fingerprint qua console nhà cung cấp trước khi thêm known_hosts; không dùng riêng kết quả ssh-keyscan làm bằng chứng tin cậy. Production env để trên VPS, không nhúng vào workflow.

Workflow tự deploy sau CI thành công khi `DEPLOY_ENABLED=true`, giới hạn đúng repo/main và giữ concurrency production. Manual dispatch đã bị bỏ để không vượt gate CI. Workflow và script đã có smoke test qua domain; vẫn cần xác nhận quy trình trên VPS thật.

Sau khi flow cơ bản ổn, chuyển sang GitHub Actions build → GHCR image tag theo SHA → VPS pull/deploy đúng image. Lúc đó cân nhắc VPS 2 GiB dựa trên số liệu thực. Không dùng tag `latest` làm định danh rollback.

## H07 — Vận hành

- Backup PostgreSQL bằng pg_dump, lịch tự động và bản sao ngoài VPS; volume/snapshot không thay thế quy trình restore đã kiểm tra.
- Restore vào database test riêng, không ghi đè production để diễn tập.
- Rollback code về SHA/image trước đã biết chạy tốt, kiểm tra tương thích schema; migration đã apply không tự mất khi rollback code. Ưu tiên migration tương thích code cũ/mới và sửa tiến khi cần.
- Kiểm tra restart/reboot, chứng chỉ, dung lượng disk, RAM, uptime và log Docker/Nginx. Chỉ dọn image đã xác định không cần, giữ image rollback và volume DB.

## Tiến độ hiện tại

Cập nhật 2026-10-03 theo yêu cầu hoàn thiện bộ triển khai gọn để tự thực hành lại:

| Flow | Đã chuẩn bị/kiểm tra                                                                                     | Còn nghiệm thu ngoài máy                                             |
| ---- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| H01  | Ba image build đạt; test script + review production container thật đạt; CI tích hợp các kiểm tra này     | PR #4 đang sửa lỗi DATABASE_URL trong production review              |
| H02  | Hướng dẫn chọn máy, SSH key và DNS                                                                       | Chốt ngân sách, thuê máy, domain/IP                                  |
| H03  | Bootstrap Ubuntu, deploy user, SSH, firewall, Docker, Nginx, log rotation và cập nhật bảo mật            | Chạy trên VPS mới; kiểm tra SSH và reboot                            |
| H04  | Hai template Nginx kiểm tra syntax; HTTPS, redirect và ACME đạt với certificate local                    | DNS thật, certificate Let's Encrypt và renew dry-run                 |
| H05  | Deploy local, migration exit gate, health/proxy, restart giữ dữ liệu/phiên đạt                           | Deploy/smoke qua domain thật và reboot VPS                           |
| H06  | Workflow chỉ deploy push main qua CI đúng SHA, chặn run cũ, có HTTPS smoke                               | Secrets/variables, deploy key, bật DEPLOY_ENABLED sau nghiệm thu tay |
| H07  | Backup/restore DB test, rollback image và health monitor đạt; timer, hook cảnh báo và rsync remote đã có | SSH backup remote, restore bản copy, webhook và monitor ngoài VPS    |

Bảy test bảo vệ script đạt: migration lỗi không thay app/release; backup lỗi không xuất archive hoàn chỉnh; restore từ chối tên DB production hoặc DB đã tồn tại; rollback từ chối image thiếu và không chạy migration; init env riêng tư/không ghi đè. ShellCheck, Bash syntax, Actionlint và systemd unit verify đạt. Toàn bộ 56 test (43 backend, 6 frontend, 7 script) cùng lint/typecheck hai app và format toàn repo đạt.

Runner `infra/test/production-review.mjs` kiểm tra image không có env thật, runtime non-root, frontend proxy, cookie production Secure/httpOnly, cách ly hai user, restart giữ phiên/dữ liệu, pg_dump → pg_restore vào DB mới, rollback hai tag image và migration lỗi giữ app. Nginx template được chạy thật với TLS local, redirect và ACME path. Diễn tập rollback dùng hai tag cùng code; chưa nghiệm thu tương thích schema giữa hai phiên bản thực.

Log review tại `/tmp/miniflow-production-review`; runner dọn đúng project/volume test riêng, DB development không bị thay đổi. Chưa chạy bootstrap Ubuntu trên máy này, chưa cấp certificate công khai, chưa copy backup ra dịch vụ ngoài và chưa bật CD production. CI PR #4 ngày 2026-10-03 đã qua format, lint, test, build app và ba image; production review lỗi do DATABASE_URL của CI override env Compose, khiến migration kết nối localhost trong container. Runner đã tách URL database review; cần CI xanh trên commit sửa trước khi merge.
