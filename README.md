# CAMTECH — Kho hàng

Ứng dụng nhập, xuất và quản lý tồn kho dùng trên máy tính và điện thoại.

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

Một tài khoản tương ứng một kho. V1 dùng cùng tài khoản để chia sẻ kho giữa các thiết bị. Trang tải mới mỗi 15 giây khi đang mở và khi bấm làm mới.

## Kiểm tra

`node --test tests/*.test.cjs`

Các bài kiểm tra nghiệp vụ bao gồm nhập/xuất, W/WT, giữ/hủy/giao và chặn xuất vượt khả dụng. Kiểm tra revision trong JavaScript là mô hình; cần kiểm tra đăng nhập và đồng bộ trên Supabase thật trước khi sử dụng chính thức.
