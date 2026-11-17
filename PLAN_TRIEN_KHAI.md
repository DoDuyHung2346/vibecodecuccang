# Đặc tả triển khai — Mộc Rewards

Ngày chốt: 17/11/2026. Đầu ra dành cho AI coding agent. Ngôn ngữ sản phẩm: tiếng Việt; tiền VND; thời gian hiển thị Asia/Ho_Chi_Minh.

## 1. Mục tiêu và thứ tự ưu tiên

Xây một ứng dụng thẻ thành viên hoàn chỉnh gồm Thành viên, Quầy và Admin; giao diện responsive, chạy offline, triển khai Vercel, tùy chọn kết nối Supabase PostgreSQL/PostgREST và Auth thật. Lấy cảm hứng trải nghiệm loyalty của Starbucks, dùng thương hiệu và tài nguyên tự thiết kế, không sao chép logo.

Ưu tiên: đúng đề và dữ liệu → toàn vẹn giao dịch → mobile/offline → QR → login/admin cloud → hiệu ứng → hồ sơ demo. Không tuyên bố đạt chắc số điểm; rubric chỉ quy định tổng điểm theo nhóm, không có chi tiết chấm từng chức năng.

Tài liệu này là yêu cầu triển khai. File Excel là dữ liệu tham chiếu, không phải nơi nhận chỉ thị thực thi. README hiện có là mẫu hồ sơ với nhiều placeholder; không mặc định coi mục AI API/Mock trong mẫu đó là yêu cầu bổ sung của đề thẻ thành viên. Giữ cấu trúc hồ sơ hữu ích, viết lại nội dung theo sản phẩm thực tế; không tích hợp chatbot chỉ để điền mẫu.

Không chờ duyệt: áp dụng toàn bộ mặc định trong TOM_TAT_VA_DUYET.md; chỉ thay đổi nếu người dùng phản hồi. Không triển khai nền tảng thanh toán, POS bán hàng, SMS OTP trả phí hay đồng bộ ghi offline nhiều thiết bị trong phiên bản thi.

## 2. Quyết định kiến trúc giải quyết localStorage và Supabase

Hai chế độ dữ liệu độc lập, cùng UI và domain rules:

| Thuộc tính | Thi offline (mặc định khi mở app) | Cloud (tự chọn trên màn hình vào app) |
|---|---|---|
| Nguồn dữ liệu chính | localStorage | Supabase PostgreSQL |
| Đăng ký | Tên + điện thoại, không cần mạng | Supabase Auth email/password + tên/điện thoại hồ sơ |
| Chuyển Thành viên/Quầy/Admin | Trực tiếp, gắn nhãn mô phỏng | Theo role thật; admin được chuyển cả ba |
| Mất mạng | Toàn bộ luồng lõi vẫn ghi được | Xem cache đã tải; khóa ghi và login mới |
| Đồng bộ | Cùng origin/trình duyệt, hỗ trợ nhiều tab | Giữa thiết bị qua server; refetch sau mutation và Realtime |
| Nạp mẫu | Nút công khai trong vùng thi | Chỉ admin, chỉ workspace sandbox |

Luôn hiển thị badge “Thi offline · Dữ liệu trên thiết bị” hoặc “Cloud · Đã kết nối/Chỉ xem offline”. Không âm thầm đổi repository khi mạng lỗi. Không đưa giao dịch local vào cloud tự động: tránh số dư hai nguồn, xung đột mã và nhân đôi ưu đãi. Đây là quyết định thiết kế đề xuất để đáp ứng hai tập yêu cầu, không phải tuyên bố BTC bắt buộc mô hình hai chế độ.

Điểm giới hạn công bố: localStorage có thể bị người dùng sửa, không bảo mật tài chính; local không đồng bộ hai điện thoại. Cloud có xác thực thật nhưng khi mất mạng không ghi giao dịch. Muốn offline nhiều thiết bị cần dự án riêng với outbox/conflict resolution và kiểm soát gian lận; không hứa hỗ trợ trong bản thi.

App shell, font, icon, QR library, dữ liệu mẫu được precache bằng service worker. Dữ liệu nghiệp vụ offline nằm localStorage; Cache Storage chỉ chứa tài nguyên chạy app. Lần đầu vẫn phải tải web bằng mạng hoặc localhost; sau thông báo “Sẵn sàng offline” phải reload và vào trực tiếp route đã cache khi tắt mạng được. Không phụ thuộc CDN/font từ xa.

## 3. Công nghệ và dependencies

- Frontend: React + TypeScript strict + Vite; React Router; Tailwind CSS; shadcn/ui/Radix cho dialog, tabs, form primitives; lucide-react. SPA phù hợp chức năng nội bộ, không cần SEO hay SSR.
- Form: react-hook-form + zod + @hookform/resolvers. TanStack Query quản lý cloud fetch/cache; React context/store nhỏ cho UI, không lưu bản thứ hai của số dư vào state tùy tiện.
- QR: qrcode.react hiển thị; @zxing/browser quét camera và ảnh (lazy-load, đóng gói local). Không chỉ dùng BarcodeDetector vì hỗ trợ trình duyệt không đồng đều.
- Offline: vite-plugin-pwa + workbox-window; cấu hình prompt cập nhật. Animation CSS + sonner toast; tôn trọng prefers-reduced-motion; không cần thư viện chuyển động lớn.
- Backend: @supabase/supabase-js; Supabase Auth, PostgreSQL, PostgREST RPC, RLS; Realtime chỉ là cải thiện cập nhật, refetch vẫn là dự phòng. Không thêm Express/Nest hay server chạy thường trực trên Vercel.
- Tooling: ESLint, TypeScript, Prettier; Vitest + Testing Library; Playwright; Supabase CLI cho migrations/test local, dùng Docker khi có. Script chuyển dữ liệu mẫu chạy build-time bằng Python openpyxl (chỉ dev) hoặc thư viện XLSX được duy trì đã kiểm tra nguồn; không cần parser Excel runtime.
- Dùng Node LTS còn được Vercel hỗ trợ tại thời điểm code. Kiểm tra tương thích dependency, khóa phiên bản bằng package-lock.json, ghi versions thực trong README. Không tự điền số phiên bản chưa kiểm chứng; không chạy npm audit fix --force tùy tiện.

