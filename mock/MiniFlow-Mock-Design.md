# MiniFlow — Bản thiết kế mock

> Bản thiết kế để review trước khi xây dựng app. Scope nhỏ, giao diện rõ ràng, code và kiến trúc dễ đọc.

## 1. Mục tiêu và phạm vi

MiniFlow giúp một user quản lý các Project của mình và các Task bên trong từng Project.

Chức năng phiên bản đầu:

- Đăng ký, đăng nhập, đăng xuất.
- Tạo và xem danh sách Project.
- Tạo Task trong Project với tên và mô tả tùy chọn.
- Đổi trạng thái Task: **Cần làm → Đang làm → Hoàn thành**.
- Lọc Task theo trạng thái.
- Dashboard tổng quan Project và Task.
- Backend có endpoint health để kiểm tra hoạt động.

Mỗi Project thuộc một user. Phiên bản này chưa có thành viên, lời mời hay phân công Task. Chưa thêm sửa/xóa Project hoặc Task vào mock.

## 2. Phong cách giao diện

| Thành phần | Thiết kế |
|---|---|
| Ngôn ngữ | Tiếng Việt |
| Màu chính | Xanh lá trầm `#277A60` |
| Nền trang | Xám rất nhạt `#F7F9FB` |
| Card, sidebar | Trắng, viền nhạt, bo góc vừa phải |
| Chữ chính | Xám đậm `#202B3B` |
| Font | Be Vietnam Pro; fallback font hệ thống |
| Task cần làm | Nhãn xám |
| Task đang làm | Nhãn vàng |
| Task hoàn thành | Nhãn xanh |

Ưu tiên khoảng trống, tiêu đề rõ, ít nút và ít bước thao tác. Không dùng biểu đồ phức tạp hay bảng Kanban trong phiên bản đầu.

## 3. Khung ứng dụng

Desktop có sidebar bên trái, thanh điều hướng ngữ cảnh ở trên, nội dung ở giữa.

```text
┌─────────────────┬─────────────────────────────────────────┐
│ MiniFlow        │ Workspace / Dashboard                   │
│                 ├─────────────────────────────────────────┤
│ Dashboard       │ Tiêu đề màn hình        [Tạo Project]   │
│ Projects        │ Mô tả ngắn                              │
│                 │                                         │
│                 │ Nội dung: thống kê / project / task     │
│                 │                                         │
│                 │                                         │
│ Tài khoản       ├─────────────────────────────────────────┤
│ Đăng xuất       │ MiniFlow                                │
└─────────────────┴─────────────────────────────────────────┘
```

Sidebar chỉ có **Dashboard** và **Projects**. Không có trang Users, Settings hoặc quản trị riêng.

Trên mobile, menu chuyển lên đầu trang, thống kê hiển thị hai cột, card Project một cột. Bảng Task có thể cuộn ngang khi cần.

## 4. Màn hình đăng nhập

```text
┌────────────────────────────────────────┐
│ MiniFlow                               │
│                                        │
│ Chào mừng trở lại                       │
│ Một nơi gọn gàng cho project và task.   │
│                                        │
│ Email                                  │
│ [ban@example.com                     ] │
│ Mật khẩu                               │
│ [••••••••                            ] │
│                                        │
│ [             Đăng nhập              ] │
│                                        │
│ Chưa có tài khoản? Đăng ký              │
└────────────────────────────────────────┘
```

- Form nằm giữa trang.
- Email và mật khẩu là hai trường bắt buộc.
- Link Đăng ký chuyển sang màn hình đăng ký.
- Đăng nhập thành công chuyển đến Dashboard.
- Khi triển khai thật: hiển thị lỗi ngay trong form và khóa nút submit trong lúc gửi request.

## 5. Màn hình đăng ký

Dùng cùng bố cục với đăng nhập:

- Tiêu đề: **Bắt đầu với MiniFlow**.
- Trường: Email, mật khẩu tối thiểu 8 ký tự.
- Nút chính: **Tạo tài khoản**.
- Link phụ: **Đã có tài khoản? Đăng nhập**.
- Luồng dự kiến: đăng ký thành công đi vào Dashboard.

Cơ chế phiên/token sẽ được chốt khi triển khai auth. Mock không lưu hoặc gửi thông tin đăng nhập.

## 6. Dashboard

