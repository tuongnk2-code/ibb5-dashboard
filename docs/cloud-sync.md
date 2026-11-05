# Đồng bộ giữa máy tính và điện thoại

Sau đăng nhập, toàn bộ bộ lọc ngày mặc định là hôm nay theo Asia/Ho_Chi_Minh, tháng bắt đầu từ ngày 1. Ngày mặc định không phụ thuộc ngày mới nhất trong dữ liệu.

Dữ liệu nhập Excel, cam kết tháng và cập nhật HĐ tồn được lưu tại Supabase `dashboard_shared_state`. Bảng bật RLS và không cấp quyền trực tiếp cho anon/authenticated. API `/api/dashboard-sync` xác thực phiên đăng nhập và hồ sơ: chỉ Trưởng phòng nhập Excel, ký/duyệt cam kết; nhân viên gửi cam kết của mình và cập nhật HĐ của mình; Trưởng Bầy cập nhật HĐ trong Bầy. Các bảng nguồn giữ policy SELECT authenticated hiện tại.

## Chuyển dữ liệu cũ

Mở bản cập nhật trên trình duyệt máy tính đang giữ dữ liệu mới nhất, đăng nhập bằng Trưởng phòng. Hệ thống tự chuyển bản Excel, cam kết và ghi chú đang lưu trên trình duyệt lên nơi dùng chung nếu chưa có bản chung cho khóa tương ứng. Bản cũ vẫn giữ trên máy để dự phòng. Thiết bị cũ không được ghi đè bản đã có trên máy chủ. Nếu cần thay thế bản Excel chung, nhập lại file mới tại Trung tâm dữ liệu; có thể nhập file JSON cam kết tại Cam kết tháng.

Các tài khoản đang mở dashboard tự kiểm tra phiên bản mỗi **5 giây**, nhận riêng những mục có thay đổi và cập nhật giao diện ngay, không cần F5. Khi quay lại ứng dụng hoặc có mạng trở lại, hệ thống kiểm tra ngay. HĐ tồn, lịch hẹn, biểu đồ và cam kết tháng cập nhật tại chỗ; ngày, bộ lọc và nội dung đang nhập được giữ lại. Báo cáo ngày cũng tự cập nhật mỗi 5 giây khi đang xem tab đó, theo phạm vi tài khoản.

Khi mất kết nối, hệ thống báo chờ và tự thử lại; không báo lưu thành công giả. Nếu hai người cùng sửa một mục, giữ nguyên bản đang nhập và báo xung đột thay vì ghi đè dữ liệu mới. Với HĐ tồn/cam kết, bấm **Bỏ sửa** để nhận bản mới rồi chỉnh lại. Với báo cáo ngày, bấm **Tải lại** sau khi đã lưu riêng nội dung cần giữ. Nút **Đồng bộ** lấy dữ liệu ngay, không tải lại trang.

Lưu ý: đồng bộ không tự sinh dữ liệu cho những ngày chưa nhập file. Chọn hôm nay có thể cho kết quả 0 khi nguồn mới nhất vẫn là tháng trước.

Tỷ lệ NET Online trả trước = số mã HĐ NET Online có kỳ hạn **≥ 3T** trong cột **CLBH Net Thời điểm hiện tại** / tổng mã HĐ NET Online của kỳ đang xem. Nội dung CLBH được giữ ở `netClbh` khi nhập Excel và lưu dùng chung; không dùng cột Số tháng trả trước để thay thế. Giá trị phần trăm hiển thị được làm tròn số nguyên.

Git push triển khai code trên Vercel; SQL trong `supabase/dashboard-shared-state.sql` là thay đổi Supabase riêng. Không đưa khóa máy chủ vào client hoặc Git.