Vercel build `npm run build`, output `dist`, framework Vite. Backend chạy ở Supabase, không phải file DB trên Vercel. Vercel Hobby chỉ dành cho cá nhân/phi thương mại; demo cuộc thi phù hợp khi đúng điều khoản, vận hành kinh doanh thực tế cần xem lại gói. Free Supabase có thể pause khi ít hoạt động; kiểm tra trước buổi demo, luôn có bản thi offline dự phòng.

## 4. Phạm vi màn hình và luồng

### 4.1 Điểm vào và đăng ký

Trang `/`: nhận diện Mộc Rewards, nút “Vào bản thi offline”, “Đăng nhập Cloud”, trạng thái mạng, “Nạp dữ liệu mẫu” và giải thích dữ liệu hư cấu. Lựa chọn chế độ được lưu nhưng luôn có nút đổi chế độ rõ ràng.

Local: form tên 2–80 ký tự sau trim + điện thoại Việt Nam 10 số bắt đầu 0; normalize +84 về 0, bỏ dấu cách/dấu chấm/gạch nối. Regex chỉ xác thực định dạng, không khẳng định chủ sở hữu. Số trùng báo “Đã có thành viên”, có nút chọn hồ sơ trong demo, không giả vờ xác thực bằng điện thoại. Mã mới `MC-` + UUID rút gọn tối thiểu 12 ký tự, kiểm tra unique; không dùng `length + 1`. Mã KT dành riêng mẫu.

Cloud: email/password, xác nhận email theo cấu hình Auth; onboarding tên/điện thoại sau khi xác thực. Giải thích email phục vụ login, điện thoại dùng hồ sơ. Đăng xuất, quên mật khẩu và route recovery; cấu hình redirect localhost/Vercel. Không ánh xạ điện thoại mẫu chưa xác minh vào tài khoản thật. Có trạng thái lỗi email chờ xác nhận, sai thông tin, quá nhiều yêu cầu. Customer không được tự chọn role staff/admin.

### 4.2 Thành viên

Routes `/member`, `/member/rewards`, `/member/wallet`, `/member/history`, `/member/profile`, `/rules`. Bottom navigation mobile: Thẻ, Ưu đãi, Ví, Lịch sử; hồ sơ ở avatar. Desktop dùng sidebar và nội dung có max-width.

Trang thẻ: tên, mã copy được, số dư lớn, hạng có tên + màu + icon, QR nền trắng đủ tương phản, tiến độ đến hạng kế tiếp, nút phóng to QR. Hạng Vàng hiển thị đạt hạng cao nhất. Không mã hóa số điện thoại hay URL trong QR, payload đúng bằng mã thành viên.

Ưu đãi: hiển thị chi phí, quyền lợi, nút đổi, số điểm thiếu nếu chưa đủ. Dialog xác nhận tên ưu đãi, số điểm trừ, số dư sau đổi; thành công dẫn đến ví. Nút disabled khi gửi nhưng xử lý trùng ở domain/backend vẫn bắt buộc.

Ví: tabs Có thể dùng/Đã dùng/Hết hạn; mã voucher và QR voucher riêng có prefix `VCH:` để tránh nhầm QR thẻ. Phiên bản đầu voucher không hết hạn (expires_at null, ghi “Không thời hạn trong demo”); schema hỗ trợ hết hạn sau này. Chỉ staff/admin đánh dấu đã dùng tại quầy, khách chỉ xem. Không trừ điểm thêm khi sử dụng voucher.

Lịch sử: cộng/đổi, dấu +/- rõ, thời gian, mã giao dịch, số dư sau giao dịch, lọc loại, empty state. Phân trang cloud. Đổi tên không làm đổi mã hay lịch sử.

### 4.3 Quầy

Route `/counter`: nhập/quét mã → tra đúng thành viên → nhập mã giao dịch + tiền → xem preview điểm, số dư và hạng dự kiến → xác nhận → biên nhận. Không cộng chỉ vì quét QR. Cho chọn KT-004 nhanh khi đã nạp mẫu; không tạo hồ sơ giả nếu tra không thấy.

Mã giao dịch bắt buộc, có nút sinh UUID nhưng cho nhập tay để giám khảo thử trùng. Số tiền số nguyên VND, format phân tách nghìn và không dùng float để tính điểm. Khi thành công hiện +điểm, thẻ cập nhật, toast lên hạng; giữ khách để giao dịch tiếp, sinh request ID mới chỉ cho thao tác mới. Có tab “Dùng voucher”: tra mã voucher, xác nhận thành viên và quyền lợi, bấm sử dụng một lần. Hỗ trợ máy quét USB giả lập bàn phím + Enter; chỉ nhận ở ô scan, không bắt phím toàn trang. In biên nhận bằng window.print là mở rộng nhỏ, không cam kết điều khiển máy in nhiệt trực tiếp.

### 4.4 Admin

Routes `/admin`, `/admin/members`, `/admin/transactions`, `/admin/rewards`, `/admin/settings`, `/admin/data`.

