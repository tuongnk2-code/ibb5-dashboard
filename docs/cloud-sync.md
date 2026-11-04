# Đồng bộ giữa máy tính và điện thoại

Sau đăng nhập, toàn bộ bộ lọc ngày mặc định là hôm nay theo Asia/Ho_Chi_Minh, tháng bắt đầu từ ngày 1. Ngày mặc định không phụ thuộc ngày mới nhất trong dữ liệu.

Dữ liệu nhập Excel, cam kết tháng và cập nhật HĐ tồn được lưu tại Supabase `dashboard_shared_state`. Bảng bật RLS và không cấp quyền trực tiếp cho anon/authenticated. API `/api/dashboard-sync` xác thực phiên đăng nhập và hồ sơ: chỉ Trưởng phòng nhập Excel, ký/duyệt cam kết; nhân viên gửi cam kết của mình và cập nhật HĐ của mình; Trưởng Bầy cập nhật HĐ trong Bầy. Các bảng nguồn giữ policy SELECT authenticated hiện tại.

## Chuyển dữ liệu cũ

Mở bản cập nhật trên trình duyệt máy tính đang giữ dữ liệu mới nhất, đăng nhập bằng Trưởng phòng. Hệ thống tự chuyển bản Excel, cam kết và ghi chú đang lưu trên trình duyệt lên nơi dùng chung nếu chưa có bản chung cho khóa tương ứng. Bản cũ vẫn giữ trên máy để dự phòng. Thiết bị cũ không được ghi đè bản đã có trên máy chủ. Nếu cần thay thế bản Excel chung, nhập lại file mới tại Trung tâm dữ liệu; có thể nhập file JSON cam kết tại Cam kết tháng.

Sau đó mở điện thoại, bấm **Đồng bộ** hoặc tải lại trang. Mỗi lần đăng nhập/tải lại lấy dữ liệu chung, không ưu tiên bộ nhớ riêng của điện thoại. Đang mở trang thì kiểm tra phiên bản mỗi phút và khi quay lại ứng dụng; có dữ liệu mới sẽ hiện nút tải lại để tránh mất nội dung chưa lưu. Khi mất kết nối, thao tác lưu báo lỗi và không báo thành công giả. Nếu hai máy cùng sửa một mục, máy lưu sau được yêu cầu tải lại thay vì ghi đè.

Lưu ý: đồng bộ không tự sinh dữ liệu cho những ngày chưa nhập file. Chọn hôm nay có thể cho kết quả 0 khi nguồn mới nhất vẫn là tháng trước.

Tỷ lệ NET Online trả trước = số mã HĐ NET Online có kỳ hạn **≥ 3T** trong cột **CLBH Net Thời điểm hiện tại** / tổng mã HĐ NET Online của kỳ đang xem. Nội dung CLBH được giữ ở `netClbh` khi nhập Excel và lưu dùng chung; không dùng cột Số tháng trả trước để thay thế. Giá trị phần trăm hiển thị được làm tròn số nguyên.

Git push triển khai code trên Vercel; SQL trong `supabase/dashboard-shared-state.sql` là thay đổi Supabase riêng. Không đưa khóa máy chủ vào client hoặc Git.
