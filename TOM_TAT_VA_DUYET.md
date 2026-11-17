# Tóm tắt sản phẩm và 5 quyết định cần duyệt

Đọc nhanh — 17/11/2026. Bản đầy đủ: [PLAN_TRIEN_KHAI.md](./PLAN_TRIEN_KHAI.md).

## Sản phẩm sẽ có gì?

**Mộc Rewards** là app thẻ thành viên phong cách café: thẻ đổi màu theo hạng, QR, tích/đổi điểm, ví voucher và lịch sử. Một app có màn hình Thành viên, Quầy và Admin; tối ưu điện thoại lẫn desktop.

Giám khảo mở app → nạp đúng Excel BTC bằng một nút → chọn KT-004 hoặc đăng ký thành viên → Quầy cộng điểm → thử giao dịch trùng → đổi ưu đãi và xem ví/lịch sử. Bản Thi tiếp tục hoạt động khi tắt mạng sau khi đã tải ứng dụng.

Ngoài phần thi, có Cloud đăng nhập thật, phân quyền khách/nhân viên/admin và Supabase để dùng nhiều thiết bị. Không phải mock login hoặc chỉ ẩn nút admin.

## Những gì dữ liệu nguồn đã làm rõ

- Có 8 thành viên, 7 giao dịch, 3 ưu đãi; KT-004 là Dũng Phạm, 3.200 điểm, Bạc.
- Số dư mẫu đã gồm giao dịch. Hai sheet giao dịch/lịch sử cùng mô tả 7 biến động: không nạp hai lần.
- Ngưỡng mẫu Đồng <1.000, Bạc <5.000, Vàng từ 5.000. Dữ liệu có thành viên giảm từ 1.000 còn 800 và về Đồng.
- Voucher mẫu giá 500, 1.100, 2.000 điểm; không tự thay bằng chi phí khác khi demo ca BTC.
- Dòng đổi 200 điểm trong lịch sử không chỉ rõ ưu đãi: chỉ nhập lịch sử, không bịa voucher khả dụng.

## Tối đa 5 điểm duyệt — không trả lời thì dùng mặc định

### 1. Cách kết hợp offline và cơ sở dữ liệu thật

**ĐỀ XUẤT MẶC ĐỊNH:** Hai chế độ tách dữ liệu: Thi offline dùng localStorage và đổi vai trực tiếp; Cloud dùng Supabase/Auth thật. Cùng chức năng và giao diện, luôn ghi rõ đang ở chế độ nào. Không tự đồng bộ giao dịch giữa hai vùng.

Lựa chọn khác: chỉ localStorage (đúng lõi đề nhưng thiếu yêu cầu cloud/login thật của bạn); hoặc cloud có đồng bộ ghi offline (phức tạp, cần thêm cơ chế chống xung đột và thời gian kiểm thử).

Điểm cần hiểu: không thể chỉ thêm Supabase rồi tuyên bố mọi giao dịch ghi được offline và đồng bộ nhiều thiết bị an toàn. Mặc định ưu tiên bản thi ổn định, cloud online ghi thật; khi cloud mất mạng chỉ đọc cache.

### 2. Đăng nhập và phân quyền

**ĐỀ XUẤT MẶC ĐỊNH:** Thi offline đăng ký bằng tên + điện thoại đúng đề, không cần login. Cloud dùng email/password + hồ sơ tên/điện thoại; có khôi phục mật khẩu. Staff/admin do quản trị cấp; khách không thể tự đổi vai thành nhân viên trong cloud.

Lựa chọn khác: SMS OTP số điện thoại (cần nhà cung cấp, cấu hình và có thể phát sinh phí); hoặc magic link email (phụ thuộc việc nhận email khi demo).

Điểm cần hiểu: số điện thoại tự nhập chưa chứng minh sở hữu. Không cho người lạ chiếm tài khoản mẫu chỉ bằng nhập đúng số. Chuyển vai tự do vẫn có ở bản Thi theo đề.

### 3. Quy tắc tích điểm và hạng

**ĐỀ XUẤT MẶC ĐỊNH:** 10.000đ = 1 điểm, làm tròn xuống từng hóa đơn; Đồng <1.000, Bạc 1.000–4.999, Vàng ≥5.000; hạng theo số dư hiện tại nên đổi điểm có thể hạ hạng. Công bố rõ ở Thể lệ và dialog đổi.

