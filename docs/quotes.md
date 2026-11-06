# Tạo báo giá

Vào **Tạo báo giá**, bấm **Chọn từ Tra cứu giá**, chọn khu vực và bấm **Tạo báo giá với gói này** ở thẻ sản phẩm. Tên gói, mã, cước tháng, thông số và khu vực được chuyển sang báo giá. Nếu nhập JSON dự phòng, nguồn được ghi rõ. Chọn chính sách từ gói tra cứu để xác định phí hòa mạng.

Ô nhập phí hòa mạng được ẩn. Khi chọn gói từ Tra cứu giá, hệ thống tải chính sách còn hiệu lực tại đúng khu vực. Chọn Chính sách thanh toán để tự áp dụng số tháng thu tiền, tháng tặng và phí hòa mạng từ `summary.fee_price.price`; chỉ áp dụng khi tiền dịch vụ khớp cước × tháng thu tiền. Thiếu phí không được hiểu là miễn phí. Đổi khu vực, mã gói, cước hoặc thời hạn khác chính sách sẽ không dùng lại phí cũ và chưa cho xuất. Cước toàn bộ sau ưu đãi tự tính từ cước gói và các dịch vụ thêm hằng tháng; VAT và hiệu lực vẫn cần xác nhận. Phiên bản cũ giữ nguyên phí lúc lưu; các bản mới lưu cả chính sách theo từng gói. Thiết bị/dịch vụ thêm có số lượng, đơn giá, thu một lần hoặc theo tháng. Dịch vụ đã nằm trong combo không thêm lại.

Với trả trước: tổng trước VAT = cước gói × tháng thu tiền + dịch vụ thêm theo tháng × tháng thu tiền + thiết bị/phí một lần + hòa mạng − giảm trừ. Tháng tặng không bị thu tiền. Với giá đã gồm VAT, không cộng thuế lại; với giá chưa VAT, cộng thuế sau giảm trừ. Cước sau ưu đãi = cước tháng của gói đã chọn + tổng đơn giá × số lượng dịch vụ thêm hằng tháng; không tính phí một lần, không nhân số tháng trả trước và không cộng dịch vụ thêm hai lần. Tất cả số tiền làm tròn theo đồng.

Xuất **Ảnh PNG** để gửi khách. **PDF / In** mở bản in A4 riêng: chọn Lưu thành PDF trong hộp thoại trình duyệt. Không xuất khi thiếu thông tin, giá chưa xác nhận hoặc báo giá đã hết hiệu lực. Thông tin người dùng được escape trước khi dựng báo giá.

**Lưu phiên bản trên thiết bị** giữ tối đa 30 phiên bản trong localStorage theo ID tài khoản. Mở lại để xem đúng giá tại lúc lưu; sửa tiếp không thay phiên bản cũ. Đây là lưu trên trình duyệt hiện tại, chưa phải kho báo giá đồng bộ Supabase. Không tự gửi Zalo/email, không tạo hợp đồng hay tự thu tiền. Phiên bản cũ không bị đồng bộ giá mới ghi đè.

Kiểm thử: `node --test tests/quote-model.test.js`; `node tests/quote.browser.cjs`; `node tests/responsive.browser.cjs`; `npm run build`.

Logo chuẩn được lấy từ ảnh do người dùng cung cấp tại `assets/fpt-telecom-logo.webp`, nhúng trực tiếp để luôn có trong PNG/PDF. Dòng khu vực dưới logo và cuối báo giá lấy từ Tỉnh/Thành + Phường/Xã ở mục 01, không cố định Đà Nẵng; mở phiên bản cũ dùng khu vực đã lưu trong phiên bản đó.

## Nhiều gói trong một báo giá

Bấm **Thêm gói so sánh** để tạo phương án mới và chọn thêm từ Tra cứu giá. Mỗi báo giá hỗ trợ tối đa 9 phương án; nút Chọn/Đổi gói chỉ thay gói đang sửa. Dùng các thẻ Gói 1, Gói 2… để chỉnh cước, VAT, phí, thiết bị, ưu đãi riêng. Thông tin khách hàng, khu vực, nhân viên và hiệu lực dùng chung. Chỉ xuất khi tất cả phương án đủ điều kiện; không cộng tiền các phương án.

Một gói giữ bố cục chi tiết. Hai gói dùng hai thẻ so sánh cạnh nhau. Ba gói trở lên dùng bảng so sánh, tối đa 3 cột gói mỗi nhóm để đọc rõ trên A4. Xóa gói tự chuyển về bố cục phù hợp. PNG/PDF và phiên bản lưu giữ toàn bộ phương án; phiên bản cũ một gói vẫn mở được.

Với chính sách Trả sau, cước gói và dịch vụ thêm hằng tháng không thu trong thanh toán ban đầu. Tiền ban đầu = phí hòa mạng + thiết bị/dịch vụ thu một lần − giảm trừ, cộng VAT nếu giá chưa gồm VAT. Cước tháng vẫn hiện rõ để khách biết khoản trả sau; chu kỳ 1 tháng không phải một tháng trả trước. Trả trước giữ công thức hiện tại.

Ô nhập Cước toàn bộ sau ưu đãi/tháng được ẩn. Cước định kỳ tự cập nhật khi đổi gói, sửa cước gói hoặc thêm/xóa dịch vụ theo tháng; mỗi phương án dùng cước riêng. Số tiền đã gồm VAT khi lựa chọn giá chưa VAT; không lấy giá trị nhập tay cũ làm nguồn tính. PNG/PDF và các phiên bản lưu dùng cùng công thức.