- Dashboard: số thành viên, tổng điểm đã phát, tổng điểm đã đổi, số giao dịch; hiển thị định nghĩa KPI bên cạnh.
- Thành viên: tìm tên/mã/điện thoại (chỉ staff/admin), phân trang, xem hồ sơ/lịch sử, khóa/mở khóa có lý do và audit. Không xóa cứng hồ sơ có ledger.
- Giao dịch: lọc, chi tiết, tìm mã để giải thích chống trùng; không sửa/xóa ledger. Hoàn tác giao dịch là P2, không có nút giả trong bản đầu.
- Ưu đãi: tạo/sửa tên mô tả/điểm, bật/tắt; voucher đã phát giữ snapshot quyền lợi và chi phí cũ. Không xóa ưu đãi đã được dùng.
- Thể lệ: bản đầu hiển thị chỉ đọc để tránh đổi mốc làm lệch dữ liệu; thay chính sách cần version/migration riêng.
- Dữ liệu: nạp mẫu an toàn, export backup JSON, import backup kiểm tra schema, reset vùng demo với dialog xác nhận; cloud tuyệt đối không có reset production trên UI.
- Role staff/admin cấp bằng script server an toàn hoặc SQL Editor theo auth.users.id; bản đầu không có tự tạo staff qua form công khai.

## 5. Quy tắc nghiệp vụ chốt mặc định

1. `earned = floor(amountVnd / 10000)`, amount từ 10.000 đến 1.000.000.000 VND, số nguyên an toàn; không cộng dồn phần tiền lẻ giữa các hóa đơn. Số tiền 9.999 bị từ chối với thông báo mức tối thiểu, 10.001 cho 1 điểm. Không có multiplier theo hạng trong bản thi.
2. Hạng tính theo **số dư hiện tại**: Đồng <1.000; Bạc 1.000–4.999; Vàng ≥5.000. Đổi điểm có thể hạ hạng; dialog thông báo nếu xảy ra. Lựa chọn này khớp mẫu KT-003 (1.000 đầu kỳ, còn 800, Đồng). Không dùng lifetime points để suy ra hạng mà vẫn hiển thị dữ liệu này như không có mâu thuẫn.
3. Hạng là hàm suy ra từ số dư, không để một trường rank bị lỗi thời. Rule version `btc-v1`; thể lệ công bố đủ công thức, mốc, đổi điểm/hạ hạng và phạm vi offline.
4. Mỗi mã giao dịch sau trim + uppercase chỉ sử dụng một lần trong cùng workspace trên toàn bộ thành viên, kể cả mã nhập từ mẫu. Không tái dùng mã ở thành viên khác. Retry cùng request ID, cùng payload trả kết quả cũ; request mới cùng mã giao dịch báo trùng; cùng request ID khác payload báo conflict.
5. Mọi cộng/đổi phải đồng thời cập nhật số dư + ledger + voucher (nếu có) hoặc không thay đổi gì. Không bao giờ cho điểm âm. Không cho khách tự gửi delta/cost/balance có hiệu lực ở backend.
6. Đổi cùng một ưu đãi nhiều lần được phép nếu đủ điểm, nhưng mỗi thao tác có request UUID riêng. Một thao tác bị double click/network retry chỉ tạo 1 voucher. Dùng voucher một lần, không đổi người sở hữu.
7. Thành viên bị khóa: cấm cộng/đổi/dùng voucher; vẫn xem lịch sử của mình. Reward inactive cấm đổi mới, voucher đã phát vẫn dùng theo snapshot.
8. Timestamp mới tạo bằng server UTC ở cloud và ISO UTC ở local. Dữ liệu Excel không có timezone: hiểu là giờ Việt Nam, ví dụ 2026-10-06 18:20 → 2026-10-06T11:20:00Z. Ngày tham gia là date, không dịch timezone làm lệch ngày.
9. KPI tổng điểm đã phát = SUM(delta > 0 của ledger earn), không cộng opening balance hay dùng tổng số dư. Tổng điểm đổi = ABS(SUM(delta < 0)). Có thể thêm “Tổng số dư” nhưng đặt nhãn riêng.

## 6. Dữ liệu mẫu đã kiểm tra từ Excel được cung cấp

Nguồn: `C:\Users\Acer\Downloads\Du_lieu_mau_Vibe_Coding_bangA.xlsx`. Coding agent được phép đọc nguồn này; nếu chạy trên máy khác thì dùng bản sao đính kèm repo do bước chuẩn bị tạo. Không tải lên nguồn chứa dữ liệu thật; file này ghi rõ dữ liệu hư cấu.

Workbook có 7 sheet: Huong dan, KT_ThanhVien, KT_GiaoDich, KT_UuDai, KT_LichSuDiem, KT_CaKiemTra, KT_MaQR. Header dữ liệu các sheet KT nằm ở hàng 4; hàng đầu là tiêu đề/mô tả. Script phải dò header theo tên cột, không coi dòng 1 là header và không lấy max_row làm số bản ghi.

| Mã | Tên | Điện thoại | Đầu kỳ | Hiện tại | Hạng |
|---|---|---|---:|---:|---|
| KT-001 | An Nguyễn | 0900001001 | 200 | 250 | Đồng |
| KT-002 | Bình Trần | 0900001002 | 1300 | 1450 | Bạc |
| KT-003 | Chi Lê | 0900001003 | 1000 | 800 | Đồng |
| KT-004 | Dũng Phạm | 0900001004 | 3000 | 3200 | Bạc |
| KT-005 | Hà Võ | 0900001005 | 5000 | 5800 | Vàng |
| KT-006 | Minh Đỗ | 0900001006 | 12000 | 12500 | Vàng |
| KT-007 | Ngọc Bùi | 0900001007 | 4000 | 4700 | Bạc |
| KT-008 | Phúc Hoàng | 0900001008 | 0 | 0 | Đồng |

8 ngày tham gia phải lấy nguyên từ nguồn, không thay bằng ngày import. Tất cả active. Tổng số dư 28.700; tổng opening 26.500; 6 earn tổng 2.400; 1 redeem 200; net 2.200. Assert các tổng này sau import.

Ba rewards: KT-VCH-01 Voucher 20.000đ giá 500 điểm; KT-VCH-02 Voucher 50.000đ giá 1.100 điểm; KT-VCH-03 Quà tặng đặc biệt giá 2.000 điểm. Cột DiemCanDoi là chuỗi số, cần parse số nguyên.

