# Kiến trúc

SPA Vite và React dùng chung mô hình TypeScript cho vai Thành viên và Quầy. Hàm nghiệp vụ thuần trong `src/domain` tạo trạng thái kế tiếp. `src/data/storage.ts` đọc phiên bản gần nhất, xác thực bằng Zod, lấy Web Lock khi trình duyệt hỗ trợ, rồi ghi cả trạng thái vào một mục localStorage. Sự kiện storage cập nhật các tab cùng origin.

Bản ghi thành viên lưu số dư và điểm đầu kỳ. Sổ điểm liên kết với mã thành viên và mã giao dịch duy nhất. Ưu đãi được đổi thành voucher trong ví cùng lúc với dòng trừ điểm. Hạng được suy ra từ số dư. Voucher hết hạn theo thời gian hiệu lực, hoặc được đánh dấu đã dùng ở Quầy.

Workbook của BTC được chuẩn hóa ở bước tạo nguồn dữ liệu. Workbox precache trang, JavaScript, CSS, font, icon và QR mẫu cho bản production.
