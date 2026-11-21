# Thông báo điện thoại IBB5

Đã bổ sung Web Push cho bản cài trên điện thoại. iPhone/iPad cần mở IBB5 từ Màn hình chính, iOS/iPadOS 16.4+ và cấp quyền. Âm thanh, banner, màn hình khóa, huy hiệu phụ thuộc cài đặt thông báo/Focus của hệ điều hành; website không tự chọn âm thanh như một ứng dụng native.

## Người dùng

Mở chuông → **Bật thông báo điện thoại** → **Cho phép**. Sau khi bật, chọn **Gửi thông báo thử** để kiểm tra thiết bị thật. Có thể tắt riêng thiết bị. Đăng xuất hủy đăng ký trên thiết bị và đóng các thông báo đang hiển thị; lỗi mạng không ngăn đăng xuất.

Thông báo chỉ chứa số phản hồi/HĐ cần xử lý, không hiện tên khách hàng hay nội dung báo cáo trên màn hình khóa. Bấm thông báo mở hộp thông báo của tài khoản đang đăng nhập. Số huy hiệu dùng Badging API khi thiết bị hỗ trợ; được đồng bộ khi nhận push hoặc mở app.

## Máy chủ

- `api/phone-push.js`: API xác thực cho khóa công khai, đăng ký/tắt/gửi thử thiết bị của chính tài khoản. Khóa riêng và secret bộ gửi không trả về client. Endpoint chỉ cho các dịch vụ push đã biết, giới hạn 10 thiết bị/tài khoản và gửi thử tối đa một lần/phút.
- `supabase/phone-push.sql`: bảng đăng ký và cấu hình gửi chỉ service_role đọc/ghi, RLS bật, RPC nội bộ chỉ service_role thực thi. Cặp VAPID được tạo một lần, lưu riêng trên máy chủ hiện tại; không lưu vào Git hay client.
- Supabase Edge Function **ibb5-phone-push** đã triển khai ở dự án hiện tại. Dùng `npm:web-push@3.6.7`, tự xác thực bằng shared secret, có khóa lease, kiểm tra lại quyền tài khoản ở mỗi lượt gửi. Không cần biến môi trường Vercel mới.
- Khi có phản hồi mới, trigger xếp yêu cầu gửi. Job `ibb5-phone-push` chạy mỗi 2 phút để xử lý phần còn lại và thử lại khi lỗi tạm thời. Một push tóm tắt theo thiết bị; không tạo hàng loạt banner cho cùng nhóm. Lưu cursor chỉ sau khi dịch vụ push chấp nhận.
- Nhắc HĐ 08:00–20:00 giờ Việt Nam, tối đa một lần mỗi 30 phút khi nội dung thay đổi; chỉ nhắc lại mỗi ngày đối với cảnh báo **chưa xem**. Cảnh báo đã xem được lưu theo chữ ký nội dung trong `contract_alert_reads`, loại khỏi cả badge và bộ gửi cho mọi thiết bị cùng tài khoản. Không nhắc lại chỉ vì sang ngày mới; có thông tin/điều kiện cảnh báo mới thì có thể hiện lại. Dùng cùng mô hình cảnh báo/quyền xem trong dashboard và trạng thái NET/cập nhật mới nhất.
- Thiết bị hết hạn (404/410) được loại bỏ. Lỗi tạm thời có backoff. Nếu xếp yêu cầu tức thời lỗi, thao tác lưu bình luận vẫn hoàn tất và job định kỳ sẽ thử lại.
- Service worker chỉ cache trang hướng dẫn mất mạng; không cache dữ liệu riêng hoặc mã ứng dụng. Payload push luôn tạo thông báo hiển thị, không gửi silent push.

## Kiểm tra và triển khai lại

`node --test tests/phone-push.test.js tests/phone-push-worker.test.cjs tests/phone-push-dispatcher.test.cjs` kiểm tra scope, chống trùng, retry, khóa công khai, nhận push và mở app bằng giả lập. `tests/phone-push.browser.cjs` kiểm tra luồng quyền, đăng ký/gửi thử/tắt, badge và hướng dẫn khi bị chặn (API/thiết bị giả lập, không gửi push thật).

Worker source tại `supabase/functions/ibb5-phone-push/index.ts`. Khi triển khai, bundle bằng esbuild với `bundle:true`, `format:'esm'`, `platform:'neutral'`, `external:['npm:*']`; gửi nội dung đã bundle vào Edge Function cùng tên, `verify_jwt:false` vì handler tự kiểm tra shared secret trước mọi thao tác. Thay đổi frontend/API được Vercel triển khai qua push main; worker/schema/job là phần triển khai Supabase riêng.

Kiểm tra quyền và job trên máy chủ bằng truy vấn chỉ đọc; worker đã khởi động và từ chối phương thức không được hỗ trợ. Thử gửi trực tiếp trên production và ghi thử transaction bị phê duyệt tự động từ chối do có thể kích hoạt gửi tới thiết bị thật. Chưa xác nhận giao nhận end-to-end trên iPhone; người dùng tự bấm **Gửi thông báo thử** sau khi cấp quyền. Không coi kết quả giả lập hay HTTP 202 là bằng chứng điện thoại đã nhận thông báo.

Tài liệu: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ và https://supabase.com/docs/guides/cron/quickstart
