# LCB

Nguồn bảng mốc: ảnh người dùng cung cấp. Công thức đã chốt: Tổng DV = NET × 0,8 + V.VIP × 1,7; không cộng thêm 0,5. Tính bằng phần mười nguyên để tránh sai số dấu phẩy động. Tổng DV gốc hiển thị tối đa 1 chữ số thập phân; DV đối chiếu làm tròn toán học, phần lẻ ≥ 0,5 lên và < 0,5 xuống. Ví dụ 46 NET + 6 V.VIP = 47 DV → mốc 46–50 → 7.800.000 đồng. 25,4 → 25 → 4.700.000; 25,5 hoặc 25,8 → 26 → 5.200.000.

Kỳ tháng T: từ ngày 1 tháng T đến hết ngày 4 tháng T+1, cả hai đầu đều được tính. Chỉ lấy HĐ có Ngày tạo thuộc tháng T, đồng thời có ngày Online thực tế trong kỳ; không dùng ngày hẹn. Kỳ đang chạy chỉ tính tới hôm nay giờ Việt Nam và ghi Tạm tính. Ngày 1–4 tháng T+1 chỉ bổ sung cho kỳ T nếu HĐ được tạo trong tháng T; HĐ tạo trong tháng T+1 thuộc kỳ T+1, không cộng ngược về T. NET và Truyền hình được khử trùng theo loại dịch vụ + mã HĐ, Acc không phân biệt hoa thường. Chỉ V.VIP=true từ nguồn Truyền hình mới tính vào V.VIP; không lấy toàn bộ Pay hay Camera. Nguồn là snapshot chung hiện có, giữ các tháng cũ khi nhập file mới.

TP đánh dấu thử việc theo từng tháng/từng Acc: mức 4.500.000 đồng, ghi đè mốc dịch vụ của tháng đó. Mặc định chưa đánh dấu thử việc; không suy đoán từ thâm niên. Thay đổi không tự áp dụng cho tháng khác. Tổng LCB theo Bầy/phạm vi là tổng LCB từng người, không tra bảng lại trên tổng DV Bầy.

GET /api/salary?month=YYYY-MM kiểm tra phiên đăng nhập và chỉ trả nhân sự theo phạm vi: TP toàn phòng, Trưởng Bầy Bầy mình, nhân viên của mình. POST chỉ TP được đổi cờ probation và kiểm tra revision, không nhận giá lương tùy ý từ client. salary_settings/salary_setting_history bật RLS, chỉ server có quyền trực tiếp; trigger lưu bản cũ trước mỗi lần cập nhật. Lịch sử thử việc tách biệt với dữ liệu hợp đồng.

UI tự đồng bộ khi đang mở tab, có lọc tháng/Bầy/Acc và CSV. Xem được đầy đủ bảng mốc gốc. Trạng thái đủ thời gian kỳ không đồng nghĩa đã được TP chốt bảng lương; đây là đối chiếu LCB theo bảng và nguồn hiện có.

Kiểm tra: node --test tests/salary*.test.js; node tests/salary.browser.cjs; npm run build. Chạy supabase/salary-settings.sql tại project hiện có trước khi đưa tab lên production.

Trường hợp kiểm thử theo số liệu người dùng xác nhận: tháng 10/2026 có 45 NET (42 Online trong tháng, 3 Online đến 04/11) và 30 V.VIP (27 + 3), Tổng DV = 87, mốc 86–90, LCB = 14.800.000 đồng. Quy tắc tháng tạo áp dụng cho toàn bộ nhân sự, không điều chỉnh riêng một Acc.