```text
Chào bạn, bắt đầu thôi                    [＋ Tạo Project]
Mọi project và tiến độ công việc, trong một góc nhìn.

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│Tổng Project│ │ Cần làm    │ │ Đang làm   │ │ Hoàn thành │
│     3      │ │     5      │ │     2      │ │     2      │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

Project của bạn                             Xem tất cả →
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│Website công ty │ │MiniFlow MVP    │ │Linux & Deploy  │
│3 task          │ │4 task          │ │2 task          │
│1/3 hoàn thành  │ │1/4 hoàn thành  │ │0/2 hoàn thành  │
│[████░░░░░░]    │ │[███░░░░░░░]    │ │[░░░░░░░░░░]    │
└────────────────┘ └────────────────┘ └────────────────┘

Task cần chú ý
┌─────────────────────────┬──────────────────┬────────────┐
│ Tên Task                │ Project          │ Trạng thái │
├─────────────────────────┼──────────────────┼────────────┤
│ Trang giới thiệu        │ Website công ty  │ Đang làm   │
│ Kiểm tra mobile         │ Website công ty  │ Cần làm    │
│ Luồng đăng nhập         │ MiniFlow MVP     │ Đang làm   │
└─────────────────────────┴──────────────────┴────────────┘
```

- Thống kê lấy từ dữ liệu Project/Task hiện có, không có bảng Dashboard riêng.
- Card Project hiển thị tên, số Task, số Task hoàn thành, phần trăm tiến độ và ngày tạo.
- Tiến độ = số Task DONE / tổng Task. Project chưa có Task hiển thị 0%.
- Click card mở chi tiết Project.
- Khu vực Task cần chú ý hiển thị tối đa 5 Task chưa hoàn thành; chưa có cơ chế ưu tiên hoặc deadline.
- Đổi trạng thái Task thực hiện ở trang chi tiết Project.

## 7. Danh sách Projects

```text
Projects                                  [＋ Tạo Project]
Chia công việc thành những project dễ quản lý.

┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Project A      │ │ Project B      │ │ Project C      │
│ Số Task        │ │ Số Task        │ │ Số Task        │
│ Tiến độ        │ │ Tiến độ        │ │ Tiến độ        │
│ Ngày tạo       │ │ Ngày tạo       │ │ Ngày tạo       │
└────────────────┘ └────────────────┘ └────────────────┘
```

Màn hình này dùng cùng loại card với Dashboard, hiển thị danh sách Project của user.

## 8. Form tạo Project

Hiển thị bằng modal trên Dashboard hoặc danh sách Projects.

```text
┌────────────────────────────────────────┐
│ Tạo Project                          × │
│                                        │
│ Tên Project                            │
│ [Ví dụ: Website công ty               ] │
│                                        │
│                      [Hủy] [Tạo mới]   │
└────────────────────────────────────────┘
```

- Chỉ có trường tên, bắt buộc, tối đa 100 ký tự.
- Tên chỉ chứa khoảng trắng không hợp lệ.
- Tạo thành công đóng modal, cập nhật danh sách và hiển thị thông báo ngắn.
- Project mới chưa có Task, tiến độ 0%.

## 9. Chi tiết Project

```text
← Tất cả Project

Website công ty                             [＋ Tạo Task]
Tạo 28/09/2026 · Bạn là chủ sở hữu

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Tổng Task  │ │ Cần làm    │ │ Đang làm   │ │ Hoàn thành │
│     3      │ │     1      │ │     1      │ │     1      │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

Danh sách Task
[Tất cả 3] [Cần làm 1] [Đang làm 1] [Hoàn thành 1]

┌─────────────────────────────────────┬─────────────────┐
│ Tên Task                            │ Trạng thái      │
├─────────────────────────────────────┼─────────────────┤
│ Thiết kế trang chủ                  │ [Hoàn thành ▾]  │
│ Bố cục đơn giản, rõ sản phẩm.        │                 │
├─────────────────────────────────────┼─────────────────┤
│ Xây dựng trang giới thiệu           │ [Đang làm   ▾]  │
│ Thông tin về đội ngũ và công ty.     │                 │
├─────────────────────────────────────┼─────────────────┤
│ Kiểm tra giao diện mobile           │ [Cần làm    ▾]  │
└─────────────────────────────────────┴─────────────────┘
```

- Task hiển thị tên và mô tả nếu có.
- Dropdown đổi trực tiếp giữa TODO, IN_PROGRESS và DONE; không bắt buộc đi lần lượt.
- Khi đổi trạng thái, số liệu và tiến độ cập nhật theo dữ liệu mới.
- Bộ lọc chỉ thay đổi các dòng trong bảng; thống kê vẫn phản ánh toàn bộ Project.
- Khi tạo Task mới, bộ lọc trở về Tất cả để thấy Task vừa tạo.
- Khi chưa có Task hoặc bộ lọc không có kết quả, bảng hiển thị thông báo trống.

