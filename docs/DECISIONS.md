# Quyết định triển khai

- Phạm vi cuối gồm hai vai Thành viên và Quầy, thống kê mini, QR, thiết bị và hỗ trợ giám khảo. Dữ liệu nằm trong trình duyệt và dùng được offline sau lần mở đầu bản production.
- Dùng điểm hiện có để tính hạng, theo ví dụ BTC. Đổi thưởng có thể hạ hạng. Dòng đổi 200 điểm trong dữ liệu lịch sử BTC giữ nguyên theo nguồn và không có voucher liên kết.
- Khóa Web Locks hỗ trợ thao tác ghi đồng thời trên trình duyệt có API này. Các trình duyệt còn lại đọc trạng thái mới nhất ngay trước khi ghi.
- Chế độ thi dùng chung dữ liệu giữa các tab cùng origin và hồ sơ trình duyệt. Trình duyệt hoặc thiết bị khác có dữ liệu riêng.
