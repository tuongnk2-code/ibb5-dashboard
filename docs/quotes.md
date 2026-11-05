# Tạo báo giá

Vào **Tạo báo giá**, bấm **Chọn từ Tra cứu giá**, chọn khu vực và bấm **Tạo báo giá với gói này** ở thẻ sản phẩm. Tên gói, mã, cước tháng, thông số và khu vực được chuyển sang báo giá. Nếu nhập JSON dự phòng, nguồn được ghi rõ. Có thể nhập phương án riêng khi chưa có dữ liệu tra cứu phù hợp.

Phí hòa mạng, cước toàn bộ sau ưu đãi, VAT và hiệu lực phải được xác nhận; giá trống không được hiểu là 0. Nhân viên nhập 0 khi xác nhận miễn phí. Thiết bị/dịch vụ thêm có số lượng, đơn giá, thu một lần hoặc theo tháng. Dịch vụ đã nằm trong combo không thêm lại.

Tổng trước VAT = cước gói × tháng thu tiền + dịch vụ thêm theo tháng × tháng thu tiền + thiết bị/phí một lần + hòa mạng − giảm trừ. Tháng tặng không bị thu tiền. Với giá đã gồm VAT, không cộng thuế lại; với giá chưa VAT, cộng thuế sau giảm trừ. Cước sau ưu đãi là tổng toàn phương án do nhân viên xác nhận, không cộng lại dịch vụ thêm. Tất cả số tiền làm tròn theo đồng.

Xuất **Ảnh PNG** để gửi khách. **PDF / In** mở bản in A4 riêng: chọn Lưu thành PDF trong hộp thoại trình duyệt. Không xuất khi thiếu thông tin, giá chưa xác nhận hoặc báo giá đã hết hiệu lực. Thông tin người dùng được escape trước khi dựng báo giá.

**Lưu phiên bản trên thiết bị** giữ tối đa 30 phiên bản trong localStorage theo ID tài khoản. Mở lại để xem đúng giá tại lúc lưu; sửa tiếp không thay phiên bản cũ. Đây là lưu trên trình duyệt hiện tại, chưa phải kho báo giá đồng bộ Supabase. Không tự gửi Zalo/email, không tạo hợp đồng hay tự thu tiền. Phiên bản cũ không bị đồng bộ giá mới ghi đè.

Kiểm thử: `node --test tests/quote-model.test.js`; `node tests/quote.browser.cjs`; `node tests/responsive.browser.cjs`; `npm run build`.

Logo chuẩn được lấy từ ảnh do người dùng cung cấp tại `assets/fpt-telecom-logo.webp`, nhúng trực tiếp để luôn có trong PNG/PDF. Dòng khu vực dưới logo và cuối báo giá lấy từ Tỉnh/Thành + Phường/Xã ở mục 01, không cố định Đà Nẵng; mở phiên bản cũ dùng khu vực đã lưu trong phiên bản đó.