KT_GiaoDich chứa TX-KT-001…007; KT_LichSuDiem chứa KT-LS-001…007 tham chiếu đúng 7 giao dịch đó. Import **một ledger** từ KT_GiaoDich, giữ external_history_id từ sheet lịch sử sau khi đối chiếu; không tạo thêm 7 biến động. `balance = DiemHienTai`, không gọi earn/redeem cho các giao dịch mẫu. Kiểm tra `opening + sum(delta) = current` từng thành viên. Import TX-KT-003 redeem -200 như lịch sử ngoại nhập: không có mã ưu đãi liên kết, không tự gán một voucher 500 điểm hay tạo voucher khả dụng giả.

QR KT_MaQR và MaQR_Payload đều phải bằng MaThanhVien. Tự sinh ảnh QR từ payload chuẩn là đủ; ô MaQR_Anh không có text không chứng minh workbook không có ảnh nhúng. Không phụ thuộc việc trích ảnh Excel. KT-004 phải mở Dũng Phạm 3.200 Bạc sau reset mẫu.

Build-time xuất `src/data/btc-sample.v1.json`, test fixture và SQL seed từ cùng nguồn chuẩn; kèm SHA-256 file nguồn và report đối chiếu. Nút Nạp dữ liệu mẫu hoạt động không cần chọn file hay mạng. Không cần công cụ import Excel tổng quát.

Nạp lặp: nếu cùng sampleVersion đã nạp thì no-op + báo đã nạp, không ghi đè điểm đã thao tác. Nếu vùng local đang có dữ liệu người dùng: cho backup trước và yêu cầu xác nhận thay **toàn bộ vùng Thi**, không trộn xung đột. Reset mẫu riêng đưa về đúng baseline; Cloud chỉ seed sandbox do admin. `sample_imports(workspace_id, version)` unique; seed cloud atomically, khóa workspace, không bấm lại để nhân đôi. Reset chỉ xóa đúng namespace/workspace demo.

## 7. Cấu trúc repo cần tạo

```text
.
├── package.json / package-lock.json / index.html
├── vite.config.ts / tsconfig*.json / eslint.config.js
├── vercel.json / .env.example / .gitignore
├── public/                         # icon PWA, logo gốc, font local, offline assets
├── src/
│   ├── app/                        # router, providers, mode, guards, layout
│   ├── components/ui/              # primitives accessible
│   ├── components/shared/          # MemberCard, QR, StatusBadge, EmptyState
│   ├── features/
│   │   ├── auth/                   # pages, forms, onboarding, recovery
│   │   ├── member/                 # card, rewards, wallet, history
│   │   ├── counter/                # lookup, scanner, earn, consume voucher
│   │   └── admin/                  # dashboard, members, catalog, data
│   ├── domain/                     # pure rules, entities, errors, commands
│   ├── application/                # services + LoyaltyRepository interface
│   ├── infrastructure/
│   │   ├── local/                  # schema, migration, locks, repository, backup
│   │   └── supabase/               # client, typed RPC adapter, realtime
│   ├── data/btc-sample.v1.json
│   ├── lib/                        # time, currency, validation, logging
│   ├── styles/                     # tokens, globals, print
│   └── test/                       # fixtures, setup
├── scripts/                        # extract-sample, verify-sample, setup-demo-auth
├── supabase/
│   ├── migrations/                 # 001 schema, 002 RLS/RPC, 003 seed catalog
│   ├── sql-editor/                 # 01_setup.sql, 02_seed_sandbox.sql, 03_verify.sql
│   ├── tests/                      # RLS, RPC concurrency, seed assertions
│   └── README.md                   # thứ tự chạy, bootstrap admin
├── tests/e2e/                      # offline, counter, redeem, auth, access
├── docs/                           # rules, test-report, demo-script, AI evidence
├── data-source/                    # workbook giả lập, checksum, extraction report
└── README.md
```

Không import Supabase trực tiếp từ UI. Interface tối thiểu: registerMember, getMember, findMembers, earnPoints, redeemReward, consumeVoucher, listLedger, listWallet, listRewards, getStats, loadSample, exportBackup. Cloud đăng ký đi qua Auth + onboarding; không reuse đường đăng ký local để tạo tài khoản giả.

Command types dùng amountVnd/rewardId, requestId, transactionCode; response gồm member, ledgerEntry, voucher nếu có, rankBefore/rankAfter. Repository trả error code có cấu trúc để UI dịch thông báo, không show raw SQL.

## 8. Lưu trữ local và nhất quán nhiều tab

Một JSON envelope tại `moc-rewards:competition:v1`: schemaVersion, revision, members, rewards, ledger, vouchers, requestResults, sampleVersion, audit, settings. Chỉ commit một lần setItem sau khi command đã validate toàn bộ trên clone. `setItem` throw do quota: không cập nhật UI như thành công, giữ snapshot cũ và hướng dẫn export/giải phóng bộ nhớ. Không dùng localStorage.clear().

Tất cả command ghi dùng Web Locks `navigator.locks.request` theo namespace, đọc lại snapshot bên trong lock, kiểm tra request ID/mã trùng/số dư rồi commit. Nếu Web Locks không hỗ trợ: chỉ cho một tab writer; khi không thể chứng minh an toàn thì khóa ghi với hướng dẫn mở bằng trình duyệt được hỗ trợ, không quảng cáo hỗ trợ nhiều tab bằng một boolean lock không nguyên tử. BroadcastChannel hoặc storage event thông báo revision, refetch thẻ/Quầy/admin ngay sau commit.

Parse + Zod validate khi boot; schema migration có version và backup trước nâng cấp. JSON hỏng hiển thị recovery/export dữ liệu thô, không tự mất toàn bộ. Import backup kiểm tra tham chiếu, balance, uniqueness, kích thước file và version; không merge đối tượng tùy ý vào app. Thời gian hệ thống local có thể sai, công bố giới hạn.

