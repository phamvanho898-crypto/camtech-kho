# Kiểm tra triển khai CAMTECH — 15/10/2026

- 11 bài kiểm tra nghiệp vụ JavaScript đạt: W/WT, nhập/xuất, giữ/hủy/giao, chặn tồn âm và phiên bản cũ.
- 16 kiểm tra trực tiếp trên PostgreSQL/Supabase đạt, bằng vai trò `authenticated` và ngữ cảnh người dùng thử: đọc/lưu, đọc lại sau ghi, chống ghi trùng, từ chối phiên bản cũ, chặn xuất vượt tồn, chặn ghi trực tiếp, RLS với chủ kho khác, từ chối thiếu danh tính, giữ/giao đơn, chống giao trùng và bảo toàn lịch sử.
- Mọi thay đổi của kiểm tra cơ sở dữ liệu được rollback; đã đối chiếu lại trạng thái sau kiểm tra.
- Public RPC dùng `SECURITY INVOKER`; các hàm đặc quyền có kiểm tra `auth.uid()` nằm trong schema riêng, không đưa ra Data API. Không có secret/service_role key trong mã nguồn.
- Supabase Performance Advisor: không có cảnh báo. Các cảnh báo về bảng/hàm của kho đã được xử lý.
- Supabase Auth còn cảnh báo **Leaked Password Protection Disabled**. Tham khảo [hướng dẫn kiểm tra mật khẩu bị lộ](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); [bảng gói Supabase](https://supabase.com/pricing) liệt kê tính năng này không có trong gói Free.
- Chưa đăng nhập bằng mật khẩu người dùng hoặc kiểm tra đồng bộ giữa hai phiên trình duyệt/thiết bị thật. Các bài kiểm tra DB mô phỏng ngữ cảnh người dùng bằng claims; không thay thế kiểm tra đăng nhập từ giao diện.
- Số liệu tồn thật được nạp riêng vào cơ sở dữ liệu, không có trong repository công khai. Bản thử từ trang đăng nhập dùng dữ liệu minh họa, lưu trên thiết bị.
