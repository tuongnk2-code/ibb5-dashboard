# Kích hoạt AI cho Trợ lý IBB5

Phần câu hỏi mẫu vẫn hoạt động khi chưa có khóa AI. Máy chủ kiểm tra cấu hình qua `/api/assistant`; chỉ tài khoản đã đăng nhập được sử dụng.

1. Tạo khóa API trong tài khoản OpenAI có hạn mức sử dụng API.
2. Trong **dự án Vercel hiện tại**, vào Settings → Environment Variables, thêm `OPENAI_API_KEY` cho Production. Không dùng tên bắt đầu bằng `VITE_`; không đưa khóa vào Git, trình duyệt hoặc nội dung chat.
3. Có thể thêm `OPENAI_MODEL=gpt-4.1-mini` (mặc định nếu bỏ trống). Mô hình cần hỗ trợ Responses API và Structured Outputs.
4. Biến môi trường mới cần được đưa vào bản triển khai tiếp theo bằng luồng Git hiện tại: commit/push lên `main`, Vercel tự dựng. Không tạo dự án hoặc chạy lệnh triển khai riêng.
5. Sau khi triển khai, đăng nhập dashboard, mở Trợ lý IBB5 và bấm **Kết nối AI**. Khi có cấu hình, nút chuyển thành **AI: Bật**. Hỏi thử một câu ngắn để kiểm tra khóa và hạn mức; trạng thái có cấu hình chưa bảo đảm khóa hợp lệ.

API được tính phí riêng theo mức sử dụng của tài khoản OpenAI. Thiết lập ngân sách/cảnh báo trong tài khoản nhà cung cấp trước khi mở cho nhiều nhân viên. Không có khóa thực tế thì chưa thể kiểm chứng câu trả lời trực tiếp từ nhà cung cấp.

## Phạm vi hoạt động

- AI hiểu câu hỏi tiếp nối và diễn giải dữ liệu tổng hợp trong quyền của tài khoản đã được máy chủ xác minh. Số liệu được tính bằng các quy tắc hiện có của dashboard.
- Máy chủ gửi câu hỏi, tối đa 6 lượt lịch sử ngắn và các số liệu tổng hợp đã lọc quyền tới OpenAI. Không tự gửi toàn bộ file nguồn, tên khách hàng hoặc danh sách HĐ. Thông tin người dùng chủ động gõ trong câu hỏi cũng thuộc nội dung gửi đi.
- `store:false`; lịch sử trong giao diện chỉ giữ ở bộ nhớ phiên, có nút Xóa chat. Thiết lập này không phải cam kết không lưu giữ dữ liệu của nhà cung cấp; xem chính sách tài khoản OpenAI.
- AI chỉ đề xuất bản nháp cập nhật thông tin nhân viên theo dõi. API AI không ghi dữ liệu. Lưu và duyệt hủy vẫn qua API hiện có, kiểm tra quyền, phiên bản và xác nhận của người dùng.
- Mỗi câu hỏi đọc/phân tích dùng tối đa 2 lời gọi AI (hiểu ý + diễn giải), mỗi lời gọi giới hạn đầu ra; tra cứu, báo cáo ngày và tạo bản nháp dùng 1 lời gọi. Có giới hạn 8 yêu cầu/phút/tài khoản trong mỗi tiến trình máy chủ; đây không phải hạn mức chi phí toàn cục trên các phiên bản serverless.
- Khi AI lỗi hoặc hết hạn mức, dùng nút **AI: Tắt** để tiếp tục câu hỏi mẫu. Bot không tự chuyển yêu cầu sửa chưa thành công thành thao tác lưu.

Tài liệu: [OpenAI quickstart](https://developers.openai.com/api/docs/quickstart), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
