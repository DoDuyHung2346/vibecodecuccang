# Phạm vi thực thi cập nhật

Yêu cầu mới nhất của người dùng thay phần Cloud trong các plan cũ: app hoàn toàn localStorage, không Supabase, không Auth, không API AI. SQL cũ giữ làm tham khảo, không dùng trong build. Không cần bí mật để chạy.

Giữ đăng ký, thẻ/hạng, Quầy cộng/chống trùng, đổi/ ví, lịch sử, mẫu BTC, QR camera/ảnh, KPI và bảng kiểm tra giám khảo. Bỏ nhân sự, cấu hình tỷ lệ động, điều chỉnh/hoàn tác điểm, thiết bị Serial/NFC. Quy tắc cố định giúp minh bạch và tránh sai sổ.

Hạng theo số dư hiện tại, có thể giảm khi đổi. Voucher hạn 30 ngày, dùng một lần. Tổng điểm đã phát chỉ tính earn trong ledger, không cộng điểm đầu kỳ; đầu kỳ hiển thị riêng trong đối soát.

Nạp mẫu lần sau không ghi đè dữ liệu mới; nút Đặt lại mẫu có xác nhận riêng. JSON backup phải qua kiểm tra tham chiếu/số dư/uniqueness. Lưu một envelope nguyên tử, Web Locks bảo vệ nhiều tab, storage event cập nhật UI.

Stitch: biết project 15339200990917340245 và bốn screen ID từ người dùng nhưng chưa có export HTML/ảnh hoặc hosted URLs. Không tuyên bố đã tải/khớp thiết kế Stitch; giao diện tự xây theo design tokens plan hiện có. Khi có export có thể đối chiếu visual mà giữ nguyên domain.

Sites skill dùng hướng dẫn phát triển/preview local; không đăng ký hosting Sites do người dùng yêu cầu repo sẵn deploy Vercel. Không tự push/deploy.
