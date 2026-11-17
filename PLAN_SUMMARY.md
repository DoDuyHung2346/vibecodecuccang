# PLAN_SUMMARY — Thẻ thành viên 2 đầu (đọc 5 phút)

> Bản đọc-hiểu của `PLAN_CODE.md`. **Có tối đa 5 điểm cần bạn duyệt (mục 3). Mỗi điểm đều có ĐỀ XUẤT MẶC ĐỊNH — nếu bạn không trả lời, agent dùng mặc định và KHÔNG dừng chờ.**

---

## 1. Bức tranh 1 phút

**Làm gì:** 1 web app (PWA) có 3 vai chuyển ngay trong app — **Thành viên** (thẻ đổi màu theo hạng, mã + QR, đổi ưu đãi, ví, lịch sử) · **Quầy** (nhập/quét mã, cộng điểm, chống trùng, đổi hộ, dùng voucher) · **Quản trị** (thành viên, sổ điểm, ưu đãi, cấu hình, thống kê). Thêm trang **Thể lệ** và trang **Giám khảo** (dẫn từng ca kiểm tra + tự kiểm).

**Chạy trên gì:** Vite + React + TypeScript + Tailwind (PWA) → **Vercel free**; Supabase (Postgres/PostgREST/Auth/Realtime) → **free**. File SQL đã tạo sẵn (`01_schema.sql`, `02_seed.sql`).

**Ý tưởng cốt lõi — "Local-first, Cloud tùy chọn":**

```
Giám khảo mở link ──► Chế độ thi (localStorage, không login, offline)  ◄── ĐƯỜNG CHẤM ĐIỂM
                  └─► Đăng nhập ──► Chế độ Cloud (Supabase Auth + RLS + realtime)  ◄── ĐÁP ỨNG "đủ login/admin/Supabase"
```

Lý do: đề **bắt buộc** lưu `localStorage`, **phải chạy khi mất mạng**, và ghi rõ "không cần đăng nhập phân quyền thật". Nếu làm Cloud-only, giám khảo mất mạng/chưa đăng nhập là mất điểm phần lõi (35đ) và kỹ thuật (18đ). Làm Local-first thì vừa đúng đề, vừa vẫn có login + admin + Supabase như bạn yêu cầu.

**Điểm cộng so với "làm đủ đề":** hiệu ứng cộng điểm/lên hạng · quét QR bằng camera/ảnh/máy quét USB · rung + âm + giữ sáng màn hình + in biên lai · thống kê có công thức đối chiếu · voucher có QR dùng tại Quầy · hoàn tác giao dịch · đối soát sổ điểm · realtime · Judge panel tự kiểm.

---

## 2. Phát hiện quan trọng từ đề & dữ liệu mẫu (đã kiểm bằng script)

1. **Hạng tính theo điểm *hiện có* và có thể tụt.** KT-003 đầu kỳ 1.000 (Bạc) → đổi 200 → 800 và BTC ghi hạng **Đồng**. Tính theo "điểm tích lũy" sẽ lệch mẫu.
2. **Dòng mẫu TX-KT-003 đổi −200 điểm không khớp mức đổi nào** (thấp nhất 500) → coi là lịch sử cũ, không tạo voucher cho nó.
3. **Nạp mẫu KHÔNG được cộng lại điểm** (điểm hiện tại đã gồm giao dịch mẫu). Cả 8 thành viên đều khớp: `đầu kỳ + Σ biến động = hiện tại`.
4. **TX-KT-001…007 phải nằm trong sổ sau khi nạp** — nếu không, ca TC-KT-02 (nhập lại TX-KT-002) sẽ không báo trùng.
5. **Biên hạng:** KT-005 có đầu kỳ đúng 5.000 → phải là **Vàng** (≥).
6. **Đổi tên loại giữa 2 sheet** (`Đổi ưu đãi` / `Đổi điểm`) và **giờ không có múi giờ** → chuẩn hóa, hiểu là giờ Việt Nam.
7. **QR:** 8 ảnh nhúng trong `KT_MaQR`, đã giải mã — payload luôn = mã thành viên. Đã tách sẵn thành `sample-qr/KT-00x.png`.
8. **TC-KT-01 làm đổi dữ liệu** → muốn chạy lại phải bấm Nạp dữ liệu mẫu (Judge panel nhắc rõ).
9. **"Tổng điểm đã phát" dễ bị hiểu khác nhau** → hiển thị 3 số cùng công thức: *đã phát 28.900 − đã dùng 200 = đang lưu hành 28.700* (khớp tổng `DiemHienTai`).

