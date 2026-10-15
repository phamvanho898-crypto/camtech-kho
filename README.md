# CAMTECH — Kho hàng

Ứng dụng nhập, xuất và quản lý tồn kho dùng trên máy tính và điện thoại.

Mở ứng dụng: https://phamvanho898-crypto.github.io/camtech-kho/

Kết nối kho trực tuyến đã được cấu hình sẵn; người dùng chỉ đăng nhập bằng tài khoản kho đã được tạo trong Supabase Authentication.

## Sử dụng

- Đăng nhập cùng tài khoản trên các thiết bị để dùng chung kho.
- **Tồn kho:** tìm mã, xem tồn thực tế, số đã giữ và số còn khả dụng.
- **Nhập hàng / Xuất hàng:** chọn mã, điền số lượng và lưu phiếu.
- **Đơn chờ giao:** kiểm tra đủ/thiếu, giữ hàng, giao hoặc hủy đơn.
- **WT = Trắng trong; W = Trắng đục.** Hai mã được quản lý riêng.
- Bản thử trên trang đăng nhập dùng số liệu minh họa và chỉ lưu trên thiết bị đang mở.

## Triển khai

Giao diện nằm ở thư mục gốc, không cần cài npm hoặc build.

1. GitHub **Settings → Pages → Deploy from a branch → main → / (root) → Save**.
2. Dùng dự án Supabase riêng, chạy `supabase/01_schema.sql` và tạo tài khoản kho.
3. Điền Project URL cùng publishable key vào `config.js`. Không đặt secret key, service role key hoặc mật khẩu trong mã nguồn.
4. Nạp tồn đầu bằng thao tác riêng trên cơ sở dữ liệu. Không đưa dữ liệu kho thật lên repository công khai.

Các RPC công khai chạy với quyền người gọi; phần ghi dữ liệu có kiểm tra chủ kho nằm trong schema `camtech_private` không đưa ra Data API. Các bảng bật RLS, tài khoản trình duyệt không có quyền ghi trực tiếp.

Một tài khoản tương ứng một kho. V1 dùng cùng tài khoản để chia sẻ kho giữa các thiết bị. Trang tải mới mỗi 15 giây khi đang mở và khi bấm làm mới.

## Kiểm tra

`node --test tests/*.test.cjs`

`tests/database.sql` kiểm tra quyền truy cập và nghiệp vụ trực tiếp trên dự án riêng đã có dữ liệu khởi tạo. Chạy với quyền quản trị cơ sở dữ liệu. Script kiểm tra yêu cầu đúng một kho và một đơn nháp đủ hàng; mọi thay đổi thử nghiệm được rollback.

Các bài kiểm tra nghiệp vụ bao gồm nhập/xuất, W/WT, giữ/hủy/giao và chặn xuất vượt khả dụng. Kiểm tra revision trong JavaScript là mô hình; các kiểm tra cơ sở dữ liệu đã chạy trên Supabase thật. Xem [VALIDATION.md](VALIDATION.md) về phạm vi và giới hạn kiểm tra.