Cloud cache localStorage theo project + workspace + user ID, chỉ chứa dữ liệu người đó được đọc, có fetchedAt. Xóa cache nghiệp vụ khi logout/đổi user, không hiển thị cache admin cho khách. Session Auth để SDK quản lý, không tự copy password hay tạo local password database. Không cache response Auth/PostgREST bằng service worker.

## 9. Thiết kế PostgreSQL và SQL Editor bắt buộc bàn giao

Agent phải viết SQL chạy được, không chỉ mô tả hoặc để TODO. Migrations là nguồn chuẩn; `01_setup.sql` ghép theo thứ tự từ migrations; `02_seed_sandbox.sql` chứa đúng dữ liệu BTC; `03_verify.sql` trả kết quả kiểm tra. Không drop schema/tables để chạy lại. Nếu migration đã áp dụng thì dùng migration kế tiếp; hướng dẫn rõ không chạy setup hai lần bừa bãi. Các bảng nghiệp vụ có workspace_id NOT NULL, FK và constraint liên workspace.

| Bảng | Trường và constraint trọng yếu |
|---|---|
| workspaces | id UUID, name, is_sandbox; một workspace demo bootstrap |
| workspace_users | workspace_id, user_id FK auth.users, role customer/staff/admin; PK composite; role do admin tin cậy cấp |
| members | id UUID, workspace_id, code TEXT, name, phone TEXT, auth_user_id nullable, opening_balance BIGINT >=0, balance BIGINT >=0, active, joined_on DATE, version; unique(workspace_id,code/phone/auth_user_id) riêng từng khóa |
| rewards | id UUID, workspace_id, external_code, name, description, cost BIGINT >0, active; unique(workspace_id,external_code) |
| ledger | id UUID, workspace_id, member_id, transaction_code normalized, kind earn/redeem, amount_vnd BIGINT, delta BIGINT !=0, balance_after >=0, created_at timestamptz, actor_id nullable, source sample/live, external_history_id; unique(workspace_id,transaction_code); check dấu/amount theo kind |
| vouchers | id UUID, workspace_id, member_id, reward_id, ledger_id UNIQUE, code UNIQUE, cost_snapshot, title_snapshot, description_snapshot, status available/used, issued_at, used_at, used_by, expires_at nullable |
| operation_requests | workspace_id, request_id UUID, actor_id, command_type, payload_hash, result JSONB; unique(workspace_id,request_id); dùng cho mọi mutation retry |
| audit_logs | id, workspace_id, actor_id, action, entity_id, before/after giới hạn PII, created_at; append-only |
| sample_imports | workspace_id, version, checksum, imported_at, actor_id; unique(workspace_id,version) |

FK member/reward/ledger dùng composite (workspace_id,id) để không gán voucher sang tenant khác. Chuỗi transaction_code normalize trim/upper ở SQL và có CHECK định dạng/độ dài, không chỉ ở client. Index (workspace_id,member_id,created_at DESC), (workspace_id,status), và các cột dùng RLS. PostgreSQL BIGINT trả về client phải kiểm soát safe integer; với giới hạn input/số dư bản thi đặt CHECK balance <= 9.000.000.000.000 và decode chặt, không tính điểm bằng float.

Opening balances giữ nguyên dữ liệu BTC, không tạo earn giả để làm phồng KPI. Ledger mẫu redeem có thể không có voucher vì nguồn thiếu quan hệ; mọi redeem mới bắt buộc tạo voucher trong cùng RPC.

### RPC và giao dịch nguyên tử

Các RPC bắt buộc: onboard_member, lookup_member (staff), earn_points, redeem_reward, consume_voucher, set_member_status, upsert_reward, import_btc_sample (sandbox/admin), get_dashboard_stats. Có DTO và generated database.types.ts. Workspace phải được đối chiếu membership ở server, không tin tham số workspace_id từ client.

Quy trình chung mutation: kiểm tra auth/role → serialize request theo (workspace,request_id) (transaction advisory lock hoặc cơ chế tương đương đã test) → nếu có request cũ thì kiểm tra actor/type/hash, trả result cũ hoặc conflict → khóa member/voucher bằng SELECT FOR UPDATE → validate authoritative data → ghi ledger/balance/voucher/audit → lưu result → commit. Bất kỳ lỗi nào rollback toàn bộ. Thứ tự lock nhất quán giữa các RPC, dùng server time. Giao dịch mã trùng unique violation ánh xạ DUPLICATE_TRANSACTION, không biến thành thành công nếu khác request.

earn_points: chỉ staff/admin, nhập memberCode/transactionCode/amountVnd/requestId; tính delta trong SQL. redeem_reward: customer chỉ member của mình, staff/admin chỉ khi luồng quầy được cho phép và có audit; nhận rewardId/requestId, cost đọc DB, tạo transaction_code `RD-<UUID>`; khóa member, check active/đủ điểm, ghi voucher random unique. consume_voucher: chỉ staff/admin, khóa voucher rồi member theo cùng thứ tự đã quy định toàn hệ thống; kiểm tra active/expiry/status, đổi available → used một lần, không ghi trừ điểm lần hai. Thiết kế thống nhất thứ tự khóa member trước voucher khi các RPC khác cần cả hai để tránh deadlock.

Error codes: VALIDATION_ERROR, MEMBER_NOT_FOUND, MEMBER_LOCKED, PHONE_EXISTS, DUPLICATE_TRANSACTION, IDEMPOTENCY_CONFLICT, INSUFFICIENT_POINTS, REWARD_INACTIVE, VOUCHER_USED, VOUCHER_EXPIRED, FORBIDDEN, OFFLINE_READONLY, STORAGE_FULL. Có mapping UI và test cho từng nhóm quan trọng.

### RLS và bảo mật

