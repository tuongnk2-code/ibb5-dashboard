# CSKH / Chiến dịch IBB5

## Luồng sử dụng

1. **Khách hàng:** chỉ lấy HĐ Internet có ngày Online hợp lệ không vượt quá ngày hiện tại (giờ Việt Nam), chưa chấm dứt theo dữ liệu NET chung mới nhất, theo quyền tài khoản. Ô tổng đếm theo mã HĐ đã Online. Bổ sung SĐT và ghi nhận khách đồng ý nhận chăm sóc. SĐT và ghi chú lưu riêng, không bị file NET ghi đè. HĐ không còn đáp ứng điều kiện sẽ không được chọn vào chiến dịch mới; lịch sử kết quả vẫn giữ lại.
2. **Tạo chiến dịch:** chọn nhân sự phụ trách, tên chiến dịch, ngày giờ Việt Nam, nội dung và khách. Có mẫu nội dung; tự điền `{ten_kh}`, `{ma_hd}`, `{nhan_su}`. Một lần, hằng tuần hoặc hằng tháng. Mỗi chiến dịch tối đa 500 KH, không trùng SĐT.
3. **Thực hiện:** chiến dịch đến giờ được đánh dấu **Đến lịch**, kèm số trên menu CSKH. Sao chép nội dung, mở Zalo, tự kiểm tra đúng người và bấm gửi trong Zalo. Sau đó xác nhận **Đã gửi**, hoặc chọn kết quả và lưu ghi chú. IBB5 không gửi tin tự động và không đọc được trạng thái đã nhận/đã xem của Zalo cá nhân.
4. **Kết thúc:** khi các KH đủ điều kiện đã có kết quả, chọn hoàn tất chiến dịch; với lịch lặp, chọn kết thúc kỳ để tạo kỳ kế tiếp. Lịch sử của kỳ trước giữ nguyên. Tháng ngắn hơn lấy ngày cuối tháng, kỳ sau phục hồi ngày gốc. Có thể tạm dừng/tiếp tục chiến dịch.
5. **Báo cáo:** xem số lượt đã gửi, phản hồi, có nhu cầu, cần hỗ trợ theo nhân sự. Lịch sử từng KH trong chiến dịch; CSV có đầy đủ kết quả đã lưu. Số liệu là nhân sự tự xác nhận, không phải xác nhận giao nhận từ Zalo.

## Phân quyền và dữ liệu

- Nhân sự chỉ xem khách thuộc mã Acc của mình, tạo và cập nhật chiến dịch của mình.
- Trưởng Bầy xem khách và báo cáo trong Bầy, được cập nhật thông tin KH trong Bầy; không sửa chiến dịch cá nhân của nhân sự khác.
- Trưởng phòng xem toàn phòng, tạo chiến dịch cho nhân sự, cập nhật/tạm dừng chiến dịch trong quyền.
- `care_contacts`: SĐT, trạng thái đồng ý, ghi chú, phiên bản và người cập nhật, theo mã HĐ.
- `care_campaigns`: nhân sự, nội dung, lịch đầu tiên/lịch hiện tại, lịch lặp, danh sách HĐ, kỳ, trạng thái và phiên bản.
- `care_results`: kết quả theo chiến dịch + kỳ + mã HĐ; lưu ghi chú và người/thời điểm cập nhật.
- Từ chối nhận tin áp dụng cho các HĐ có cùng SĐT đã lưu. Chỉ đưa vào chăm sóc lại sau khi ghi nhận sự đồng ý mới.
- Các bảng bật RLS, không mở truy cập trực tiếp cho trình duyệt. API kiểm tra đăng nhập, quyền theo nguồn NET và phiên bản để ngăn ghi đè giữa thiết bị. Không lưu phiên đăng nhập Zalo.

## Phạm vi phiên bản đầu

Lịch và kết quả lưu chung trên máy chủ, dùng được giữa các thiết bị. Nhắc đến lịch hiển thị trong IBB5; chưa có thông báo đẩy CSKH khi đóng ứng dụng. Chưa có tích hợp gửi bằng OA hay tự gửi từ Zalo cá nhân. Việc mở liên kết Zalo phụ thuộc khả năng tìm thấy KH và thiết lập riêng tư của tài khoản; có thể tìm bằng SĐT nếu liên kết không mở đúng người.