---

## 3. NĂM ĐIỂM CẦN BẠN DUYỆT

### Điểm 1 — Kiến trúc dữ liệu & đăng nhập *(quan trọng nhất, đụng luật đề)*

| Lựa chọn | Ưu | Nhược |
|---|---|---|
| **A. Local-first + Cloud tùy chọn** ⭐ | Đúng đề (localStorage, offline, không login) **và** có login/admin/Supabase thật; giám khảo không bị chặn | Hai chế độ → nhiều code hơn (~+20%); dữ liệu Local/Cloud là 2 tập riêng |
| B. Cloud-only (Supabase là nguồn chính) | Đơn giản hơn, "chuẩn production" | **Vi phạm** yêu cầu localStorage/offline → rủi ro mất điểm lõi; giám khảo phải đăng nhập |
| C. Local-only (bỏ Supabase) | Nhanh nhất, ổn định nhất | **Không đáp ứng** yêu cầu của bạn (login, admin, Supabase, Vercel full-stack) |

**ĐỀ XUẤT MẶC ĐỊNH: A.** Mở app = vào ngay Chế độ thi, không login. Cloud chỉ hiện khi có biến môi trường Supabase.
*Nếu đổi sang B:* mất điểm rủi ro ở "mất mạng"; plan sẽ phải thêm cache offline + hàng đợi ghi (phức tạp).

### Điểm 2 — Luật nghiệp vụ

| Hạng mục | **Mặc định đề xuất** | Phương án khác |
|---|---|---|
| Tỉ lệ | **10.000đ = 1 điểm, làm tròn xuống**, tối thiểu 10.000đ | Làm tròn gần nhất / cho GD <10.000đ vào sổ 0 điểm |
| Cách tính hạng | **Theo điểm hiện có** (Đồng <1.000 · Bạc 1.000–4.999 · Vàng ≥5.000), **cảnh báo tụt hạng** khi đổi | Theo điểm tích lũy trọn đời (không bao giờ tụt, nhưng **lệch hạng mẫu của KT-003**) |
| Mã giao dịch | **Duy nhất toàn hệ thống, không phân biệt hoa/thường, bỏ khoảng trắng** | Duy nhất theo từng thành viên |
| Voucher | **Hạn 30 ngày, dùng 1 lần**, có QR để Quầy xác nhận | Không hạn / hạn 90 ngày |
| Khi đổi điểm ở Quầy | Quầy **được đổi hộ**; thành viên cũng tự đổi | Chỉ thành viên tự đổi / chỉ Quầy đổi |

**ĐỀ XUẤT MẶC ĐỊNH: toàn bộ cột giữa.** Tất cả chỉnh được ở Admin → Cấu hình và công bố tự động ở trang Thể lệ.

### Điểm 3 — Stack & backend

| Lựa chọn | Ưu | Nhược |
|---|---|---|
| **A. Vite + React SPA + PWA; backend = Supabase (logic trong hàm SQL)** ⭐ | Offline/PWA bền nhất; deploy tĩnh Vercel dễ; ghi điểm là 1 giao dịch SQL nguyên tử; không giữ service-role key | Không có server Node riêng (không cần cho đề này) |
| B. Next.js (App Router) + Route Handlers | Quen thuộc, có API server | PWA/offline với App Router dễ lỗi hơn; thêm bề mặt lỗi |
| C. Vite + thêm Vercel Functions làm API | Có tầng API riêng | Thêm secret + độ phức tạp, không tăng điểm |

