# Báo cáo ngày

- Mở tab **Báo cáo ngày**, chọn ngày, nhập PTTB theo thứ tự **Thực hiện / Cam kết**, KHTN theo nguồn, cam kết ngày mai và khó khăn/hỗ trợ.
- **Lưu nháp** lưu trên Supabase nhưng vẫn tính là chưa gửi. **Gửi báo cáo** xác nhận hoàn thành. Báo cáo đã gửi có thể cập nhật; máy chủ giữ thời điểm gửi đầu tiên và lịch sử từng lần sửa.
- Nhân sự hiển thị bằng **mã Acc**. Sau khi gửi có nút **Xem báo cáo đã gửi ngày này**. Mục **Báo cáo đã gửi của tôi** bên dưới cho phép lọc tháng và xem lại các ngày đã gửi của chính tài khoản đang đăng nhập, không làm mất form đang nhập.
- Hạn gửi là **22:00 giờ Việt Nam**. Trước hạn: chưa gửi màu vàng. Từ 22:00: chưa gửi màu đỏ. Báo cáo gửi sau hạn mang trạng thái “Đã gửi muộn”.
- Cảnh báo nằm trong tab và tự làm mới mỗi phút khi tab đang mở. Không gửi tin nhắn Zalo, email hay thông báo ngoài ứng dụng.
- Trưởng Bầy xem Bầy mình; Trưởng phòng xem toàn phòng. Nhân viên chỉ xem và ghi báo cáo của mình. Danh sách theo tài khoản đã cấp, không tính tài khoản quản lý vào số người phải nộp.
- Quản lý có thể đánh dấu **Ngày nghỉ**, kèm lý do, để miễn cảnh báo. Có thể bỏ đánh dấu nếu cần nộp lại. Không miễn báo cáo đã gửi.
- HĐ Online ngày và lũy kế tháng lấy từ Supabase, đếm mã HĐ NET duy nhất theo Acc. Cam kết tháng lấy từ dữ liệu cam kết đã duyệt trên hệ thống chung; nếu chưa có hiển thị “—”. Cam kết ngày lấy từ báo cáo đã gửi của ngày hôm trước.
- Mỗi tài khoản/ngày có một báo cáo. Nếu hai thiết bị sửa cùng lúc, máy chủ yêu cầu tải lại thay vì ghi đè bản mới.

## Vận hành

API `/api/daily-reports` dùng cấu hình server Supabase giống API quản lý tài khoản. SQL tạo bảng được lưu ở `supabase/daily-reports.sql`; project hiện tại đã được cấu hình qua kết nối Supabase.

Hai bảng `daily_reports`, `daily_report_history` bật RLS và không cấp quyền trực tiếp cho `anon`/`authenticated`. Việc đọc/ghi chỉ qua API xác thực bằng token và giới hạn phạm vi dựa trên hồ sơ server. Không đặt service-role key trong biến `VITE_*`.

Kiểm thử: `node --test tests/*.test.js`, `npm run dev`, `npm run build`.
