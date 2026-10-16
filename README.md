# CAMTECH — Kho hàng

Ứng dụng nhập, xuất và quản lý tồn kho dùng trên máy tính và điện thoại.

Mở ứng dụng: https://phamvanho898-crypto.github.io/camtech-kho/

Kết nối kho trực tuyến đã được cấu hình sẵn; người dùng chỉ đăng nhập bằng tài khoản kho đã được tạo trong Supabase Authentication.

## Sử dụng

- Đăng nhập cùng tài khoản trên các thiết bị để dùng chung kho.
- Nếu phiên đăng nhập cũ hết hiệu lực, app trở về màn hình đăng nhập và giữ email để đăng nhập lại. Phiếu chưa được xác nhận vẫn được giữ trên thiết bị và chỉ kiểm tra lại khi vào đúng tài khoản. Khi chưa tải được kho, app hiển thị lỗi và nút **Thử tải lại**, không hiển thị tồn 0 hay hướng dẫn nhập lại dữ liệu. Nếu đã tải được một lần rồi mất mạng, số liệu cũ vẫn được giữ kèm thông báo chưa đồng bộ.
- **Tồn kho:** tìm mã, xem tồn thực tế, số đã giữ và số còn khả dụng.
- **Báo cáo:** mở mục **Báo cáo** → chọn **Toàn bộ tồn kho / Hết khả dụng / Sắp hết hàng** → tìm mã, màu hoặc lọc kích cỡ → **Xuất Excel (.xlsx)**. File xuất đúng danh sách đang xem; có thời điểm, phạm vi lọc, mã/màu/đơn vị, tồn thực tế, đã giữ, khả dụng và tổng theo từng đơn vị. Khi xuất, kho thật được đọc lại trước khi tạo file; nếu mất kết nối sẽ báo lỗi để thử lại. Hết khả dụng gồm cả mã còn tồn nhưng đã giữ hết; sắp hết là còn trên 0 đến 2 đơn vị khả dụng. Xuất báo cáo không ghi phiếu hay trừ tồn.
- **Nhập hàng / Xuất hàng:** chọn mã, điền số lượng và lưu phiếu.
- **Phiếu xuất kho:** sau khi lưu xuất hàng, màn hình xem phiếu tự mở. Chọn **In / Lưu PDF**, chọn khổ **A4**; chọn **Save as PDF / Lưu dưới dạng PDF** trong cửa sổ in để tải PDF. Để in lại: **Lịch sử → Xem / In phiếu xuất**, hoặc mở đơn **Đã giao**. Số phiếu tự tạo ổn định theo ngày và mã giao dịch. Phiếu có mã hàng, tên/màu, đơn vị, số lượng và ba vị trí ký nhận.
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

Xuất XLSX dùng ExcelJS 4.4.0, chỉ tải khi bấm xuất, từ jsDelivr với mã kiểm tra SRI cố định. Cần kết nối mạng để tải lần đầu. Không gửi dữ liệu kho đến CDN; file được tạo trong trình duyệt. Chỉ `stock_load` được gọi khi xuất báo cáo, không đổi schema hoặc quyền truy cập.

## Kiểm tra

`node --test tests/*.test.cjs`

`tests/database.sql` kiểm tra quyền truy cập và nghiệp vụ trực tiếp trên dự án riêng đã có dữ liệu khởi tạo. Chạy với quyền quản trị cơ sở dữ liệu. Script kiểm tra yêu cầu đúng một kho và một đơn nháp đủ hàng; mọi thay đổi thử nghiệm được rollback.

Các bài kiểm tra nghiệp vụ bao gồm nhập/xuất, W/WT, giữ/hủy/giao và chặn xuất vượt khả dụng. Kiểm tra revision trong JavaScript là mô hình; các kiểm tra cơ sở dữ liệu đã chạy trên Supabase thật. Xem [VALIDATION.md](VALIDATION.md) về phạm vi và giới hạn kiểm tra.
