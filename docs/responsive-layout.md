# Giao diện trên điện thoại và máy tính

- Màn hình tối đa 1.000px dùng nút **Menu** để mở điều hướng; nội dung dùng toàn chiều rộng. Chọn một tab, bấm bên ngoài hoặc Escape để đóng menu.
- Màn hình lớn giữ thanh điều hướng bên trái.
- Các thẻ KPI và form xếp lại theo chiều rộng. Trường nhập trên điện thoại dùng chữ 16px để tránh tự phóng to khi nhập.
- Các bảng nhiều cột cuộn ngang trong vùng bảng, không làm cả trang bị kéo ngang. Cột Mã HĐ / Acc được giữ khi phù hợp; HĐ tồn cố định hai cột Mã HĐ và Nhân viên bán trên màn hình nhỏ.
- Trên điện thoại, hai cột cố định HĐ tồn được thu gọn. Nút **Cập nhật** dưới mã HĐ mở form đầy đủ để xem khách hàng, ngày tạo và cập nhật ngày Online dự kiến, mốc hẹn, nguyên nhân, kết quả, nguồn thông tin. Cách lưu trên thiết bị và phạm vi phân quyền giữ nguyên như cập nhật trực tiếp trong bảng.
- Biểu mẫu, dữ liệu, công thức và quyền truy cập giữ nguyên.

`css/responsive.css` nạp sau các stylesheet hiện có. `js/responsive.js` quản lý menu, bàn phím và các bảng chưa có vùng cuộn riêng.

Kiểm thử giao diện: `node tests/responsive.browser.cjs` với Playwright có sẵn trong môi trường. Có thể đặt `PLAYWRIGHT_MODULE` thành đường dẫn module Playwright và `RESPONSIVE_SCREENSHOT_DIR` để lưu ảnh. Bộ kiểm thử dùng dữ liệu giả lập, chạy 12 tab ở độ rộng 360, 390, 768, 1024 và 1440px.
