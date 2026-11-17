# Kết quả kiểm thử

- **Khởi động cục bộ.** Node 20.18.0 và npm 10.8.2. Vite phục vụ trang tại `http://localhost:5173/` với HTTP 200.
- **Kiểm tra mã.** `npm run check` đạt ESLint, TypeScript, 12 bài Vitest và production build.
- **Kiểm tra giao diện.** 16 lượt Playwright đạt trên Chromium ở desktop 1280×800 và mobile 390×844, có kiểm tra thêm ở 360px. Bao gồm nạp mẫu, 5 ca BTC, QR từ ảnh gốc, chặn giao dịch trùng, đổi và dùng voucher, đồng bộ giữa hai tab, chặn cộng nhầm khi sửa mã, thống kê và giao dịch offline sau khi tải lại.
- **Thiết bị thật.** Camera trên điện thoại, đầu quét USB/Bluetooth và máy in chưa được thử trên thiết bị vật lý trong phiên này. Quét QR chuẩn KT-004 qua tải ảnh đã được xác nhận.
