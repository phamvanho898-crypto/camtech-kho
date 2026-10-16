# Kiểm tra triển khai CAMTECH — 15/10/2026

- 44 bài kiểm tra JavaScript đạt (11 nghiệp vụ, 7 hiển thị/bộ lọc, 9 phiếu xuất, 9 báo cáo, 8 khôi phục tải/phiên). Phần nghiệp vụ gồm: W/WT, nhập/xuất, giữ/hủy/giao, chặn tồn âm và phiên bản cũ.
- 16 kiểm tra trực tiếp trên PostgreSQL/Supabase đạt, bằng vai trò `authenticated` và ngữ cảnh người dùng thử: đọc/lưu, đọc lại sau ghi, chống ghi trùng, từ chối phiên bản cũ, chặn xuất vượt tồn, chặn ghi trực tiếp, RLS với chủ kho khác, từ chối thiếu danh tính, giữ/giao đơn, chống giao trùng và bảo toàn lịch sử.
- Mọi thay đổi của kiểm tra cơ sở dữ liệu được rollback; đã đối chiếu lại trạng thái sau kiểm tra.
- Public RPC dùng `SECURITY INVOKER`; các hàm đặc quyền có kiểm tra `auth.uid()` nằm trong schema riêng, không đưa ra Data API. Không có secret/service_role key trong mã nguồn.
- Supabase Performance Advisor: không có cảnh báo. Các cảnh báo về bảng/hàm của kho đã được xử lý.
- Supabase Auth còn cảnh báo **Leaked Password Protection Disabled**. Tham khảo [hướng dẫn kiểm tra mật khẩu bị lộ](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); [bảng gói Supabase](https://supabase.com/pricing) liệt kê tính năng này không có trong gói Free.
- Chưa đăng nhập bằng mật khẩu người dùng hoặc kiểm tra đồng bộ giữa hai phiên trình duyệt/thiết bị thật. Các bài kiểm tra DB mô phỏng ngữ cảnh người dùng bằng claims; không thay thế kiểm tra đăng nhập từ giao diện.
- Số liệu tồn thật được nạp riêng vào cơ sở dữ liệu, không có trong repository công khai. Bản thử từ trang đăng nhập dùng dữ liệu minh họa, lưu trên thiết bị.

## Giao diện dễ đọc — V2

Chữ nội dung chính 15–16 px, mã hàng 17–19 px, số tồn 23–26 px. Bảng nhóm theo kích cỡ, có bộ lọc kích cỡ và tìm màu không dấu. WT/W có nhãn và nền riêng, không chỉ dựa vào ô màu trắng. Có nút nhập/xuất ngay trên trang tồn kho. Dưới 720 px, mỗi mã chuyển thành thẻ với ba số Tồn kho / Đã giữ / Có thể giao; menu dưới dành cho màn hình nhỏ.

6 kiểm tra render/bộ lọc đạt: không mất mã khi nhóm, tách W/WT, lọc kích cỡ, tìm màu không dấu, phân biệt sắp hết/hết, thoát HTML và giữ vị trí gõ khi tải lại. Đã kiểm tra ID, tài nguyên có phiên bản và cấu trúc CSS. Chưa kiểm tra bố cục bằng trình duyệt vì môi trường không có công cụ điều khiển trình duyệt được hỗ trợ.

## Phiếu xuất kho

Mẫu xem trước và CSS in A4 được tạo từ giao dịch xuất đã lưu, gồm xuất trực tiếp và giao từ đơn. Có nút in sau khi lưu, trong lịch sử và trên đơn đã giao. In lại chỉ đọc dữ liệu, không tạo giao dịch hoặc ghi cơ sở dữ liệu. Số phiếu suy ra ổn định từ ngày và mã giao dịch; V1 không cấp số tăng dần. Tổng số lượng tách theo từng đơn vị.

9 kiểm tra đạt: mã/màu W/WT và lượng xuất, số phiếu ổn định, từ chối giao dịch chưa lưu/phiếu nhập, tham chiếu đơn đã giao, không đổi tồn khi xem/in lại, đơn vị và số thập phân, thoát HTML/bản thử, ngày/số lượng/mã hàng sai, đủ hàng hóa ở phiếu nhiều dòng. Đã kiểm tra cấu trúc vùng in riêng và quy tắc A4/ngắt trang. Chưa kiểm tra hộp thoại in/PDF và phân trang thực tế trên trình duyệt vì không có công cụ điều khiển trình duyệt được hỗ trợ.

## Báo cáo tồn kho trong ứng dụng

9 kiểm tra mới đạt: chỉ giữ hàng từ đơn `reserved`, bỏ qua phiếu đã hoàn; phân biệt hết thực tế/hết khả dụng; biên 0/2/2.001 và số lẻ; kết hợp tìm không dấu/kích cỡ/loại báo cáo; W/WT; tổng theo từng đơn vị và danh sách lọc; tên file theo giờ Việt Nam/bản thử; thoát HTML và giữ con trỏ khi đồng bộ; chặn xuất khi chưa tải hoặc còn phiếu chưa xác nhận; đọc `stock_load` trước khi xuất và không tải bản cũ khi lỗi mạng. Các kiểm tra không ghi dữ liệu kho thật.

Đã tạo và đọc lại XLSX bằng chính bản ExcelJS 4.4.0 dùng trên trình duyệt: số nguyên/số lẻ đúng kiểu số, chuỗi bắt đầu bằng dấu `=` giữ kiểu văn bản, W/WT riêng, tổng Cuộn/Mét riêng, bộ lọc bảng và cố định 8 hàng đầu giữ được. ExcelJS tải theo yêu cầu, pin phiên bản và SRI; lỗi tải có thông báo và cho thử lại. Chưa mở file bằng ứng dụng Microsoft Excel/iPhone thực tế.

Sau triển khai, đã kiểm tra trực tiếp trên trình duyệt bằng bản thử: mục Báo cáo và bố cục hiển thị rõ; tải XLSX toàn bộ 6 mã thành công; tìm “trang trong” còn đúng 1 mã PU6x4-WT và tải XLSX 1 mã thành công. Đã đọc lại chính file trình duyệt tải về: bộ lọc A8:H9, mã/màu/số lượng đúng, có phạm vi từ khóa và nhãn BẢN THỬ. Chọn Hết khả dụng khi không có hàng phù hợp hiển thị danh sách rỗng và vô hiệu hóa nút xuất. Không đăng nhập vào kho thật, không thay đổi dữ liệu kho; chưa kiểm tra trên thiết bị di động thật.

## Xử lý kho trống khi lỗi tải / phiên cũ — 16/10/2026

Xác nhận lỗi trong mã cũ: làm mới phiên bị Auth từ chối bằng HTTP 400 không được đưa về đăng nhập; trạng thái khởi tạo rỗng tiếp tục hiển thị như kho chưa có mã hàng. Bản sửa xử lý các mã lỗi refresh token không hợp lệ, giữ thông báo đăng nhập rõ ràng và không xóa phiếu chưa xác nhận khỏi thiết bị. Lỗi mạng giữ lại phiên và số liệu đã xác nhận, hiển thị thông báo cố định kèm nút thử lại. Chưa tải kho thành công thì không hiện tồn 0 và không cho lưu phiếu. Phản hồi từ phiên/tài khoản cũ không ghi đè dữ liệu tài khoản mới; chặn đọc trùng và xử lý lỗi đọc lại sau xung đột phiên bản.

9 kiểm tra mới đạt: 8 kiểm tra luồng đồng bộ/phiên và 1 kiểm tra giao diện chưa tải/lỗi tải. Tình huống refresh bị từ chối và phục hồi đọc được chạy bằng dữ liệu mô phỏng; không gọi đăng nhập bằng mật khẩu thật, không ghi vào cơ sở dữ liệu. Endpoint Auth health phản hồi HTTP 200. Kết nối quản trị Supabase trong phiên kiểm tra không được cấp quyền đọc dự án; chưa xác nhận trạng thái/số liệu kho thật hiện tại và không thực hiện khôi phục dữ liệu từ bản cũ.
