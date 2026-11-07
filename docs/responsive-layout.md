# Giao diện trên điện thoại và máy tính

- Màn hình tối đa 1.000px dùng nút **Menu** để mở điều hướng; nội dung dùng toàn chiều rộng. Chọn một tab, bấm bên ngoài hoặc Escape để đóng menu.
- Màn hình lớn giữ thanh điều hướng bên trái.
- Các thẻ KPI và form xếp lại theo chiều rộng. Trường nhập trên điện thoại dùng chữ 16px để tránh tự phóng to khi nhập.
- Các bảng nhiều cột cuộn ngang trong vùng bảng, không làm cả trang bị kéo ngang. Cột Mã HĐ / Acc được giữ khi phù hợp; HĐ tồn cố định ba cột Mã HĐ, Nhân viên bán và Tên khách hàng. Trên điện thoại, tên khách hàng tự xuống dòng để hiển thị đủ.
- Trên điện thoại, ba cột cố định HĐ tồn được thu gọn. Nút **Cập nhật** dưới mã HĐ mở form đầy đủ để xem khách hàng, ngày tạo và cập nhật ngày Online dự kiến, mốc hẹn, nguyên nhân, kết quả, nguồn thông tin. Cách lưu trên thiết bị và phạm vi phân quyền giữ nguyên như cập nhật trực tiếp trong bảng.
- Biểu mẫu, dữ liệu, công thức và quyền truy cập giữ nguyên.

`css/responsive.css` nạp sau các stylesheet hiện có. `js/responsive.js` quản lý menu, bàn phím và các bảng chưa có vùng cuộn riêng.

Kiểm thử giao diện: `node tests/responsive.browser.cjs` với Playwright có sẵn trong môi trường. Có thể đặt `PLAYWRIGHT_MODULE` thành đường dẫn module Playwright và `RESPONSIVE_SCREENSHOT_DIR` để lưu ảnh. Bộ kiểm thử dùng dữ liệu giả lập, chạy 12 tab ở độ rộng 360, 390, 768, 1024 và 1440px.

Báo cáo hiệu suất theo Ngày chọn hiển thị thêm hai danh sách HĐ đã lên (Ngày tạo NET) và HĐ đã Online (Ngày Online NET), cùng bộ lọc ngày/Bầy/nhân sự/phòng. Danh sách chi tiết tuân theo quyền xem HĐ của tài khoản; chỉ số tổng hợp giữ nguyên. Máy tính đặt danh sách cạnh bảng nhân sự, màn hình nhỏ xếp bên dưới; Cả tháng ẩn danh sách. CSV ngày bổ sung hai cột mã HĐ theo phạm vi được xem.

Chế độ ngày: máy tính hiển thị bảng nhân sự và hai danh sách HĐ thành ba phần cùng hàng; tablet đặt bảng tổng hợp phía trên hai danh sách, điện thoại xếp dọc. Mã HĐ và Acc gộp cùng ô để tiết kiệm chiều ngang.

Nút Chụp ảnh bảng trong báo cáo Bán/Online xuất PNG của bảng nhân sự và chú giải theo bộ lọc; xuất đủ hàng/cột, không kèm hai danh sách hợp đồng. Tên file theo ngày/tháng đang chọn.

Bảng Hiệu suất nhân sự có nút Chụp ảnh bảng, xuất đầy đủ cột/hàng và tổng theo bộ lọc. Ảnh có tiêu đề, Bầy và ngày theo dõi, giữ cỡ chữ hiện tại.

Bảng HĐ Online dự kiến theo mốc hẹn có nút Chụp ảnh bảng; PNG giữ tiêu đề, thống kê ngày và toàn bộ bảng, tên file theo ngày đang xem.

Bảng hẹn Online loại HĐ có Kết quả Hủy/Huỷ đã lưu, kể cả chưa TP duyệt; tổng mốc hẹn/Bầy/phòng và PNG dùng cùng danh sách. Dự Kiến Hủy cũng được loại theo yêu cầu; chỉ ảnh hưởng bảng hẹn Online.

Hồ sơ HĐ tồn: Kết quả đặt ngay sau Ngày tạo HĐ, kế tiếp Lý do hủy. Với Hủy/Dự Kiến Hủy, chỉ Ngày Online dự kiến và Mốc Hẹn Online được để trống; Nguyên nhân, Kết quả, Nguồn vẫn bắt buộc. Hủy vẫn cần Lý do hủy. Quy tắc áp dụng cho bảng desktop, form điện thoại và API máy chủ; giá trị hẹn đã có không tự bị xóa.

Tình trạng HĐ có mục HĐ đã ẩn: tra cứu các HĐ được TP duyệt hủy từ dữ liệu NET lưu trên hệ thống, gồm cả nguồn bị loại khỏi thống kê vận hành. Giữ phạm vi tài khoản, tìm từ khóa/lọc tháng/cột và CSV. Chỉ xem, không sửa hay duyệt lại; các bộ lọc thông thường vẫn loại HĐ đã ẩn.

Chọn Hủy/Dự Kiến Hủy sẽ ẩn hai ô nhập Ngày Online dự kiến và Mốc hẹn Online ở dòng đó (hiển thị —), đồng thời ẩn hai trường trong form điện thoại. Chuyển sang trạng thái khác tự hiện lại và bắt buộc nhập; giá trị cũ được giữ.