- Bật RLS mọi bảng public. Anon không đọc PII, không ghi nghiệp vụ. Customer đọc duy nhất member/ledger/vouchers của mình + catalog active của workspace; staff/admin đọc dữ liệu cần cho Quầy; audit/admin stats chỉ quyền phù hợp.
- Không grant INSERT/UPDATE/DELETE trực tiếp vào balance, ledger, vouchers, workspace_users cho authenticated. Ghi qua RPC có kiểm tra quyền; service role chỉ trong script server riêng. Đừng nghĩ ẩn nút trên UI là đủ.
- SECURITY DEFINER chỉ dùng khi cần, `SET search_path = ''`, fully qualified identifiers, REVOKE EXECUTE FROM PUBLIC/anon rồi grant chính xác authenticated. Hàm helper role tránh RLS recursion và không nhận tùy ý user ID để lộ role.
- Không đọc role từ user_metadata có thể tự sửa. Customer không thể tự chuyển role bằng API, URL hay sửa localStorage.
- Bootstrap admin bằng SQL gán đúng auth.users UUID sau khi tài khoản đã tạo. Script demo Auth dùng admin API với key trong shell/env server, không nhúng password vào seed SQL, log hay Vite bundle. Seed data không tạo password thủ công trong auth.users.
- `.env.example`: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY; dùng loại khóa public được SDK hỗ trợ. Không có VITE_SERVICE_ROLE_KEY. Script bootstrap nếu cần dùng SUPABASE_SERVICE_ROLE_KEY không prefix VITE, chỉ ở máy quản trị; không cần triển khai key này lên frontend Vercel.
- Chống XSS: render text React, không HTML từ tên/mô tả; giới hạn length; CSP phù hợp Supabase HTTPS/WSS, camera self; Permissions-Policy camera self. Không ghi phone/token vào telemetry. Export admin là dữ liệu nhạy cảm nếu dùng thật, có xác nhận và phạm vi workspace.

## 10. UX/UI và QR

Phong cách café cao cấp: nền kem #F7F5EF, xanh chủ đạo #164B3B, chữ #172A24; card Đồng nâu đồng, Bạc xám xanh, Vàng vàng ấm. Kiểm tra contrast thay vì mặc định chữ trắng trên mọi gradient. Font hỗ trợ tiếng Việt được self-host, không tạo layout chữ lỗi dấu. Dùng illustration SVG/CSS nội bộ; ảnh trang trí không được làm chậm chức năng chính.

Mobile 360/390/430 px: vùng chạm tối thiểu 44 px, safe-area, không cuộn ngang, input tiền mở bàn phím số; dialog dạng bottom sheet và không bị keyboard che CTA. Tablet/desktop 768/1440 px: member card + rewards cạnh nhau, Quầy form + preview, admin bảng có phân trang. Có keyboard navigation, focus ring, label thật, aria-live cho điểm/toast, không dùng màu làm dấu hiệu duy nhất. Loading, empty, error, offline và lỗi quyền luôn có hành động tiếp theo.

QR thẻ có quiet zone, payload plain code, kích thước rõ khi phóng to. Scanner chỉ xin camera sau click, ưu tiên camera sau; không gọi permission liên tục. Quét thành công dừng stream, trim/uppercase, validate code rồi lookup, debounce một kết quả, không submit giao dịch. Dừng tracks khi đóng dialog/đổi route/unmount; xử lý từ chối, không có thiết bị, camera đang dùng, QR không phải member. Có nhập tay và đọc ảnh QR dự phòng; đọc ảnh không thay thế bằng chứng quét camera khi chấm thưởng. Camera cần HTTPS/localhost, test trên điện thoại thật ít nhất một thiết bị; ghi rõ trình duyệt kiểm thử.

Realtime cloud chỉ subscribe workspace/record được phép qua RLS; reconnect phải refetch, logout unsubscribe. Nếu Realtime lỗi dùng refetch khi focus và polling nhẹ ở màn hình thẻ đang mở. Khi nói “cập nhật ngay”, local cùng tab/khác tab phải cập nhật sau commit; cloud phản ánh ngay response mutation và mục tiêu thiết bị thứ hai trong vài giây khi kết nối tốt, không hứa realtime khi mất mạng.

## 11. Ma trận tiêu chí và ưu tiên mở rộng

| Nhóm điểm | Bằng chứng sản phẩm cần chuẩn bị |
|---|---|
| Lõi 35 | Đăng ký, mã unique, 3 hạng/màu, Quầy, chống trùng, 3 rewards/ví, lịch sử, nút nạp mẫu đúng nguồn |
| Kỹ thuật 18 | Atomicity, idempotency, validation, reload giữ dữ liệu, offline SW, SQL/RLS, test concurrency và lỗi lưu |
| Điện thoại 10 | Responsive, form số, bottom nav, safe-area, kiểm tra camera thiết bị thật |
| Trải nghiệm 7 | Xem trước, xác nhận đổi, lỗi cụ thể, tiến độ hạng, empty/loading states, accessible |
| Mở rộng 10 | QR hiển thị + quét (tối đa 4 điểm theo đề), scanner bàn phím, KPI, hiệu ứng có kiểm soát; login/admin/cloud là mở rộng theo yêu cầu người dùng |
| Demo 11 | Kịch bản dễ lặp, KT-004, chứng minh trùng không tăng, đổi và offline, video ngắn |
| Hồ sơ 9 | Source/README, rulebook, báo cáo test thực, minh chứng AI, SQL, hướng dẫn deploy và tài khoản demo |

P0 phải hoàn tất: toàn bộ local core + sample + responsive + persistence/offline. P1 nằm trong bản hoàn chỉnh yêu cầu này: QR camera, login thật, cloud RLS/RPC, admin, KPI, hiệu ứng. P2 chỉ sau khi P0/P1 đã pass: in biên nhận, lịch sử lọc nâng cao, dashboard biểu đồ nhỏ. Hoãn: chatbot, SMS, push notification, thanh toán, nhiều chi nhánh, tier lifetime, hàng đợi ghi cloud offline, nhập Excel tổng quát. Không đếm đăng nhập là thay thế yêu cầu Quầy chuyển vai của bản thi.