## 10. Form tạo Task

```text
┌────────────────────────────────────────┐
│ Tạo Task                             × │
│                                        │
│ Tên Task                               │
│ [Ví dụ: Thiết kế trang đăng nhập      ] │
│                                        │
│ Mô tả                                  │
│ [Thêm thông tin cho task…             ] │
│ [                                    ] │
│                                        │
│                      [Hủy] [Tạo mới]   │
└────────────────────────────────────────┘
```

- Tên bắt buộc, tối đa 100 ký tự, không chỉ chứa khoảng trắng.
- Mô tả tùy chọn, tối đa 1.000 ký tự.
- Project được xác định từ trang đang mở, không cần chọn lại trong form.
- Task mới có trạng thái TODO.

## 11. Luồng sử dụng chính

```text
Đăng ký / Đăng nhập
        ↓
     Dashboard
        ↓
    Tạo Project
        ↓
 Mở chi tiết Project
        ↓
     Tạo Task
        ↓
 Đổi trạng thái Task
        ↓
 Xem tiến độ trên Dashboard
```

Đăng xuất đưa user về màn hình đăng nhập. Với app thật, backend phải kiểm tra quyền sở hữu Project và Task ở mỗi thao tác.

## 12. Trạng thái cần có khi triển khai thật

| Trường hợp | Phản hồi giao diện |
|---|---|
| Đang tải dữ liệu | Nội dung chờ tải gọn, tránh hiển thị số liệu sai |
| Chưa có Project | Lời nhắc tạo Project đầu tiên và nút tạo |
| Project chưa có Task | Lời nhắc tạo Task đầu tiên |
| Bộ lọc không có kết quả | Thông báo chưa có Task ở trạng thái đã chọn |
| Form chưa hợp lệ | Lỗi cạnh trường nhập |
| Gửi form / cập nhật trạng thái | Khóa thao tác tương ứng trong lúc gửi |
| API lỗi | Thông báo rõ ràng, giữ nội dung form để thử lại |
| Hết phiên đăng nhập | Chuyển về đăng nhập |
| Không có quyền / không tìm thấy Project | Thông báo và link quay lại Projects |

Mock hiện thể hiện bố cục, modal, bộ lọc, dữ liệu trống của Task và thông báo thành công. Các trạng thái API/auth thật sẽ được bổ sung khi build.

## 13. Kiến trúc triển khai dự kiến

Frontend: Next.js + TypeScript + Tailwind CSS, chia theo feature **auth / project / task**, các route nằm trong `app`, thành phần dùng chung nằm trong `shared`.

Backend: NestJS + TypeScript + Prisma, chia module **auth / users / projects / tasks**, mỗi feature đi theo luồng:

```text
Controller → Service → Repository → Prisma → PostgreSQL 17
```

Controller xử lý HTTP, Service xử lý nghiệp vụ và quyền, Repository truy cập database. Chỉ thêm abstraction khi có nhu cầu cụ thể; giữ các lớp và tên hàm dễ hiểu.

Hạ tầng sẽ làm từng bước: chạy native → Nginx → Docker Compose → VPS và CI/CD. Không thêm Redis, Kafka, microservice, WebSocket hay Kubernetes.

## 14. Cách xem mock tương tác

File giao diện nằm tại:

```text
/home/cunnekba/Desktop/proj/f-projectlinx/mock/index.html
```

Mở file bằng trình duyệt, hoặc chạy từ thư mục repo:

```bash
python3 -m http.server 8080 --directory mock
```

Truy cập `http://localhost:8080`.

Mock dùng HTML/CSS/JS riêng để review, chưa phải code app production. Dữ liệu mẫu chỉ nằm trong bộ nhớ, tải lại trang sẽ reset. Form auth chỉ chuyển màn hình, không gửi hoặc lưu thông tin đăng nhập.

## 15. Các điểm review

- Bố cục sidebar và nội dung có dễ nhìn không?
- Màu xanh, kiểu card và mật độ thông tin có phù hợp không?
- Dashboard có đủ thông tin cần xem nhanh không?
- Bảng Task và dropdown trạng thái có thuận tiện không?
- Form tạo Project/Task có đủ đơn giản không?
- Có cần thay đổi nhãn hoặc thứ tự thao tác trước khi build không?

Sau khi chốt giao diện và luồng, triển khai từng phần theo scope này.
