# Cài IBB5 lên điện thoại

Bản cài trực tiếp từ website (PWA), dùng cùng Vercel project, tài khoản và dữ liệu hiện có. Không phải gói APK/IPA hay bản phát hành trên Google Play/App Store.

- Mở dashboard bằng Chrome trên Android hoặc Safari trên iPhone, chọn **Cài ứng dụng IBB5** ở trang đăng nhập hoặc menu dashboard.
- Android: khi trình duyệt đã sẵn sàng cho cài đặt, bấm **Cài ứng dụng IBB5** mở trực tiếp xác nhận của trình duyệt, không qua màn hình hướng dẫn. Nếu chưa được hỗ trợ, hiển thị cách dùng menu Chrome → Cài đặt ứng dụng / Thêm vào màn hình chính.
- iPhone/iPad: Safari → Chia sẻ → Thêm vào Màn hình chính → bật Mở dưới dạng ứng dụng web nếu có → Thêm.
- Manifest có ID/scope ở `/`, khởi chạy `/#overview`, chế độ standalone, icon PNG 192/512 và icon maskable, Apple touch icon 180px. CTA ẩn trong chế độ standalone/sau sự kiện cài xong.
- App cần Internet cho đăng nhập, dữ liệu và thao tác lưu. Service worker chỉ lưu trang hướng dẫn mất kết nối công khai; không cache index, mã ứng dụng, API, báo cáo hoặc thông tin phiên đăng nhập. Điều này giúp bản cài vẫn lấy mã/dữ liệu hiện tại, không dùng bản dữ liệu nghiệp vụ cũ từ service worker.
- Nhận thông báo ngoài app: mở IBB5 từ màn hình chính → chuông → **Bật thông báo điện thoại** → cho phép. iPhone/iPad yêu cầu iOS/iPadOS 16.4 trở lên. Có nút **Gửi thông báo thử** và **Tắt trên thiết bị này**. Không tự hỏi quyền khi mở app.

Kiểm tra: `npm run dev`, `npm run build`, `npm run preview`; `tests/install-app.browser.cjs` kiểm tra bản dựng production, manifest/icon, giao diện hướng dẫn Android/iPhone (giả lập trình duyệt), luồng sự kiện cài đặt, trạng thái standalone, mất mạng/khôi phục và việc API không bị thay bằng trang offline. Bước cài thực tế lên màn hình chính được người dùng xác nhận trên thiết bị.

Nguồn hướng dẫn: https://web.dev/articles/install-criteria và https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios
