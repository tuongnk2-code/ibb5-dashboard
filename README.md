# IBB5 Dashboard — mã nguồn đã tách

## Chạy trên máy

Cài Node.js 20.19+ hoặc 22.12+ (có npm). Mở terminal tại thư mục này:

```sh
npm install
npm run dev
```

Mở địa chỉ mà Vite hiển thị. Không mở index.html bằng cách nhấp đúp vì ứng dụng dùng JavaScript module.

```sh
npm run build
npm run preview
```

## Các file

- `index.html`: cấu trúc giao diện, không còn CSS hay JavaScript nhúng.
- `css/style.css`: 49 khối CSS được gộp theo đúng thứ tự ban đầu, giữ biến CSS, media queries và các quy tắc ghi đè.
- `js/main.js`: xử lý giao diện, biểu đồ, bộ lọc, sự kiện, nhập/xuất và điều hướng.
- `js/api.js`: các hàm bất đồng bộ lấy dữ liệu mẫu; thay phần thân các hàm bằng truy vấn Supabase khi có backend.
- `js/mockData.js`: toàn bộ dữ liệu gốc, gồm 1.071 hợp đồng và 529 liên hệ, cùng metadata. Export `DATA` và `IBB_NET_META` cũng có sẵn.
- `js/mockData.sample.js`: bản mẫu rút gọn, tối đa 3 bản ghi mỗi nhóm; dùng để tham khảo, không được ứng dụng nạp.
- `js/vendor/jszip.min.js`: thư viện JSZip nguyên bản, giữ thông báo giấy phép.

Giữ đầy đủ dữ liệu trong ứng dụng giúp số liệu KPI và bảng không thay đổi. Các mảng cấu hình nhỏ phục vụ giao diện được giữ ở main.js. Thứ tự thực thi các khối xử lý được giữ như bản gốc. Các thuộc tính style trên phần tử vẫn được giữ nguyên.

## Kết nối Supabase ở bước tiếp theo

Thay các hàm `fetchContracts`, `fetchContractMetadata`, `fetchCameraMetadata`, `fetchTelevisionMetadata`, `fetchLatestInternetContracts`, `fetchContacts` trong `api.js`. Giữ cấu trúc trường dữ liệu hiện tại hoặc chuyển đổi kết quả truy vấn về cấu trúc đó trước khi trả về. Các hàm lấy dữ liệu mẫu trả về bản sao để phần xử lý giao diện không sửa trực tiếp dữ liệu nguồn.

Chưa cấu hình kết nối Supabase, đăng nhập hay quyền truy cập backend. Dữ liệu người dùng nhập, cam kết và vai trò mô phỏng vẫn dùng cơ chế localStorage như bản gốc. Tra cứu giá vẫn sử dụng API FPT có sẵn trong bản gốc.

## Kiểm tra

Đã kiểm tra cú pháp JavaScript và chạy đối chiếu với bản gốc trong Chrome headless ở kích thước 1440 × 1000. Các màn hình được đối chiếu có nội dung, số dòng bảng và chiều rộng trang giống bản gốc; không phát sinh lỗi JavaScript. Các yêu cầu ra dịch vụ bên ngoài bị chặn trong phép thử, nên chưa kiểm chứng phản hồi API FPT. Chưa chạy Vite build do môi trường hiện tại không có sẵn npm/Vite.

Đây là bước tái cấu trúc: cần kiểm tra thêm trên các trình duyệt và kích thước màn hình thực tế trước khi triển khai.