**ĐỀ XUẤT MẶC ĐỊNH: A.** Thư viện chính: React, React Router, TanStack Query, Zustand, Zod, Tailwind, `qrcode`, `jsqr`, `framer-motion`, `canvas-confetti`, `vite-plugin-pwa`, `@supabase/supabase-js`. Test: Vitest + Playwright.

### Điểm 4 — Phạm vi mở rộng (10đ "mở rộng & sáng tạo" + 4đ QR)

| Gói | Gồm | Chi phí công |
|---|---|---|
| Cơ bản | QR hiển thị + quét camera; hiệu ứng cộng điểm; thống kê mini | Thấp |
| **Mạnh** ⭐ | Cơ bản + quét bằng **ảnh/máy quét USB** · rung + âm + giữ sáng màn hình · **in biên lai** · voucher có QR + dùng tại Quầy · **hoàn tác GD** · **đối soát sổ điểm** · PWA cài được · **Judge panel tự kiểm** · realtime (Cloud) | Trung bình |
| Tối đa | Mạnh + NFC, Web Serial, dark mode, đa ngôn ngữ, push | Cao, rủi ro lỗi cao, ít ăn điểm thêm |

**ĐỀ XUẤT MẶC ĐỊNH: gói Mạnh.** Cắt được từng món mà không ảnh hưởng phần lõi (xếp ở Phase 2).

### Điểm 5 — Lộ trình & hồ sơ

| Lựa chọn | Mô tả |
|---|---|
| **A. 5 phase, mỗi phase deploy được** ⭐ | P0 Domain+test → P1 Lõi Local + deploy → P2 QR/thiết bị/hiệu ứng/PWA → P3 Cloud → P4 Hồ sơ/QA/demo. Hết giờ thì dừng ở phase xanh gần nhất |
| B. Làm Cloud trước, Local sau | Rủi ro: phần lõi theo luật đề đến muộn |
| C. Làm một lèo | Không có điểm dừng an toàn |

Hồ sơ nộp: **README · ARCHITECTURE · USER_GUIDE · DECISIONS · TEST_REPORT · DEMO_SCRIPT** (+ ảnh chụp, video demo).

**ĐỀ XUẤT MẶC ĐỊNH: A.**

---

## 4. Đã chốt, không cần duyệt (giả định)

- Tên chương trình **"Vibe Rewards"** (đổi ở Admin). Thẻ kiểu Starbucks: thẻ là trung tâm, màu theo hạng (Đồng nâu · Bạc ánh kim · Vàng), chữ đạt tương phản AA.
- Lần mở đầu **chưa có dữ liệu** → nút **Nạp dữ liệu mẫu** nổi bật (xác nhận trước khi ghi đè; ghi đè = về đúng trạng thái đầu).
- Quầy không cần PIN ở Chế độ thi. Ở Cloud: member / staff / admin phân quyền thật bằng RLS.
- Đăng nhập thành viên Cloud: **SĐT + PIN 6 số** (email giả); nhân viên/quản trị: email + mật khẩu; staff mới do Admin cấp quyền theo email.
- Payload QR = **đúng mã thành viên** (không URL, không tiền tố).
- Không làm: dark mode, đa ngôn ngữ, NFC/Web Serial, thanh toán thật.

---

## 5. Các luồng cần xem xét để hoàn thiện (đã có trong plan — bạn rà lại xem có muốn đổi)

