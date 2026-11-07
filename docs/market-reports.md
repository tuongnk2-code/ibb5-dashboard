# Triển khai thị trường

Nhập số buổi tham gia thực tế, Demo, PTTB theo ngày; khu vực và ghi chú tùy chọn. Không có Số dán/Phướn. Số liệu do nhân sự báo cáo, không tự lấy từ NET. Ngày mặc định hôm nay giờ Việt Nam; không cho báo cáo ngày tương lai.

Lưu nháp chưa cộng kết quả. Gửi và cập nhật đã gửi đều tính vào tổng tháng; giữ thời gian gửi lần đầu. Hai tỷ lệ đều chia cho tổng số buổi tham gia, hiển thị phần trăm nguyên, không có mẫu số thì “—”. Tổng Bầy/phòng tính từ tổng số, không lấy trung bình các tỷ lệ cá nhân. Chỉ ô nhân sự đã gửi, tham gia >0 và Demo/PTTB=0 mới cảnh báo đỏ.

Nhân viên: báo cáo/xem lại của mình. Trưởng Bầy: báo cáo của mình, xem Bầy và đánh dấu nghỉ trong Bầy. Trưởng phòng: không nhập báo cáo cá nhân, xem toàn phòng và đánh dấu nghỉ. Phạm vi do API xác thực từ hồ sơ máy chủ, không dựa vào vai trò gửi từ trình duyệt. Không cảnh báo người chưa được tạo tài khoản vào ngày đó. Deadline 22:00 theo Báo cáo ngày; Chưa gửi và Quá hạn là hai bộ lọc riêng, Quá hạn bao gồm đã gửi muộn.

API GET trả báo cáo cả tháng trong phạm vi; POST có kiểm tra phiên bản để tránh ghi đè. Frontend lấy mới mỗi 5 giây khi tab đang mở, bảo toàn nội dung đang sửa và phiên bản gốc. Xung đột yêu cầu tải lại có xác nhận. Click ô ngày để xem lại; CSV và PNG theo bộ lọc Bầy/Acc/chế độ Ngày chọn/Cả tháng.

Chạy `supabase/market-reports.sql` một lần tại project hiện có. Hai bảng market_reports/market_report_history bật RLS, không cấp truy cập trực tiếp cho anon/authenticated, chỉ API server dùng service_role sau khi xác thực và kiểm tra phạm vi. Trigger lưu bản cũ trước mỗi lần sửa. Không thay dữ liệu/policy báo cáo ngày.

Kiểm tra: `node --test tests/market-reports.test.js`; `node tests/market-reports.browser.cjs` dùng Playwright/Edge sẵn trong môi trường, `npm run build`.
