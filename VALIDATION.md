# Kiểm tra triển khai CAMTECH — 15/10/2026

- 17 bài kiểm tra JavaScript đạt (11 nghiệp vụ và 6 kiểm tra hiển thị/bộ lọc). Phần nghiệp vụ gồm: W/WT, nhập/xuất, giữ/hủy/giao, chặn tồn âm và phiên bản cũ.
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
