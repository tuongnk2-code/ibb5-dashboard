# Bình luận và thông báo báo cáo

- Báo cáo ngày và báo cáo thị trường đã gửi có phần **Bình luận & phản hồi** trong chi tiết. Trong tổng hợp báo cáo tuần/tháng, nút **Bình luận / phản hồi** mở cùng cuộc trao đổi của báo cáo ngày gốc.
- Trưởng phòng xem toàn phòng; Trưởng Bầy xem trong Bầy; nhân sự chỉ trao đổi trên báo cáo của mình. Quyền xem tổng hợp thị trường rộng hơn không tự cấp quyền đọc bình luận riêng.
- Gửi bình luận tạo thông báo cho chủ báo cáo và những người đã tham gia trao đổi, trừ người gửi. Chuông ưu tiên thông báo chưa đọc, cập nhật mỗi 20 giây khi trang đang hiển thị, khi quay lại cửa sổ và sau khi gửi/đọc.
- Khi không mở dashboard, thông báo vẫn lưu trên máy chủ để xem khi đăng nhập lại. Đây là thông báo trong dashboard, không gửi email, Zalo hay thông báo đẩy khi đã đóng trình duyệt.
- Bấm thông báo mở đúng loại báo cáo, nhân sự, ngày và nội dung trao đổi. Chỉ các bình luận đã tải được mới được đánh dấu đã đọc; trạng thái đồng bộ giữa thiết bị.
- Nội dung tối đa 2.000 ký tự, hiển thị dạng văn bản. Gửi lỗi giữ nội dung để thử lại; mã yêu cầu chống lưu trùng khi thử lại cùng lần gửi.
- `supabase/report-comments.sql` đã áp dụng vào dự án hiện tại. RLS bật, bảng chỉ truy cập qua API xác thực và kiểm tra phạm vi, cùng mô hình lưu trữ với báo cáo ngày/thị trường. Trigger tạo thông báo trong cùng giao dịch với bình luận.
- Kiểm tra: `tests/report-comments.test.js`, `tests/report-comments.browser.cjs`; kiểm tra giao dịch lưu bình luận + thông báo + phản hồi trên máy chủ bằng giao dịch rollback (không để lại bình luận thử).
