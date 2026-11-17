# Vibe Rewards

Vibe Rewards số hóa thẻ thành viên với hai vai **Thành viên** và **Quầy** trong cùng một web app tiếng Việt. Dữ liệu lưu trong trình duyệt bằng `localStorage`. Bản production có thể mở và giao dịch offline sau lần tải đầu.

## Chạy demo

```sh
npm install
npm run dev
```

Máy đã cài dependencies chỉ cần chạy `npm run dev`. Mở địa chỉ Vite in trong terminal, mặc định là `http://localhost:5173`. App chạy với cấu hình mặc định. Nếu muốn đổi tên chương trình, sao chép `.env.example` thành `.env` và sửa `VITE_APP_NAME`. Git bỏ qua `.env`.

1. Bấm **Nạp dữ liệu mẫu** và xác nhận. Thẻ **KT-004** của Dũng Phạm hiện **3.200 điểm**, hạng **Bạc**.
2. Chuyển sang **Quầy**, tra cứu KT-008, nhập **1.000.000đ** và **TX-NEW-001** để cộng **100 điểm**. Gửi lại cùng mã để thấy thông báo trùng.
3. Chọn thẻ **KT-005** ở vai Thành viên và đổi **Voucher 20.000đ**. Số dư còn **5.300 điểm** và voucher xuất hiện trong ví.
4. Mở **Giám khảo** để chạy tự kiểm tra năm ca, xem QR chuẩn KT-004 hoặc mở từng ca đã điền sẵn.
5. Mở **Thống kê** để xem tổng thành viên và tổng điểm đã phát.

Dữ liệu mẫu gồm 8 thành viên, 7 giao dịch, 3 ưu đãi và 8 ảnh QR từ workbook trong repo. Nạp lại sẽ thay thế dữ liệu cục bộ. Tỉ lệ mặc định **10.000đ = 1 điểm** làm tròn xuống. Hạng **Đồng** dưới 1.000 điểm, **Bạc** từ 1.000 điểm và **Vàng** từ 5.000 điểm. App công bố toàn bộ quy tắc ở mục **Thể lệ**.

## QR, offline và triển khai

- Quầy có thể đọc QR bằng camera, chọn ảnh, nhập mã tay hoặc dùng đầu quét USB/Bluetooth gửi mã rồi Enter. Camera trình duyệt hoạt động trên HTTPS hoặc localhost.
- Kiểm tra offline với `npm run build` rồi `npm run preview`. Mở bản preview một lần để service worker tải tài nguyên, sau đó ngắt mạng và tải lại trang. Máy chủ dev dùng cho phát triển nhanh.
- `npm run check` chạy ESLint, TypeScript, Vitest và production build. Để chạy kiểm thử trình duyệt, dùng `npx playwright install chromium` rồi `npm run e2e`.
- Repo có thể nhập vào Vercel với preset **Vite**, build bằng `npm run build` và publish thư mục `dist`. Vercel dùng HTTPS cho luồng camera. Không cần API key cho bản demo.
- Khi tái tạo dữ liệu mẫu từ workbook BTC, chạy `python scripts/seed.py`.

Xem thêm [hướng dẫn sử dụng](docs/USER_GUIDE.md), [kiến trúc](docs/ARCHITECTURE.md), [quyết định triển khai](docs/DECISIONS.md), [kịch bản demo](docs/DEMO_SCRIPT.md) và [kết quả kiểm thử](docs/TEST_REPORT.md).