Lựa chọn khác: hạng theo tổng điểm từng tích lũy, không hạ khi đổi (hợp một số mô hình loyalty nhưng cần công bố và giải thích khác mẫu KT-003); hoặc đổi mốc/tỷ lệ (dễ làm khó ca kiểm tra chung).

Điểm cần hiểu: giữ đúng mặc định giúp đối chiếu dataset và ca BTC nhanh nhất. Quà mặc định không hết hạn trong demo; khi dùng không bị trừ điểm thêm.

### 4. Mức mở rộng và ưu tiên làm

**ĐỀ XUẤT MẶC ĐỊNH:** Hoàn thành lõi/offline trước; sau đó QR hiển thị + quét camera, scanner USB dạng bàn phím, dashboard mini, hiệu ứng điểm/lên hạng và toàn bộ login/admin/cloud theo yêu cầu. Stack React/TypeScript/Vite, Supabase, PWA, deploy Vercel.

Lựa chọn khác: rút gọn bản thi local nếu sát giờ (chấp nhận cloud chưa hoàn thành); hoặc mở thêm POS/thanh toán/chatbot/push (không đề xuất trong bản thi).

Điểm cần hiểu: QR tối đa 4 điểm thưởng theo đề; không đánh đổi chống trùng/đổi đúng điểm để lấy hiệu ứng đẹp. Admin gồm thành viên, giao dịch, ưu đãi, KPI, dữ liệu; không chỉ một trang dashboard trang trí.

### 5. Hình thức triển khai và thương hiệu

**ĐỀ XUẤT MẶC ĐỊNH:** Thương hiệu tự thiết kế “Mộc Rewards”, tông xanh/kem, mobile-first. Vercel Hobby cho demo cá nhân/phi thương mại, Supabase Free, không dịch vụ trả phí. Kèm SQL Editor, README, test report, minh chứng AI và kịch bản video khoảng 2 phút.

Lựa chọn khác: dùng tên/màu đội thi; hoặc triển khai vận hành kinh doanh thật (cần xem lại điều khoản hosting, bảo vệ dữ liệu cá nhân, backup và chi phí).

Điểm cần hiểu: Free Supabase có thể pause; phải kiểm tra trước demo. Không sao chép nhận diện Starbucks. [Điều kiện Hobby](https://vercel.com/docs/plans/hobby) không cho mặc định dùng miễn phí cho mọi hoạt động thương mại.

## Tiêu chuẩn “xong” để bạn kiểm tra

1. Bấm nạp mẫu, có đúng KT-004/8 thành viên; bấm lại không mất điểm mới và không nhân đôi.
2. KT-008 cộng 1.000.000đ được 100 điểm; nhập lại mã không cộng thêm.
3. KT-005 đổi voucher 500 điểm còn 5.300, voucher xuất hiện trong ví; KT-008 ở baseline không đủ điểm bị từ chối.
4. Reload còn dữ liệu; tắt mạng và reload sau khi app báo sẵn sàng offline vẫn dùng được bản Thi.
5. QR camera đọc đúng mã, chưa cộng điểm khi chỉ quét; thẻ/lịch sử cập nhật đúng sau xác nhận giao dịch.
6. Cloud khách không sửa điểm, không đọc người khác; staff/admin có quyền thật, hai thao tác đồng thời không tạo điểm/voucher trùng.
7. Mobile không vỡ giao diện; build/test có kết quả thực; người khác clone chạy được và có SQL cấu hình cloud.

## Cách dùng hai file

Giao PLAN_TRIEN_KHAI.md và file này cho coding agent, kèm workbook nguồn. Agent thực hiện theo mặc định ngay, không chờ trả lời. Nếu muốn đổi lựa chọn, chỉ cần phản hồi số mục và nội dung, ví dụ “3: hạng theo điểm trọn đời; 5: đổi tên thành …”. Kế hoạch đã hoàn thành ở mức đặc tả; ứng dụng, SQL thực thi và deployment là đầu ra coding agent phải tạo ở bước triển khai tiếp theo.