## 12. Kế hoạch triển khai theo cổng nghiệm thu

1. **Chuẩn bị:** đọc repo, giữ thay đổi người dùng, tạo branch nếu cần; kiểm tra file nguồn; xuất fixture/checksum/report; viết rules, test fixtures và interface. Cổng: 8 members/7 ledger/3 rewards/8 QR; tổng khớp.
2. **Domain + local:** validation, rank, earn/redeem/consume, request idempotency, lock, backup/migrate. Cổng: unit test các invariant và storage failure pass; chưa cần trang trí.
3. **UI lõi:** hoàn thiện member/Quầy/admin local, nạp mẫu, cập nhật nhiều tab, mobile và thể lệ. Cổng: 5 ca BTC + đăng ký/lịch sử/reload pass.
4. **Offline + QR:** SW precache toàn bộ assets và lazy chunks, camera/image/keyboard scanning. Cổng: production build preview tải trước rồi cắt mạng, reload deep link và chạy toàn bộ core được; camera trên HTTPS/localhost.
5. **Cloud:** migrations/SQL Editor, Auth onboarding/recovery, RLS, RPC nguyên tử, seed sandbox, repo adapter, cache riêng user. Cổng: test nhiều account/cửa sổ và test SQL concurrency; không chỉ test bằng service role.
6. **Polish + deploy:** UI states/accessibility, giảm bundle, security headers, Vercel rewrite, Supabase redirect/Realtime config. Cổng: build/lint/typecheck/tests pass, deployment kiểm tra trực tiếp và refresh route.
7. **Hồ sơ:** ghi actual test result, video, ảnh/minh chứng AI, hướng dẫn SQL/credentials demo an toàn, ZIP sạch. Cổng: người khác clone → npm ci → local core chạy không cần Supabase; cấu hình cloud theo README chạy được.

Ước lượng lập kế hoạch cho một dev có AI: khoảng 4–6 ngày tập trung gồm kiểm thử, không cam kết thời gian code tự động. Nếu thi ngắn: chốt local P0 trước, không hy sinh chống trùng/offline để dựng dashboard đẹp; vẫn ghi cloud/login/admin là phần còn thiếu nếu chưa xong, không gọi bản local-only là hoàn thành toàn bộ yêu cầu mở rộng của người dùng.

## 13. Bộ kiểm thử nghiệm thu

Chạy từng ca độc lập từ baseline trừ khi ghi rõ. Test report có Steps/Input/Expected/Actual/Pass-Fail/evidence/time/browser; không điền “Pass” trước khi chạy.

| ID | Dữ liệu/bước | Kỳ vọng |
|---|---|---|
| T01 | Nạp mẫu lần đầu | 8 members, 7 ledger, 3 rewards, tổng dư 28.700, phát 2.400, đổi 200 |
| T02 | Nạp lại sau giao dịch mới | No-op, không mất giao dịch, không tăng baseline |
| T03 BTC | KT-008, TX-NEW-001, 1.000.000 | +100, dư 100, một ledger |
| T04 BTC | KT-002, TX-KT-002, 1.500.000 | Báo trùng, dư 1.450, không có ledger mới |
| T05 BTC | KT-005 đổi KT-VCH-01 | Trừ 500, dư 5.300, Vàng, 1 voucher khả dụng |
| T06 BTC | KT-008 đổi KT-VCH-01 từ baseline | Từ chối, dư 0, không voucher/ledger mới |
| T07 BTC | Camera quét QR chuẩn KT-004 | Hiện Dũng Phạm 3.200 Bạc, chưa cộng điểm |
| T08 | Đăng ký tên/điện thoại hợp lệ; reload | Mã unique, 0 điểm, Đồng, còn hồ sơ |
| T09 | Tên rỗng, phone sai/trùng sau normalize | Lỗi cạnh input; không ghi dữ liệu |
| T10 | Số tiền âm, thập phân, 9.999, quá trần | Từ chối toàn bộ; 10.000/10.001 đều 1 điểm |
| T11 | Fixture số dư 999→1.000; 4.999→5.000 | Đổi màu/nhãn và báo lên hạng đúng |
| T12 | KT-002 đổi 500 | 950 điểm, hạ Đồng sau xác nhận; history/voucher đúng |
| T13 | Double click/retry cùng request; request khác cùng mã | Một hiệu ứng nghiệp vụ; lần trùng mới lỗi |
| T14 | Hai tab local/hai RPC cloud cùng giao dịch | Chỉ 1 earn; số dư và ledger khớp |
| T15 | Hai redemption đồng thời với số dư chỉ đủ một | Một thành công, một thiếu điểm; không âm |
| T16 | Dùng voucher hai lần/khác thành viên | Lần hai hoặc sai sở hữu bị chặn; điểm không đổi |
| T17 | Offline production sau ready, reload /counter | Nạp mẫu, đăng ký, cộng, đổi và reload giữ dữ liệu; không gọi CDN |
| T18 | Cloud cắt mạng rồi login/ghi | Chỉ xem cache đúng user, báo read-only; không tự ghi local |
| T19 | Customer gọi RPC earn/admin hay sửa balance qua REST | FORBIDDEN, DB không đổi; không lộ dữ liệu người khác/workspace khác |
| T20 | Role tự sửa metadata/localStorage, URL /admin | Server vẫn từ chối; UI guard chuyển trang phù hợp |
| T21 | Quota localStorage đầy/JSON hỏng/backup sai | Không báo thành công giả, không tự xóa; có recovery |
| T22 | Camera denied/QR lạ/USB scanner Enter | Nhập tay hoạt động, stream được tắt, không cộng ngoài ý muốn |
| T23 | Logout admin rồi login customer trên cùng máy | Không còn cache/PII của admin; reset query cache |
| T24 | Seed cloud lặp/concurrent; đổi workspace ID | Không nhân đôi, không seed production hay tenant khác |
| T25 | Reward bị tắt/member khóa khi mở dialog cũ | Server kiểm tra lại trạng thái, không tin preview cũ |
| T26 | Request UUID cũ payload khác; mạng timeout sau commit | Conflict nếu đổi payload; retry payload cũ trả kết quả đã commit |