| Luồng | Nhánh quan trọng đã xử lý |
|---|---|
| **Đăng ký** | SĐT `+84…`/có dấu chấm → chuẩn hóa; trùng SĐT → báo + mở thẻ hiện có; mã `KT-009` kế tiếp |
| **Cộng điểm** | Preview `+N điểm → hạng mới` trước khi bấm; <10.000đ → báo tối thiểu; mã trùng (kể cả khác hoa/thường) → panel đỏ nêu giao dịch gốc; chống bấm đúp; thẻ khóa → từ chối |
| **Lên hạng / tụt hạng** | Lên: pháo giấy + thẻ đổi màu, **hiện 1 lần**; tụt (sau đổi): cảnh báo **trước** khi xác nhận + toast dịu |
| **Đổi điểm & dùng voucher** | Đủ điểm → trừ + voucher vào ví (QR); thiếu → từ chối, số dư giữ nguyên; Quầy quét voucher → *Đã dùng*; hết hạn / đã dùng → báo rõ |
| **Hoàn tác giao dịch nhập nhầm** | Tạo bút toán đảo (không xóa dòng gốc); mã gốc **vẫn bị coi là đã dùng**; không hoàn tác được nếu điểm đã bị tiêu |
| **Nạp dữ liệu mẫu** | Ghi đè về trạng thái đầu, không cộng lại điểm, sổ có sẵn TX-KT-001…007 |
| **Offline & nhiều tab** | Ghi nguyên tử; `localStorage` hỏng → tự sao lưu + khôi phục; tab Quầy cộng → tab Thành viên cập nhật ngay |
| **Quét QR** | BarcodeDetector → jsQR; lỗi quyền camera có hướng dẫn; dự phòng ảnh/nhập tay; QR lạ → "không phải mã thành viên" |
| **Cloud** | Mất mạng → chỉ xem + nút chuyển Chế độ thi; đăng ký lỗi giữa chừng → màn "hoàn tất đăng ký thẻ" |

**Option chức năng nhỏ bạn có thể bật/tắt (mặc định ghi trong ngoặc):** xuất CSV sổ điểm (bật) · sao lưu/khôi phục JSON (bật) · cho Quầy đăng ký hộ khách (bật) · điều chỉnh điểm thủ công có lý do (bật) · hạng tối thiểu để đổi quà đặc biệt (**tắt**).

---

## 6. Rủi ro lớn nhất & cách giảm

1. **Giám khảo mất mạng ở lần mở đầu** → PWA precache + nhắc "mở 1 lần khi có mạng".
2. **Camera/HTTPS/iOS** → Vercel HTTPS, lỗi có hướng dẫn, dự phòng ảnh + nhập tay (+ mock có gắn nhãn cho demo).
3. **Logic TS và SQL lệch nhau** → cùng thứ tự kiểm tra, cùng mã lỗi, test chạy lại TC-KT-01…04 trên Cloud.
4. **Supabase free tạm dừng sau ~1 tuần** → nhắc Restore trước demo; Chế độ thi không phụ thuộc.
5. **Email giả cho đăng nhập SĐT bị Supabase từ chối** → đổi được tên miền; phương án dự phòng email thật.

---

## 7. File đi kèm & cách giao cho agent

| File | Đặt tại repo |
|---|---|
| `PLAN_CODE.md` | `docs/PLAN.md` |
| `supabase/01_schema.sql`, `supabase/02_seed.sql` | `supabase/` (chạy tay trong Supabase SQL Editor: 01 rồi 02) |
| `seed/seed.json` | `src/data/seed.json` |
| `sample-qr/*.png` (8 ảnh) | `public/sample-qr/` |
| File Excel gốc của BTC | `docs/sample/` |

**Prompt giao việc (dán nguyên):**

> Bạn là senior full-stack engineer. Đọc toàn bộ `docs/PLAN.md` rồi thực hiện **tuần tự từng phase P0→P4**. Quyết định D1–D5 dùng đúng mặc định trong plan. Dữ liệu BTC (`src/data/seed.json`) là chân lý. Trước khi sang phase mới, `npm run check` phải xanh và commit. Không thêm thư viện ngoài danh sách nếu chưa ghi lý do vào `docs/DECISIONS.md`. Sau mỗi phase, báo ngắn gọn: đã làm gì, test nào đạt, còn gì rủi ro. Bắt đầu từ P0.

---

## 8. Việc cần từ bạn (không chặn agent)

- *(Tuỳ chọn)* Nếu BTC có **mẫu hồ sơ nộp bài** hoặc **giới hạn thời gian/dung lượng** → gửi để mình chỉnh mục 16 của plan.
- *(Tuỳ chọn)* Tên thương hiệu/logo riêng; nếu không có, dùng "Vibe Rewards".
- **Làm tay một lần (khi tới P3):** tạo project Supabase, chạy 2 file SQL, tắt "Confirm email", tạo tài khoản admin — các bước ở `PLAN_CODE.md` mục 12.