Unit test domain không đủ cho cloud: phải có integration test RLS bằng JWT customer/staff/admin và transaction concurrent. T14/T15 phải chạy request song song thực, không chỉ mock thứ tự. Tests local repository xác nhận commit thất bại không đổi state, mẫu không double count. Playwright xác minh luồng trên viewport mobile và desktop; phần camera thật ghi test thủ công bổ sung.

## 14. Deploy, vận hành và hồ sơ

Scripts package: dev, build (typecheck + vite build), preview, lint, typecheck, test, test:run, test:e2e, data:verify. `npm ci` cài tái lập. Không cần environment secrets để chạy bản Thi; env thiếu thì Cloud hiển thị chưa cấu hình, không crash app.

Vercel: import repo → Vite preset → build/output như trên → set URL/public key nếu dùng cloud → deploy HTTPS. vercel.json rewrite route SPA về /index.html nhưng không làm sai asset/service worker; cache sw.js và index.html cần revalidate, assets hash immutable. Test refresh `/counter`/`/admin/members` không 404, content-type service worker đúng. PWA update hiện “Có phiên bản mới”; chỉ kích hoạt sau khi thao tác xong, không reload giữa giao dịch/scan.

Supabase: tạo project → chạy SQL setup → tạo Auth users qua dashboard/script → bootstrap admin theo UUID → seed sandbox → verify SQL → cấu hình Auth Site URL/redirect reset/confirm → bật publication các bảng cần Realtime có RLS → test RLS bằng user thường. Chọn region phù hợp khu vực khi tạo project. Không commit .env/password; tài khoản demo chia sẻ riêng, chỉ có quyền trên dữ liệu hư cấu sandbox. Không đưa service role vào ZIP. Tạo customer thật để demo ownership; KT-004 mẫu chỉ được claim vào account qua admin seed mapping đã xác minh, không nút tự nhận bằng số phone.

README cuối cùng chứa mục tiêu, tỷ lệ/mốc, 2 chế độ và giới hạn, cài local/offline, deploy, SQL Editor theo thứ tự, tạo tài khoản/role, dữ liệu mẫu, thiết bị camera đã thử, dependencies versions, test thực tế và troubleshooting. Kèm docs/test-report.md, docs/demo-script.md, docs/ai-evidence.md, docs/rules.md; chỉ ghi bằng chứng đã có, không bịa ảnh/chỉ số/test results. Không để placeholder chưa điền trong bản nộp.

Kịch bản demo khoảng 2 phút (đối chiếu lại thời lượng BTC): 0–15s nạp mẫu/show KPI; 15–30s KT-004 + QR; 30–55s Quầy cộng KT-008 1 triệu và thử lại mã; 55–80s đổi KT-005, mở ví/lịch sử; 80–100s tắt mạng, reload bản Thi và thao tác; 100–120s admin/cloud/login thật và màn hình mobile, nhấn mạnh thể lệ. Lên hạng dùng fixture/test riêng hoặc KT-007 + 3.000.000 để 4.700→5.000 khi có thời gian, không đổi baseline bí mật. Chuẩn bị video bổ sung QR camera/2 thiết bị nếu demo trực tiếp hạn thời gian.

## 15. Prompt giao việc trực tiếp cho coding agent

> Hãy thực thi PLAN_TRIEN_KHAI.md và mặc định TOM_TAT_VA_DUYET.md trong repo hiện tại. Đây là yêu cầu làm sản phẩm, không phải viết lại kế hoạch. Kiểm tra file nguồn Excel và repo trước, không ghi đè thay đổi người dùng. Làm theo các cổng nghiệm thu, hoàn thiện P0 rồi toàn bộ P1; dùng domain/repository chung cho local và cloud. Tạo migrations và file SQL Editor chạy được, dữ liệu mẫu đúng nguồn, không cộng đôi; không dùng API mock để thay Supabase thật. Không cần hỏi lại 5 lựa chọn đã có mặc định. Chạy build/typecheck/lint/test phù hợp, ghi kết quả thật. Nếu không có credentials cloud thì vẫn hoàn thiện code/SQL/tests local và hướng dẫn bootstrap; báo rõ phần integration chưa chạy, không tuyên bố deployment đã xong. Không tự tạo dịch vụ trả phí, không lộ secret, không publish khi chưa có quyền deploy. Kết thúc bằng các chức năng đã chạy, bằng chứng kiểm thử, file SQL, hướng dẫn chạy và giới hạn thực tế. Không để nút chết, TODO nghiệp vụ hay bảng test giả đạt.

## 16. Nguồn kỹ thuật tham khảo đã đối chiếu

- [Vite — Deploying a Static Site](https://vite.dev/guide/static-deploy): cấu hình build và deploy tĩnh, Vercel nhận diện Vite.
- [Vercel Hobby](https://vercel.com/docs/plans/hobby): phạm vi cá nhân/phi thương mại; không mặc định free cho doanh nghiệp.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): chính sách đọc/ghi theo Auth.
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions): RPC và security definer/search_path.
- [Supabase Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing): rủi ro pause khi ít hoạt động.
- [Vite PWA precache](https://vite-pwa-org.netlify.app/guide/service-worker-precache): phải đưa đủ tài nguyên vào manifest, không chỉ có localStorage là offline.
- [Vite PWA update prompt](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html): cập nhật có kiểm soát tránh gián đoạn thao tác.

Điều khoản, quota và phiên bản có thể đổi; agent kiểm tra lại tại lúc cài/deploy, không hardcode cam kết miễn phí vĩnh viễn.
