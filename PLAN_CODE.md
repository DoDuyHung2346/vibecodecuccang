# PLAN_CODE.md — Hệ thống thẻ thành viên 2 đầu (Thành viên & Quầy)

> **Tài liệu giao việc cho AI agent.** Mục tiêu: ra một sản phẩm **chạy tốt, đúng đề, đạt điểm cao**, deploy được lên Vercel (free) với Supabase (free).
> Dự án: `vibe-rewards` · Bảng Kỹ thuật · Cuộc thi Vibe Coding Mini App.
> Ngày lập plan: 17/11/2026.

---

## 0. CÁCH DÙNG TÀI LIỆU NÀY (đọc trước khi viết dòng code nào)

**Thứ tự ưu tiên khi có mâu thuẫn:** (1) Đề gốc + dữ liệu mẫu của BTC → (2) tài liệu này → (3) ý thích của agent.

**Quy tắc làm việc bắt buộc**

1. Làm tuần tự theo **Phase** ở mục 15. Cuối mỗi phase phải: `npm run check` xanh (lint + typecheck + test + build) → commit → (từ P1) deploy được. Nếu hết thời gian, dừng ở phase gần nhất đã xanh — **không bao giờ để nhánh chính ở trạng thái hỏng**.
2. **Domain logic là hàm thuần** trong `src/domain/`, dùng chung cho chế độ Local; SQL ở `supabase/01_schema.sql` là bản tương đương cho Cloud. Hai bên phải cho cùng kết quả cho cùng đầu vào (thứ tự kiểm tra lỗi xem mục 7.4).
3. **UI 100% tiếng Việt**, số theo `vi-VN` (`1.250.000đ`, `3.200 điểm`), giờ theo `Asia/Ho_Chi_Minh`.
4. **Không dùng CDN/Google Fonts/ảnh từ mạng** — app phải chạy khi mất mạng. Font tự host bằng `@fontsource-variable/inter`.
5. Không `alert()/confirm()/prompt()`; dùng dialog của app. Không `console.error` trong luồng bình thường.
6. TypeScript `strict: true`. Không `any` trừ khi có comment lý do.
7. Mọi thư viện ngoài danh sách ở mục 5 → ghi lý do vào `docs/DECISIONS.md` trước khi thêm. Không khẳng định số phiên bản cụ thể từ trí nhớ: chạy `npm view <pkg> version` rồi pin bằng `^major.minor`.
8. Dữ liệu BTC là **chân lý**. Không tự bịa bộ dữ liệu thay thế.

**File đi kèm (đặt đúng chỗ trước khi bắt đầu)**

| File | Đặt tại | Dùng để |
|---|---|---|
| `seed.json` | `src/data/seed.json` | Dữ liệu mẫu BTC đã chuẩn hóa (nút Nạp dữ liệu mẫu, Judge panel, test) |
| `01_schema.sql` | `supabase/01_schema.sql` | Bảng + RLS + RPC + realtime (chạy tay trong Supabase SQL Editor) |
| `02_seed.sql` | `supabase/02_seed.sql` | Nạp dữ liệu mẫu vào Supabase |
| `sample-qr/KT-00x.png` | `public/sample-qr/` | 8 ảnh QR chuẩn của BTC (đã kiểm: payload = mã thành viên) |
| `Du_lieu_mau_Vibe_Coding_bangA.xlsx` | `docs/sample/` | Bản gốc để đối chiếu |

---

## 1. MỤC TIÊU & CHIẾN LƯỢC ĂN ĐIỂM

**Sản phẩm:** một web app (PWA) duy nhất, 3 "vai" chuyển ngay trong app: **Thành viên** (thẻ, đổi ưu đãi, ví, lịch sử) · **Quầy** (tra cứu, cộng điểm, đổi hộ, dùng voucher) · **Quản trị** (thành viên, sổ điểm, ưu đãi, cấu hình, thống kê). Có thêm 2 trang công khai: **Thể lệ** và **Giám khảo**.

**Hai chế độ dữ liệu (xem D1, mục 3):**
- **Chế độ thi — Local (mặc định):** toàn bộ dữ liệu ở `localStorage`, không cần đăng nhập, chạy offline. Đây là đường đi của giám khảo.
- **Chế độ Cloud (tùy chọn):** đăng nhập Supabase Auth thật, phân quyền member/staff/admin bằng RLS, dữ liệu dùng chung, realtime.

**Bản đồ tiêu chí → việc phải làm**

| Tiêu chí (điểm) | Chiến lược |
|---|---|
| Hoàn thành phần lõi (35) | R-01…R-09 ở mục 2, mỗi mục có tiêu chí nghiệm thu + test tự động. Ca TC-KT-01…05 của BTC chạy đúng 100%. |
| Kỹ thuật & ổn định (18) | Domain thuần + unit test, ghi nguyên tử (all-or-nothing), chống cộng trùng không phân biệt hoa/thường, khôi phục khi `localStorage` hỏng, sync đa tab, PWA offline, RLS + RPC ở Cloud, CI xanh, không lỗi console. |
| Dùng trên điện thoại (10) | Mobile-first (360–430px), bottom-nav, vùng chạm ≥44px, `inputmode`, safe-area, `dvh`, không cuộn ngang, camera sau, cài được như app. |
| Trải nghiệm (7) | Phản hồi tức thì (toast/rung/âm), preview "điểm sẽ cộng" trước khi bấm, trạng thái rỗng/lỗi/tải đầy đủ, cảnh báo tụt hạng, lỗi nói rõ nguyên nhân + cách xử lý. |
| Mở rộng & sáng tạo (10) | Hiệu ứng cộng điểm/lên hạng, thiết bị ngoại vi (camera, máy quét USB, rung, âm, giữ sáng màn hình, in biên lai), thống kê, voucher có QR dùng tại Quầy, hoàn tác giao dịch, realtime, Judge panel tự kiểm. |
| Trình bày & demo (11) | Trang **Giám khảo** dẫn từng ca kiểm tra; landing rõ; kịch bản demo 6–7 phút (mục 16). |
| Hồ sơ nộp bài (9) | README + ARCHITECTURE + USER_GUIDE + TEST_REPORT + DEMO_SCRIPT + DECISIONS (mục 16). |

---

## 2. PHÂN TÍCH ĐỀ — MA TRẬN YÊU CẦU

| ID | Yêu cầu (đề) | Cách làm | Nghiệm thu |
|---|---|---|---|
| **R-01** | Đăng ký bằng tên + SĐT; sinh mã duy nhất; hiển thị trên thẻ | Form 2 trường. Chuẩn hóa SĐT (`+84…`→`0…`), kiểm `^0\d{9}$`, từ chối SĐT trùng. Mã `KT-NNN` tăng dần từ bộ đếm (`codeSeq`), tối thiểu 3 chữ số; sau khi nạp mẫu mã kế tiếp là `KT-009`. | Đăng ký "Lan Hương / 0911222333" → thẻ hiện `KT-009`. Đăng ký lại cùng SĐT (kể cả `+84911222333`) → báo trùng. |
| **R-02** | Điểm & 3 hạng tự đổi theo mốc, công bố trong app; thẻ đổi màu | Hạng **suy ra** từ điểm hiện có (không lưu cứng). Đồng <1.000 · Bạc 1.000–4.999 · Vàng ≥5.000 (khớp "hạng tham khảo" của BTC, cho Admin chỉnh). Thẻ gradient theo hạng, thanh tiến độ tới hạng kế. | Biên: 999→Đồng, 1000→Bạc, 4999→Bạc, 5000→Vàng. 8 thành viên mẫu hiện đúng hạng BTC. |
| **R-03** | Chế độ Quầy chuyển vai trong app; nhập mã + số tiền; cộng theo tỉ lệ; cập nhật ngay | Role switcher luôn hiện. Tỉ lệ `10.000đ = 1 điểm`, **làm tròn xuống**, cấu hình được. Thành viên cập nhật tức thì (cùng tab, khác tab qua `storage`, Cloud qua realtime). | TC-KT-01: KT-008 + 1.000.000đ (TX-NEW-001) → +100, số dư 0→100. |
| **R-04** | Chống cộng trùng theo mã giao dịch | Mã giao dịch chuẩn hóa `UPPER+trim`, **duy nhất toàn hệ thống**, kiểm trước khi ghi; Cloud có thêm `UNIQUE`. Báo lỗi rõ + hiển thị giao dịch gốc. | TC-KT-02: KT-002 nhập lại TX-KT-002 → báo trùng, số dư giữ 1.450, sổ không thêm dòng. Cả `tx-kt-002` và ` TX-KT-002 ` cũng bị chặn. |
| **R-05** | Đổi điểm ≥2 mức; trừ đúng; có ví ưu đãi | 3 mức BTC: 500 / 1.100 / 2.000. Đổi → trừ điểm + tạo voucher (mã `VC-…`, hạn 30 ngày) vào ví. Thiếu điểm → từ chối, số dư giữ nguyên. | TC-KT-03: KT-005 đổi VCH-01 → 5.800→5.300, ví có 1 voucher. TC-KT-04: KT-008 (0 điểm) đổi VCH-01 → từ chối, vẫn 0. |
| **R-06** | Lịch sử biến động: loại, điểm, thời gian | Sổ `ledger` append-only; hiển thị loại (Cộng/Đổi/Điều chỉnh/Hoàn tác), ±điểm, giờ VN, số dư sau, mã GD. | Lịch sử KT-004 có dòng TX-KT-004 +200 → 3.200 lúc 06/10/2026 18:20. |
| **R-07** | Nút **Nạp dữ liệu mẫu**; nhiều mức điểm; mã chung KT-004 | Nút ở Landing, Judge, Admin→Công cụ, Quầy→menu, và trạng thái rỗng. Xác nhận trước khi ghi đè. **Không cộng lại điểm** khi nạp (điểm hiện tại đã gồm giao dịch mẫu). Sau nạp: 8 TV, 7 GD, 3 ưu đãi. | Nạp xong KT-004 = 3.200 Bạc; TX-KT-001…007 đã nằm trong sổ (nhập lại bị chặn). Nạp lần 2 → trở về đúng trạng thái đầu. |
| **R-08** | `localStorage`; chạy khi mất mạng | `localStorage` là nguồn dữ liệu của chế độ thi; PWA precache toàn bộ asset; không phụ thuộc CDN. | Tải app 1 lần → tắt mạng → mở lại, đăng ký/cộng điểm/đổi điểm vẫn chạy, reload vẫn còn dữ liệu. |
| **R-09** | Tỉ lệ & mốc hạng công bố rõ trong app | Trang **Thể lệ** sinh từ cấu hình thật (đổi cấu hình → Thể lệ đổi theo). Link ở footer + menu + thẻ. | Thể lệ ghi: tỉ lệ, làm tròn, 3 hạng + khoảng điểm, danh mục ưu đãi, hạn voucher, quy tắc mã GD, lưu ý tụt hạng. |
| **R-10** (thưởng ≤4đ) | QR trên thẻ + quét bằng camera ở Quầy | Payload QR **đúng bằng mã thành viên** (không tiền tố, không URL). Quét: `BarcodeDetector` → fallback `jsQR`; thêm "chọn ảnh QR" & nhập tay. | Quét QR KT-004 của BTC (ảnh/giấy/màn hình) → mở hồ sơ Dũng Phạm trong ≤2 giây (TC-KT-05). |
| **X-01** | Hiệu ứng cộng điểm / lên hạng | Mục 9.6 | Có hiệu ứng, tôn trọng `prefers-reduced-motion`. |
| **X-02** | Thiết bị ngoại vi | Mục 10 | Bảng "Thiết bị" hiển thị trạng thái từng khả năng. |
| **X-03** | Thống kê mini | Tổng thành viên, tổng điểm đã phát (+ đã dùng, đang lưu hành, phân bố hạng, 7 ngày gần nhất) | `phát − đã dùng = đang lưu hành` luôn đúng. Bộ mẫu: 28.900 − 200 = 28.700. |

### 2.1 Bẫy & phát hiện từ dữ liệu mẫu (đã kiểm bằng script)

1. **Hạng tính theo điểm hiện có, hạng có thể giảm.** KT-003 đầu kỳ 1.000 (Bạc) → đổi 200 → 800 và BTC ghi hạng tham khảo **Đồng**. Nếu dùng "điểm tích lũy trọn đời" sẽ lệch mẫu. → Dùng điểm hiện có + **cảnh báo tụt hạng** khi đổi (UX).
2. **Giao dịch mẫu TX-KT-003 đổi −200 điểm không khớp mức đổi nào** (mức thấp nhất là 500). → Chỉ là dòng lịch sử cũ; **không** tạo voucher cho nó; ví KT-003 rỗng.
3. **`DiemDauKy` chỉ để đối soát.** Với cả 8 thành viên: `DiemDauKy + Σ ThayDoiDiem = DiemHienTai` (đã kiểm). Làm công cụ "Đối soát sổ điểm" ở Admin.
4. **Thời gian BTC không có múi giờ** (`2026-10-03 09:15`) → hiểu là giờ Việt Nam, lưu ISO `+07:00`.
5. **Tên loại khác nhau giữa 2 sheet:** `Đổi ưu đãi` (GiaoDich) vs `Đổi điểm` (LichSu) → chuẩn hóa về `redeem`, hiển thị "Đổi điểm".
6. **Tỉ lệ ví dụ trong mẫu = 10.000đ/điểm** và mọi giao dịch mẫu khớp tuyệt đối (`GiaTri/10000 = ThayDoiDiem`).
7. **Biên 5.000:** KT-005 có đầu kỳ đúng 5.000 → phải là **Vàng** (≥, không phải >).
8. **TC-KT-01 làm thay đổi dữ liệu** → muốn chạy lại phải bấm Nạp dữ liệu mẫu (ghi rõ trong Judge panel).
9. **QR:** `KT_MaQR` có ảnh nhúng cho cả 8 thành viên (KT-004 đứng đầu danh sách). Đã giải mã: payload luôn = mã thành viên.
10. **Camera trình duyệt cần HTTPS hoặc localhost** → Vercel mặc định HTTPS; phải xử lý rõ các lỗi quyền camera.

---

## 3. QUYẾT ĐỊNH ĐÃ CHỐT (D1–D5) & GIẢ ĐỊNH

> D1–D5 là 5 điểm trong `PLAN_SUMMARY.md`. Nếu chủ dự án không đổi, **dùng đúng mặc định dưới đây**.

| # | Quyết định | Mặc định (chốt) |
|---|---|---|
| **D1** | Kiến trúc dữ liệu & đăng nhập | **Local-first + Cloud tùy chọn.** Mặc định "Chế độ thi": `localStorage`, không đăng nhập, offline. "Cloud" bật khi có biến môi trường Supabase: đăng nhập thật + RLS + realtime. Thiếu env → ẩn Cloud, app vẫn build/chạy. |
| **D2** | Luật nghiệp vụ | 10.000đ = 1 điểm, làm tròn xuống, tối thiểu 10.000đ/GD · Hạng theo **điểm hiện có**: Đồng <1.000, Bạc 1.000–4.999, Vàng ≥5.000 · Mã GD duy nhất toàn hệ thống, không phân biệt hoa/thường · Voucher hạn 30 ngày, dùng 1 lần · Cảnh báo tụt hạng khi đổi. |
| **D3** | Stack | **Vite + React 18 + TypeScript + Tailwind 3 + PWA** (SPA tĩnh) trên Vercel; backend = **Supabase** (Postgres + PostgREST + Auth + Realtime), logic ghi điểm trong hàm SQL. Không có server Node riêng, không giữ service-role key. |
| **D4** | Gói mở rộng | **"Gói Mạnh":** QR hiển thị + quét (camera, ảnh, máy quét USB) · hiệu ứng + rung + âm · thống kê mini · voucher có QR & dùng tại Quầy · hoàn tác GD · biên lai in · PWA cài được · Judge panel tự kiểm · realtime Cloud. Không làm: NFC, Web Serial, đa ngôn ngữ, dark mode, push notification. |
| **D5** | Lộ trình & hồ sơ | 5 phase, mỗi phase deploy được (P0→P4). Hồ sơ gồm 6 tài liệu (mục 16). |

**Giả định đã chốt (không cần duyệt)**

- Tên chương trình mặc định **"Vibe Rewards"** (đổi được ở Admin → Cấu hình).
- Lần mở đầu **chưa có dữ liệu**; hiện nút Nạp dữ liệu mẫu nổi bật.
- Quầy không cần PIN ở chế độ thi (đề: "không cần đăng nhập phân quyền thật").
- Thẻ Starbucks-style: thẻ làm trung tâm màn Thành viên; đổi màu theo hạng; mã + QR trên thẻ.
- Đơn vị tiền: VND, số nguyên. Số tiền tối đa/GD: 1.000.000.000đ.
- "Hồ sơ nộp bài": đề không nêu mẫu → làm bộ tài liệu chuẩn ở mục 16, điều chỉnh khi có mẫu của BTC.

---

## 4. KIẾN TRÚC

```
┌───────────────────────────── Trình duyệt (PWA, offline-capable) ─────────────────────────────┐
│  UI (React + Tailwind)                                                                        │
│  Member shell │ Counter shell │ Admin shell │ Rules │ Judge │ Auth                            │
│        │               │              │                                                       │
│        └───── TanStack Query (cache, invalidate) ─────┐                                       │
│                                                       ▼                                       │
│                         DataService (interface)  ── factory theo `mode` ──┐                   │
│                                  │                                        │                   │
│                  ┌───────────────┴─────────────┐          ┌───────────────┴──────────────┐    │
│                  │ LocalService (mặc định)     │          │ CloudService (Supabase)       │    │
│                  │ domain/reducers (hàm thuần) │          │ supabase-js: select + rpc()   │    │
│                  │ localStorage (atomic write) │          │ Realtime → invalidate         │    │
│                  │ storage event → đa tab      │          └───────────────┬──────────────┘    │
│                  └─────────────────────────────┘                          │ HTTPS             │
└───────────────────────────────────────────────────────────────────────────┼───────────────────┘
                                                                            ▼
                                   Supabase: Auth · PostgREST (/rpc/*) · Postgres (RLS) · Realtime
   Vercel: chỉ host file tĩnh (dist/) + header bảo mật. Không có serverless function.
```

**Nguyên tắc**

- **UI không biết dữ liệu ở đâu:** chỉ gọi `DataService` qua hook (`useMember`, `useEarn`…). Mỗi mutation trả về kết quả có kiểu (`EarnResult`…) hoặc ném `DomainError(code)`.
- **Mutation Local = hàm thuần + ghi nguyên tử:** đọc DB mới nhất từ `localStorage` → `applyX(db, input, now)` (ném lỗi nếu sai, không sửa `db` gốc) → `setItem` → cập nhật bộ nhớ → phát sự kiện. Nếu `setItem` lỗi (đầy bộ nhớ) bộ nhớ không đổi → không bao giờ "nửa vời".
- **Mutation Cloud = 1 lời gọi RPC** (một giao dịch Postgres, khóa dòng thành viên, `UNIQUE(tx_code)`).
- **Hạng không lưu**: `tierFor(points, settings)` ở client; `tier_for()` ở SQL.

---

## 5. CÔNG NGHỆ & DEPENDENCIES

**Runtime:** Node ≥ 20 LTS · npm. **Trình duyệt mục tiêu:** Chrome/Edge/Safari iOS ≥ 15/Firefox mới.

**`dependencies`**

| Gói | Dùng cho |
|---|---|
| `react`, `react-dom` (18.3+) | UI |
| `react-router-dom` (6.x) | Định tuyến, `lazy` theo route |
| `@tanstack/react-query` (5) | Cache + invalidate + trạng thái tải/lỗi |
| `zustand` | Phiên UI (mode, role, thẻ đang xem, tùy chọn âm thanh) – persist `localStorage` |
| `zod` | Validate form + validate dữ liệu đọc từ `localStorage`/seed |
| `@supabase/supabase-js` (2) | Cloud (import **động**, chỉ tải khi vào Cloud) |
| `qrcode` | Sinh QR (SVG/PNG) |
| `jsqr` | Giải mã QR từ khung hình/ảnh (import **động**) |
| `framer-motion` | Chuyển động (lazy ở các màn cần) |
| `canvas-confetti` | Pháo giấy khi lên hạng (import động) |
| `sonner` | Toast |
| `lucide-react` | Icon |
| `clsx`, `tailwind-merge`, `class-variance-authority` | Tiện ích class/variant |
| `@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `@radix-ui/react-slot` | Dialog/Sheet/Tabs truy cập được (a11y, focus trap) |
| `@fontsource-variable/inter` | Font tự host (có subset tiếng Việt) |

**`devDependencies`:** `typescript`, `vite`, `@vitejs/plugin-react`, `vite-plugin-pwa`, `workbox-window`, `tailwindcss@3`, `postcss`, `autoprefixer`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`, `prettier-plugin-tailwindcss`, `@types/react`, `@types/react-dom`, `@types/qrcode`, `@types/canvas-confetti`, `@vite-pwa/assets-generator`, `tsx`, `xlsx` (chỉ cho script sinh seed, tùy chọn).

**Scripts `package.json`**

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview --host",
  "lint": "eslint .",
  "typecheck": "tsc -b --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "e2e": "playwright test",
  "check": "npm run lint && npm run typecheck && npm test && npm run build",
  "icons": "pwa-assets-generator --preset minimal-2023 public/favicon.svg"
}
```

**Biến môi trường (`.env.example`)**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MEMBER_EMAIL_DOMAIN=member.vibecard.app   # tạo email giả cho đăng nhập bằng SĐT+PIN
VITE_APP_NAME=Vibe Rewards
```

> Chỉ dùng `anon key` ở client. **Không** đưa `service_role` vào repo/Vercel.

---

## 6. CẤU TRÚC THƯ MỤC

```
vibe-rewards/
├─ docs/
│  ├─ sample/Du_lieu_mau_Vibe_Coding_bangA.xlsx
│  ├─ ARCHITECTURE.md · USER_GUIDE.md · DEMO_SCRIPT.md · TEST_REPORT.md · DECISIONS.md
│  └─ screenshots/
├─ public/
│  ├─ favicon.svg · pwa-64x64.png · pwa-192x192.png · pwa-512x512.png · maskable-icon-512x512.png · apple-touch-icon-180x180.png
│  └─ sample-qr/KT-001.png … KT-008.png
├─ supabase/
│  ├─ 01_schema.sql
│  └─ 02_seed.sql
├─ src/
│  ├─ main.tsx · App.tsx · routes.tsx · index.css
│  ├─ config/        env.ts · constants.ts (keys localStorage, giới hạn, regex)
│  ├─ domain/        (THUẦN — không import React/DOM)
│  │  ├─ types.ts · errors.ts · normalize.ts · rules.ts · tiers.ts
│  │  ├─ reducers.ts      applyRegister / applyEarn / applyRedeem / applyUseVoucher / applyAdjust / applyVoid
│  │  ├─ stats.ts · reconcile.ts · seed.ts (build AppDB từ seed.json)
│  │  └─ __tests__/       *.test.ts
│  ├─ data/
│  │  ├─ seed.json
│  │  ├─ service.ts            interface DataService
│  │  ├─ localService.ts · storage.ts (đọc/ghi an toàn, migrate, backup khi hỏng)
│  │  ├─ cloudService.ts · supabaseClient.ts · mappers.ts · errorMap.ts
│  │  └─ factory.ts            chọn service theo mode
│  ├─ state/         useSession.ts (zustand) · queries.ts (hooks react-query) · useAuth.ts
│  ├─ features/
│  │  ├─ landing/    LandingPage
│  │  ├─ auth/       LoginPage · SignupPage · RequireRole
│  │  ├─ member/     MemberShell · MemberHome · RegisterPage · MembershipCard · RewardsPage · WalletPage · VoucherSheet · HistoryPage · TierUpModal
│  │  ├─ counter/    CounterShell · CounterHome · MemberLookup · EarnForm · EarnResultDialog · RedeemAtCounter · UseVoucher · RecentTx · DevicePanel · Receipt
│  │  ├─ admin/      AdminShell · Dashboard · MembersPage · MemberDetail · LedgerPage · RewardsAdmin · SettingsPage · StaffPage · ToolsPage
│  │  ├─ rules/      RulesPage
│  │  └─ judge/      JudgePage · selfTest.ts
│  ├─ components/
│  │  ├─ ui/         Button · Card · Input · MoneyInput · Badge · Dialog · Sheet · Tabs · Skeleton · EmptyState · ConfirmDialog
│  │  └─ shared/     AppShell · TopBar · RoleSwitcher · BottomNav · ModeBadge · OfflineBanner · QrCodeView · QrScanner · TierBadge · PointsCounter · ConfettiBurst · Money · DateTime
│  ├─ hooks/         useOnline · useWakeLock · useKeyboardWedge · useCountUp · useReducedMotion · useInstallPrompt
│  ├─ lib/           format.ts · cn.ts · qr.ts · device.ts · feedback.ts (rung+âm) · print.ts · ids.ts
│  └─ test/setup.ts
├─ e2e/              tc-kt-01.spec.ts … tc-kt-05.spec.ts · offline.spec.ts · mobile.spec.ts
├─ scripts/          build-seed.ts (tùy chọn: xlsx → seed.json)
├─ .env.example · .gitignore · .prettierrc · eslint.config.js · index.html
├─ package.json · tsconfig.json · tsconfig.app.json · vite.config.ts · vitest.config.ts · playwright.config.ts
├─ tailwind.config.ts · postcss.config.js · vercel.json · README.md
```

---

## 7. ĐẶC TẢ DOMAIN (nguồn chân lý nghiệp vụ)

### 7.1 Kiểu dữ liệu (`domain/types.ts`)

```ts
export type Tier = 'bronze' | 'silver' | 'gold';
export type LedgerType = 'earn' | 'redeem' | 'adjust' | 'reversal';
export type MemberStatus = 'active' | 'locked';

export interface Settings { programName: string; vndPerPoint: number; silverMin: number; goldMin: number; voucherValidDays: number }
export interface Member { code: string; fullName: string; phone: string; openingPoints: number; points: number; status: MemberStatus; joinedAt: string /* yyyy-mm-dd */ }
export interface LedgerEntry {
  txCode: string; memberCode: string; type: LedgerType; amountVnd: number; delta: number; balanceAfter: number;
  createdAt: string /* ISO +07:00 */; note?: string; rewardCode?: string; reversesTxCode?: string; createdBy?: string; legacyHistoryId?: string;
}
export interface Reward { code: string; name: string; description?: string; costPoints: number; kind: 'voucher' | 'gift'; valueVnd?: number; active: boolean; sortOrder: number }
export interface Voucher { code: string; memberCode: string; rewardCode?: string; rewardName: string; costPoints: number; status: 'active' | 'used'; issuedAt: string; expiresAt: string; usedAt?: string; redeemTxCode: string }
export type VoucherView = 'active' | 'used' | 'expired';   // 'expired' suy ra: active && expiresAt < now

export interface AppDB {
  schemaVersion: 1;
  settings: Settings;
  members: Record<string, Member>;      // key = code
  ledger: LedgerEntry[];                // append-only, cũ → mới
  rewards: Reward[];
  vouchers: Voucher[];
  codeSeq: number;                      // số thứ tự mã thành viên đã dùng (mẫu: 8)
  meta: { sampleLoadedAt?: string; updatedAt: string };
}
```

### 7.2 Chuẩn hóa & quy tắc (`normalize.ts`, `rules.ts`, `tiers.ts`)

```ts
export const normCode  = (s: string) => s.normalize('NFKC').trim().toUpperCase();
export const normPhone = (s: string) => {
  let d = s.replace(/[^\d+]/g, '');
  if (d.startsWith('+84')) d = '0' + d.slice(3);
  else if (/^84\d{9}$/.test(d)) d = '0' + d.slice(2);
  return d;
};
export const PHONE_RE = /^0\d{9}$/;
export const TX_RE    = /^[A-Z0-9][A-Z0-9._/-]{2,39}$/;   // sau normCode
export const MAX_AMOUNT_VND = 1_000_000_000;

export const calcEarnPoints = (amountVnd: number, vndPerPoint: number) => Math.floor(amountVnd / vndPerPoint);

export const tierFor = (p: number, s: Pick<Settings, 'silverMin' | 'goldMin'>): Tier =>
  p >= s.goldMin ? 'gold' : p >= s.silverMin ? 'silver' : 'bronze';

// tiến độ tới hạng kế: ratio ∈ [0,1] tính trong đoạn [minHiệnTại, minHạngKế]; gold => next=null, ratio=1
export function tierProgress(p: number, s: Pick<Settings, 'silverMin' | 'goldMin'>) { /* trả {tier,next,pointsToNext,ratio} */ }

export const isTierUp   = (a: Tier, b: Tier) => rank(b) > rank(a);
export const isTierDown = (a: Tier, b: Tier) => rank(b) < rank(a);
export const voucherView = (v: Voucher, now: Date): VoucherView =>
  v.status === 'used' ? 'used' : new Date(v.expiresAt) < now ? 'expired' : 'active';
```

`normScan(raw)` (kết quả quét QR/máy quét): lấy dòng đầu, bỏ ký tự điều khiển, `normCode`. Nếu không khớp thành viên mà chứa `/KT-\d+/` thì thử khớp phần đó; vẫn không có → `MEMBER_NOT_FOUND` với gợi ý "QR không phải mã thành viên".

### 7.3 Hàm thuần (`reducers.ts`) — chữ ký

```ts
applyRegister(db, { fullName, phone }, now)                    → { db, member }
applyEarn(db, { memberCode, amountVnd, txCode }, now, actor?)  → { db, result: EarnResult }
applyRedeem(db, { memberCode, rewardCode }, now, actor?)       → { db, result: RedeemResult }
applyUseVoucher(db, { voucherCode }, now, actor?)              → { db, result }
applyAdjust(db, { memberCode, delta, reason }, now, actor?)    → { db, result }
applyVoidEarn(db, { txCode, reason }, now, actor?)             → { db, result }
// Quy ước: không sửa db đầu vào (copy-on-write); sai → throw new DomainError(code, details?)

interface EarnResult   { txCode; memberCode; fullName; amountVnd; delta; pointsBefore; pointsAfter; tierBefore: Tier; tierAfter: Tier; tierUp: boolean; createdAt }
interface RedeemResult { txCode; memberCode; rewardCode; rewardName; costPoints; pointsBefore; pointsAfter; tierBefore; tierAfter; tierDown: boolean; voucherCode; voucherExpiresAt }
```

### 7.4 Thứ tự kiểm tra & mã lỗi (**Local và SQL phải giống hệt**)

`applyEarn`: `INVALID_TX_CODE` → `INVALID_AMOUNT` (không phải số nguyên dương ≤ 1 tỷ) → `AMOUNT_TOO_SMALL` (<1 điểm) → `MEMBER_NOT_FOUND` → `MEMBER_LOCKED` → `DUPLICATE_TX` (kèm `{txCode, memberCode, at}` của giao dịch gốc) → ghi: thêm dòng `ledger`, cập nhật điểm.

`applyRedeem`: `MEMBER_NOT_FOUND` → `MEMBER_LOCKED` → `REWARD_UNAVAILABLE` (không có/đang tắt) → `INSUFFICIENT_POINTS` (kèm `{need, have, missing}`) → ghi: trừ điểm, dòng `ledger` loại `redeem` (mã GD tự sinh `RD-YYMMDD-XXXXXX`), tạo voucher (`VC-XXXXXXXX`, hạn = now + `voucherValidDays`).

`applyUseVoucher`: `VOUCHER_NOT_FOUND` → `VOUCHER_USED` → `VOUCHER_EXPIRED` → đánh dấu `used`.

`applyAdjust` (Admin): `INVALID_AMOUNT` (delta ≠ 0, |delta| ≤ 1.000.000) → `REASON_REQUIRED` (≥3 ký tự) → `MEMBER_NOT_FOUND` → `INSUFFICIENT_POINTS` nếu âm quá số dư.

`applyVoidEarn`: `REASON_REQUIRED` → `TX_NOT_FOUND` → `NOT_VOIDABLE` (không phải `earn`) → `ALREADY_VOIDED` → `INSUFFICIENT_POINTS` (điểm đã bị dùng) → tạo dòng `reversal` (`VD-…`), **giữ nguyên dòng gốc**; mã GD gốc vẫn bị coi là đã dùng.

`applyRegister`: `INVALID_NAME` (2–80 ký tự sau trim) → `INVALID_PHONE` → `PHONE_EXISTS` → mã `KT-` + `String(++codeSeq).padStart(3,'0')`.

Các mã còn lại: `NETWORK_ERROR`, `STORAGE_FULL`, `FORBIDDEN`, `NOT_AUTHENTICATED`, `ALREADY_REGISTERED`, `UNKNOWN`.

### 7.5 Thống kê (`stats.ts`)

```
issued      = Σ openingPoints + Σ delta(earn, adjust>0) − Σ |delta(reversal)|
spent       = Σ |delta(redeem)| + Σ |delta(adjust<0)|
circulating = Σ points                      // luôn thỏa: circulating = issued − spent
members, tiers{bronze,silver,gold}, vouchersActive, vouchersUsed, transactions, daily[7 ngày gần nhất có GD]
```

### 7.6 Đối soát (`reconcile.ts`)

Với mỗi thành viên: `openingPoints + Σ delta(ledger) === points` **và** `balanceAfter` của dòng cuối khớp `points`. Trả danh sách sai lệch; Admin→Công cụ hiển thị "✓ Khớp 8/8".

---

## 8. LƯU TRỮ

### 8.1 Local (`data/storage.ts`)

| Key | Nội dung |
|---|---|
| `vibe:db:v1` | `AppDB` (JSON). Đây là nguồn chân lý của chế độ thi |
| `vibe:session:v1` | `{ mode, role, currentMemberCode, soundOn, hapticOn, lastSeenTier:{[code]:Tier}, voucherSeen… }` |

Yêu cầu:

- `readDB()`: parse + validate bằng zod. **Hỏng/không hợp lệ** → sao lưu nguyên văn vào `vibe:db:corrupt:<timestamp>`, báo toast "Dữ liệu cục bộ bị lỗi — đã khôi phục", rồi khởi tạo DB rỗng (không crash trắng màn hình).
- `schemaVersion` + hàm `migrate()` để nâng cấp về sau.
- `writeDB()`: `try { setItem } catch { throw new DomainError('STORAGE_FULL') }`.
- Mỗi mutation: lấy khóa `navigator.locks.request('vibe-db', …)` nếu có (fallback không khóa) → đọc DB mới nhất → áp reducer → ghi → phát sự kiện nội bộ.
- Đa tab: lắng nghe `window 'storage'` (key `vibe:db:v1`) → `queryClient.invalidateQueries()` ⇒ mở 2 tab (Thành viên + Quầy) thấy điểm đổi **ngay**.
- `loadSample()`: dựng DB mới từ `seed.json` bằng `domain/seed.ts` — **không** chạy `applyEarn` (không cộng lại), `codeSeq = 8`, `meta.sampleLoadedAt = now`. Ghi đè hoàn toàn DB hiện tại (sau xác nhận).
- `resetAll()` (Admin→Công cụ): xóa DB về rỗng.

### 8.2 Cloud

Bảng/hàm: xem `supabase/01_schema.sql` (đã có đủ). Ánh xạ `DataService` ↔ Supabase:

| Phương thức | Lời gọi |
|---|---|
| `getSettings` / `saveSettings` | `from('settings').select().eq('id',1)` / `.update({...}).eq('id',1)` (Admin) |
| `listRewards` / `upsertReward` | `from('rewards')` select / upsert (Admin) |
| `getMemberByCode` / `findByPhone` | `from('members').select().eq('code', …)` / `.eq('phone', …)` |
| `listMembers(q, page)` | `.or('full_name.ilike.%q%,phone.ilike.%q%,code.ilike.%q%').range(a,b).order('created_at')` |
| `registerMember` | `rpc('register_member', {p_full_name, p_phone})` |
| `earnPoints` | `rpc('earn_points', {p_member_code, p_amount_vnd, p_tx_code})` |
| `redeemReward` | `rpc('redeem_reward', {p_member_code, p_reward_code})` |
| `useVoucher` | `rpc('use_voucher', {p_voucher_code})` |
| `adjustPoints` / `voidEarn` | `rpc('adjust_points', …)` / `rpc('void_earn', …)` |
| `updateMember` | `rpc('admin_update_member', …)` |
| `getStats` | `rpc('get_stats')` |
| `listLedger` / `listVouchers` | `from('ledger').select('*, members!inner(code)')` … `.order('created_at',{ascending:false}).range()` |
| `loadSampleData` | `rpc('load_sample_data')` (Admin) |
| `setRole` / `listAccounts` | `rpc('admin_set_role')` / `rpc('admin_list_accounts')` |

**`errorMap.ts`:** `error.message` là mã lỗi (vd `DUPLICATE_TX`); `error.details` là JSON chuỗi → parse thành `details`. `TypeError: Failed to fetch`/`navigator.onLine===false` → `NETWORK_ERROR`. Mã lạ → `UNKNOWN`.

---

## 9. ĐẶC TẢ UI/UX

### 9.1 Design tokens (Tailwind `theme.extend`)

| Token | Giá trị |
|---|---|
| `brand` 50/500/600/700 | `#E7F4EE` / `#128A5E` / `#0F6B4B` / `#0B4F37` |
| `ink` (chữ) / `muted` / `line` | `#14201B` / `#5B6B64` / `#E2E8E4` |
| nền / bề mặt | `#F6F7F5` / `#FFFFFF` |
| `success` / `warn` / `danger` | `#1E8E5A` / `#B7791F` / `#C62F2F` |
| Thẻ **Đồng** | gradient `#5E2E0E → #A9622B`, chữ trắng, nhấn `#F3D2B1` |
| Thẻ **Bạc** | gradient `#B8C2CC → #F2F5F8`, chữ `#1C2630`, ánh kim (sheen) |
| Thẻ **Vàng** | gradient `#E6B422 → #FCE38A`, chữ `#3B2A00`, shimmer nhẹ |
| Bo góc | thẻ 20px · card 16px · nút/ô nhập 12px |
| Font | Inter Variable; cỡ gốc 16px; **mọi `input` ≥16px** (tránh iOS tự zoom) |

Tương phản chữ/nền ≥ AA (4.5:1) — **kiểm bằng công cụ** cho 3 thẻ. Màu không phải kênh duy nhất: hạng luôn có **tên + icon**.

### 9.2 Điều hướng & layout

- **Role switcher** (luôn có): desktop = segmented control trên TopBar (`Thành viên | Quầy | Quản trị`); mobile = chip ở góc phải mở Sheet chọn vai. Đổi vai không mất dữ liệu.
- **Mobile (<768px):** TopBar gọn + **BottomNav 4 mục theo vai**; nội dung `max-w-md`, `padding-bottom` theo `env(safe-area-inset-bottom)`; dùng `min-h-dvh`.
- **Desktop (≥1024px):** Thành viên: thẻ giữa trang (max-w-md) + cột phụ; Quầy: 2 cột (nhập liệu | gần đây); Quản trị: sidebar + bảng.
- **ModeBadge** trên TopBar: `Chế độ thi · Offline-ready` (xanh) hoặc `Cloud · <email>`; **OfflineBanner** khi mất mạng ("Đang offline — dữ liệu vẫn lưu trên máy" ở chế độ thi; "Cloud cần mạng — chỉ xem" ở Cloud, kèm nút chuyển sang Chế độ thi).
- Footer/menu luôn có: Thể lệ · Giám khảo · Cài ứng dụng.

| Vai | BottomNav |
|---|---|
| Thành viên | Thẻ · Ưu đãi · Ví · Lịch sử |
| Quầy | Cộng điểm · Đổi hộ · Voucher · Gần đây |
| Quản trị | Tổng quan · Thành viên · Sổ điểm · Cài đặt (Ưu đãi/Nhân sự/Công cụ trong Cài đặt) |

### 9.3 Màn hình Thành viên

- **Chưa có thẻ trên máy:** Màn chào + 2 lựa chọn: **Đăng ký thẻ mới** (Tên + SĐT, 1 màn, nút lớn) / **Chọn thẻ có sẵn** (Local: danh sách thành viên để xem nhanh, có ô tìm theo SĐT/mã — dành cho demo & giám khảo).
- **Đăng ký:** validate tức thì (inline), SĐT tự định dạng `0900 001 004`, nhấn Enter gửi. Thành công → **hiệu ứng "phát thẻ"** (thẻ lật ra) + toast; chuyển sang Thẻ.
- **Thẻ (MembershipCard)** tỉ lệ ~1.586:1: tên chương trình (trái trên), **chip hạng**, tên thành viên, **mã thành viên cỡ lớn, chữ số đơn cách (`font-mono`/tabular-nums) + nút Sao chép**, **QR (ô trắng, bo góc) — chạm để mở toàn màn hình**, điểm lớn (đếm lên khi đổi), ngày tham gia. SĐT che giữa (`0900•••004`).
- Dưới thẻ: **thanh tiến độ** "Còn 1.800 điểm nữa để lên Vàng" (hoặc "Bạn đang ở hạng cao nhất"), hàng nút nhanh (Đổi ưu đãi · Ví · Lịch sử · Thể lệ), 3 hoạt động gần nhất.
- **Toàn màn hình QR** ("Mã của tôi"): nền trắng, QR ≥ 280px, mã chữ to, hướng dẫn "Đưa mã này cho nhân viên quầy".
- **Ưu đãi:** thẻ từng mức (tên, giá trị, `500 điểm`, trạng thái "Bạn đủ điểm" / "Còn thiếu X điểm" + mini progress). Nút **Đổi ngay** → hộp xác nhận: điểm trước→sau, **cảnh báo tụt hạng** nếu có ("Đổi ưu đãi này sẽ đưa bạn từ Vàng xuống Bạc") → thành công: sheet hiện voucher + QR (payload = mã voucher) + hạn dùng.
- **Ví ưu đãi:** tab `Còn hạn | Đã dùng | Hết hạn`; chi tiết voucher có QR + hạn + trạng thái; trạng thái rỗng có CTA tới Ưu đãi.
- **Lịch sử:** nhóm theo ngày; mỗi dòng: icon loại, nhãn (Cộng điểm / Đổi điểm / Điều chỉnh / Hoàn tác), `+200` xanh / `−500` đỏ, giờ, `Số dư 3.200`, mã GD; lọc `Tất cả | Cộng | Đổi`; phân trang 20 dòng + "Xem thêm".

### 9.4 Màn hình Quầy (luồng chính — tối ưu cho tốc độ)

1. **Khách hàng:** ô *Mã thành viên hoặc SĐT* (auto-focus, tự UPPERCASE, `autocapitalize=characters`, `enterkeyhint=search`), nút **Quét QR** (mở camera), Enter = tra cứu. Máy quét USB (bàn phím giả) hoạt động ngay (mục 10.2).
2. **Hồ sơ rút gọn** hiện ngay sau khi tìm thấy: tên, mã, **chip hạng + điểm hiện có**, trạng thái. Không thấy → lỗi rõ + gợi ý "Đăng ký thành viên mới" (Quầy đăng ký hộ).
3. **Giao dịch:** *Số tiền* (`inputmode=numeric`, tự chèn dấu chấm nghìn, chip nhanh `50.000 · 100.000 · 200.000 · 500.000`), *Mã giao dịch* (chữ HOA, nút nhỏ "Tạo mã" sinh `TX-YYMMDD-XXXX`). **Preview sống:** `= +100 điểm → 3.300 (Bạc)`; nếu <10.000đ hiện "Tối thiểu 10.000đ để tích điểm".
4. **Cộng điểm** (nút to, khóa khi đang gửi, chống bấm đúp). Thành công → **EarnResultDialog**: dấu tích animate, `+100 điểm`, số dư mới đếm lên, chip hạng (nếu **lên hạng** → pháo giấy + banner), nút *In biên lai* · *Hoàn tác* (trong 30 phút) · *Giao dịch tiếp* (reset form, focus ô mã). Kèm rung + bíp.
5. **Lỗi trùng mã:** panel đỏ rung nhẹ: "Mã giao dịch **TX-KT-002** đã được cộng điểm cho **KT-002** lúc 04/10/2026 11:40. Không cộng điểm lần nữa." (không xóa dữ liệu đã nhập để sửa nhanh).
6. Các tab Quầy: **Đổi hộ** (chọn ưu đãi cho khách đang chọn; cùng logic + cảnh báo tụt hạng) · **Dùng voucher** (quét/nhập `VC-…` → hiện chi tiết → *Xác nhận đã dùng*; báo "đã dùng"/"hết hạn") · **Gần đây** (10 GD mới nhất, nút Hoàn tác) · menu ⋯: **Thiết bị**, **Nạp dữ liệu mẫu**, Thể lệ.
7. Hỗ trợ prefill qua query: `/counter?member=KT-008&tx=TX-NEW-001&amount=1000000` (để Judge panel dẫn thẳng vào ca kiểm tra; **không** tự gửi).

### 9.5 Màn hình Quản trị

- **Tổng quan:** 4 thẻ KPI (Tổng thành viên · **Tổng điểm đã phát** · Điểm đã dùng · Đang lưu hành, mỗi thẻ có tooltip công thức) + phân bố hạng (thanh ngang 3 màu) + biểu đồ cột 7 ngày gần nhất có giao dịch (SVG/CSS tự vẽ, **không** thêm thư viện chart) + 5 giao dịch mới nhất.
- **Thành viên:** tìm (tên/SĐT/mã), lọc hạng/trạng thái, sắp xếp, phân trang; chi tiết: thông tin, thẻ như thành viên thấy (**"Xem như thành viên"**), lịch sử, ví; hành động: sửa tên/SĐT, khóa/mở khóa, **điều chỉnh điểm (bắt buộc lý do)**.
- **Sổ điểm:** toàn bộ `ledger`, lọc theo loại/ngày/mã, tìm mã GD, nút Hoàn tác (chỉ `earn`), xuất CSV (client, `Blob`).
- **Ưu đãi:** CRUD mức đổi (tên, mô tả, điểm, giá trị, bật/tắt). Luôn còn ≥2 mức đang bật (chặn tắt mức cuối cùng khi chỉ còn 2).
- **Cấu hình:** tên chương trình, `vndPerPoint`, `silverMin`, `goldMin` (ràng buộc `0 < silver < gold`), hạn voucher; **preview ví dụ** (`1.250.000đ → 125 điểm`); cảnh báo "đổi mốc sẽ đổi hạng hiển thị của mọi thành viên".
- **Nhân sự (Cloud):** danh sách staff/admin; nhập email → cấp quyền.
- **Công cụ:** Nạp dữ liệu mẫu · Đối soát sổ điểm · Xuất/nhập sao lưu JSON (Local) · Xóa toàn bộ dữ liệu (xác nhận gõ "XOA").

### 9.6 Hiệu ứng (X-01) — đặc tả

| Sự kiện | Hiệu ứng | Thời lượng |
|---|---|---|
| Điểm đổi (thẻ) | `useCountUp` từ giá trị cũ → mới, nhảy nhẹ (scale 1→1.06→1) | 700ms |
| Cộng điểm thành công (Quầy) | Vòng tròn + dấu tích vẽ nét; `+N` bay lên; toast | 900ms |
| **Lên hạng** | Modal toàn màn: thẻ lật sang màu hạng mới, ánh sáng lan, **pháo giấy theo màu hạng**, chữ "Chúc mừng! Bạn đã lên hạng Bạc" | ~2.5s |
| Tụt hạng (sau đổi) | Toast dịu, không pháo | — |
| Lỗi (trùng mã…) | Rung ngang 3 nhịp (`translateX`) | 350ms |
| Thanh tiến độ | Tween chiều rộng | 600ms |
| Phát thẻ lúc đăng ký | Thẻ trượt + lật từ mặt sau | 900ms |

Quy tắc: chỉ animate `transform`/`opacity`; tôn trọng `prefers-reduced-motion` (thay bằng đổi màu/fade ngắn, **không** pháo); **TierUp** trên màn Thành viên chỉ hiện **1 lần** cho mỗi lần lên hạng (so `lastSeenTier[code]` trong session; cập nhật sau khi hiện); import `canvas-confetti` và `framer-motion` động để không phình bundle đầu.

### 9.7 Trang công khai

- **Landing (`/`)**: logo + 1 câu giới thiệu; 3 thẻ vào vai (Thành viên · Quầy · Quản trị); nút **Nạp dữ liệu mẫu** nổi bật (nếu DB rỗng, to hơn); link Thể lệ · **Dành cho giám khảo** · Đăng nhập (nếu có Cloud) · Cài ứng dụng.
- **Thể lệ (`/rules`)**: sinh động từ cấu hình: cách tích điểm (kèm ví dụ tính), bảng 3 hạng (màu + khoảng điểm + quyền lợi mô tả), cách đổi điểm + danh mục, voucher (hạn, dùng 1 lần), quy tắc mã giao dịch (mỗi mã 1 lần, không phân biệt hoa/thường), lưu ý "hạng tính theo điểm hiện có, đổi điểm có thể làm tụt hạng", ngày hiệu lực.
- **Giám khảo (`/judge`)**: (1) nút Nạp dữ liệu mẫu + trạng thái "Đang có 8 TV · 7 GD"; (2) 5 thẻ ca **TC-KT-01…05** lấy từ `seed.testCases`: tình huống, đầu vào, kết quả mong đợi, nút **Chuẩn bị** (mở đúng màn + prefill), nút **Mở hồ sơ**; (3) **QR chuẩn KT-004** (ảnh BTC + QR app tự sinh, để giám khảo quét thử bằng thiết bị khác); (4) **Tự kiểm tra** (`selfTest.ts`): chạy 5 ca + các bất biến trên **bản sao trong bộ nhớ** (không đụng dữ liệu thật) → bảng ✓/✗; (5) liên kết hồ sơ/README. Mục (4) chỉ chạy ở chế độ thi.

### 9.8 Trạng thái, lỗi, truy cập

- Mọi danh sách có **skeleton**, **empty state** có CTA, **error state** có nút Thử lại.
- Lỗi nghiệp vụ → thông điệp ở Phụ lục A; lỗi hệ thống → "Có lỗi xảy ra, dữ liệu của bạn không bị thay đổi. Thử lại".
- A11y: `lang="vi"`, nhãn cho mọi input, `aria-live="polite"` cho kết quả cộng điểm/lỗi, focus rõ, điều hướng bàn phím, dialog bẫy focus (Radix), đích chạm ≥44px, `prefers-reduced-motion`.
- Biểu mẫu: `autocomplete`, `inputmode`, `enterkeyhint` đúng loại; không cho zoom tự phát (font ≥16px); không khóa `user-scalable`.

---

## 10. QR & THIẾT BỊ NGOẠI VI

### 10.1 QR

- **Sinh:** `QRCode.toString(payload, { type:'svg', errorCorrectionLevel:'M', margin:2 })`, nền trắng/mô-đun đen (đảm bảo quét được cả khi thẻ màu vàng/đồng). **Payload = đúng `member.code`** (vd `KT-004`). QR voucher: payload = `voucher.code`. Nút "Tải PNG".
- **Quét (`QrScanner`):**
  - `getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })`; `<video playsInline muted autoPlay>` (bắt buộc cho iOS).
  - Nếu `'BarcodeDetector' in window` và hỗ trợ `qr_code` → dùng; ngược lại vẽ khung hình lên canvas ≤640px và `jsQR(imageData…, { inversionAttempts: 'dontInvert' })`. Vòng lặp `requestAnimationFrame`, giới hạn ~10 khung/giây.
  - Có kết quả → `normScan()` → gọi `onDetect` → **rung + bíp** → tự đóng camera. Chống lặp: bỏ qua cùng giá trị trong 2 giây.
  - **Dọn dẹp:** dừng mọi `track`, hủy RAF khi unmount và khi `document.hidden`.
  - **Lỗi có hướng dẫn:** không phải secure context ("Cần HTTPS hoặc localhost"), `NotAllowedError` (cách cấp quyền camera cho Chrome/Safari), `NotFoundError` (không có camera), `NotReadableError` (camera đang bị app khác dùng).
  - **Phương án dự phòng luôn hiện:** *Chọn ảnh QR* (`<input type=file accept=image/* capture=environment>` → `createImageBitmap` → jsQR) và ô nhập tay.
  - Tiện ích: chọn camera (`enumerateDevices`), đèn pin nếu `track.getCapabilities().torch`.
  - Khung ngắm + hướng dẫn "Đưa mã vào khung".
- **Mock chỉ cho dev/Judge:** nút "Giả lập quét KT-004" (gắn nhãn rõ là giả lập) để demo khi máy không có camera — **không thay thế** quét thật.

### 10.2 Thiết bị (X-02) — `DevicePanel` ở Quầy → ⋯ → Thiết bị

| Khả năng | Cách làm | Hiển thị |
|---|---|---|
| Camera | `getUserMedia` | "Sẵn sàng / Chưa cấp quyền / Không có" |
| **Máy quét mã vạch USB/Bluetooth (HID, giả bàn phím)** | Hook `useKeyboardWedge`: gom ký tự đến nhanh (<35ms/ký tự), kết thúc bằng Enter, độ dài ≥3 → coi là 1 lần quét, `preventDefault`, điền vào ô khách hàng và tra cứu. Khi ô mã đang focus thì máy quét tự gõ + Enter → hoạt động như bình thường | Lần quét gần nhất + thời điểm |
| Rung | `navigator.vibrate?.()` thành công `[30]`, lỗi `[60,40,60]` | "Hỗ trợ / Không" + nút thử |
| Âm thanh | WebAudio (oscillator): bíp thành công / lỗi; mở khóa sau cử chỉ người dùng; công tắc bật/tắt lưu trong session | Bật/Tắt + nút thử |
| Giữ sáng màn hình | `navigator.wakeLock.request('screen')` khi ở Quầy; xin lại khi `visibilitychange` | Đang giữ / Không hỗ trợ |
| In biên lai | `window.print()` + CSS `@media print` cho giấy 58/80mm (`@page { size: 80mm auto; margin: 4mm }`), chỉ in `.receipt` | Nút "In thử" |
| Chia sẻ voucher | `navigator.share` nếu có (fallback sao chép) | — |
| Toàn màn hình (kiosk) | Fullscreen API | Nút bật/tắt |

Mọi khả năng **phát hiện tính năng** (`'xxx' in navigator`), thiếu thì ẩn/đánh dấu "Không hỗ trợ", không bao giờ ném lỗi.

---

## 11. PWA & OFFLINE

`vite.config.ts` dùng `vite-plugin-pwa`:

```ts
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png', 'sample-qr/*.png'],
  manifest: {
    name: 'Vibe Rewards — Thẻ thành viên', short_name: 'Vibe Rewards', lang: 'vi',
    display: 'standalone', orientation: 'portrait', start_url: '/', scope: '/',
    theme_color: '#0F6B4B', background_color: '#F6F7F5',
    icons: [ /* 64, 192, 512, maskable 512 */ ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,webmanifest}'],
    navigateFallback: '/index.html',
    cleanupOutdatedCaches: true,
    skipWaiting: true, clientsClaim: true
  },
  devOptions: { enabled: false }
})
```

- Precache **toàn bộ** shell + chunk + font + `seed.json` (import tĩnh/`?url`) + ảnh QR mẫu ⇒ mở được khi mất mạng ngay từ lần mở thứ 2.
- Không gọi mạng khi khởi động ở chế độ thi (không analytics, không font ngoài).
- `index.html`: `viewport-fit=cover`, `theme-color`, `apple-mobile-web-app-capable`, `apple-touch-icon`.
- `useInstallPrompt`: bắt `beforeinstallprompt` → nút "Cài ứng dụng"; iOS → hướng dẫn "Chia sẻ → Thêm vào MH chính".
- Cập nhật SW: hiện toast "Đã có phiên bản mới — Tải lại" khi `onNeedRefresh`.
- **Kiểm thử offline bắt buộc:** build production → `npm run preview` → mở 1 lần → DevTools Offline → reload → thao tác đầy đủ (đăng ký, cộng, đổi, lịch sử).

---

## 12. CLOUD MODE (Supabase) — chi tiết

**Thiết lập (viết vào README, làm tay một lần)**

1. Tạo project Supabase (free). Lấy `Project URL` + `anon key` → biến môi trường Vercel `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
2. SQL Editor: chạy `01_schema.sql`, rồi `02_seed.sql`.
3. Authentication → Providers → Email: **bật**, **tắt "Confirm email"**. URL Configuration: Site URL = domain Vercel.
4. Tạo admin: Authentication → Users → Add user; chạy `update public.profiles set role='admin' where id=(select id from auth.users where email='…');`
5. Staff: tự "Đăng ký tài khoản nhân viên" trong app → Admin cấp quyền ở **Quản trị → Nhân sự**.

**Đăng nhập**

- Trang `/login` có 2 tab: **Thành viên** (SĐT + PIN 6 số) và **Nhân viên / Quản trị** (email + mật khẩu). Nút phụ **"Dùng thử không cần đăng nhập"** → vào Chế độ thi.
- Thành viên: email giả `{phoneChuanHoa}@{VITE_MEMBER_EMAIL_DOMAIN}`, mật khẩu = PIN. Đăng ký: `auth.signUp` (kèm `display_name`) → ngay sau đó `rpc('register_member')`. Nếu `register_member` lỗi sau khi tạo user (vd `PHONE_EXISTS`) → hiện lỗi + cho đăng nhập; nếu đăng nhập thấy chưa có thẻ → chuyển tới màn "Hoàn tất đăng ký thẻ".
- **Rủi ro đã biết:** Supabase có thể từ chối tên miền email giả → cho phép cấu hình `VITE_MEMBER_EMAIL_DOMAIN`; nếu vẫn lỗi, tab Thành viên chuyển sang đăng nhập bằng email thật (ghi vào DECISIONS.md).
- Vai trò: đọc `profiles.role` sau đăng nhập → `RequireRole`: member→`/m/*`; staff→`/counter/*` (+ xem thẻ thành viên); admin→tất cả. Role switcher chỉ hiện các vai được phép.
- Phiên do `supabase-js` giữ (localStorage). Đăng xuất → quay về Chế độ thi.

**Realtime:** staff/admin subscribe `members`, `ledger`, `vouchers`; member subscribe `members` với filter `user_id=eq.<uid>`. Sự kiện → `invalidateQueries`. Có polling dự phòng 15s khi kênh không kết nối.

**Cloud & offline:** ghi cần mạng. Mất mạng → banner + vô hiệu nút ghi + nút "Chuyển sang Chế độ thi". Dữ liệu Local và Cloud là **hai tập độc lập** — nói rõ trong UI (tooltip ở ModeBadge).

**Kiểm thử RLS (ghi vào TEST_REPORT):** (a) anon không đọc được `members/ledger/vouchers`; (b) member chỉ thấy thẻ/lịch sử/ví của mình; (c) member gọi `earn_points` → `FORBIDDEN`; (d) staff không gọi được `adjust_points`; (e) hai request song song cùng `tx_code` → đúng 1 thành công.

---

## 13. KIỂM THỬ

### 13.1 Unit (Vitest) — bắt buộc đạt trước khi sang P1

| Nhóm | Ca |
|---|---|
| `tierFor` | 0→bronze · 999→bronze · 1000→silver · 4999→silver · 5000→gold · 12500→gold |
| `calcEarnPoints` | 1.000.000→100 · 1.500.000→150 · 15.000→1 · 19.999→1 · 10.000→1 · 9.999→0 |
| Chuẩn hóa | `' tx-kt-002 '`→`TX-KT-002` · `+84900001009`→`0900001009` · `0900.001.009`→`0900001009` · `normScan(' kt-004\n')`→`KT-004` |
| **TC-KT-01** | Seed → earn(KT-008, 1.000.000, TX-NEW-001) → delta 100, 0→100, ledger +1, tier bronze→bronze |
| **TC-KT-02** | earn(KT-002, 1.500.000, TX-KT-002) → throw `DUPLICATE_TX`; điểm 1.450; `ledger.length` không đổi; thêm biến thể `tx-kt-002`, `' TX-KT-002 '`, và dùng mã của KT-002 cho KT-001 → vẫn trùng |
| **TC-KT-03** | redeem(KT-005, KT-VCH-01) → 5.800→5.300, 1 voucher `active`, hạn = now+30d, tier vẫn gold |
| **TC-KT-04** | redeem(KT-008, KT-VCH-01) → `INSUFFICIENT_POINTS` `{need:500,have:0,missing:500}`; điểm 0; không voucher; ledger không đổi |
| Đổi đúng bằng số dư | member 500 điểm đổi mức 500 → còn 0, thành công |
| Tụt hạng | KT-005 (5.800) đổi VCH-03 (2.000) → 3.800 bạc, `tierDown=true` |
| Lên hạng | KT-003 (800) cộng 2.000.000đ → +200 → 1.000 → `silver`, `tierUp=true`; KT-004 (3.200) cộng 18.000.000đ → +1.800 → 5.000 → `gold`, `tierUp=true` |
| Đăng ký | mã `KT-009` rồi `KT-010`; SĐT trùng (kể cả `+84…`) → `PHONE_EXISTS`; tên 1 ký tự → `INVALID_NAME` |
| Voucher | dùng 1 lần; lần 2 `VOUCHER_USED`; quá hạn `VOUCHER_EXPIRED` |
| Hoàn tác | void(TX-NEW-001) → điểm về 0; void lần 2 `ALREADY_VOIDED`; void khi điểm đã tiêu `INSUFFICIENT_POINTS`; mã GD gốc vẫn trùng nếu nhập lại |
| Thống kê (bộ mẫu) | issued 28.900 · spent 200 · circulating 28.700 · members 8 · tiers {bronze:3, silver:3, gold:2} · transactions 7 |
| Đối soát | bộ mẫu → 0 sai lệch; cố tình sửa 1 điểm → phát hiện |
| Bất biến | sau chuỗi ngẫu nhiên (property-style 200 bước earn/redeem/void): `circulating = issued − spent` và `points ≥ 0` luôn đúng |
| Lưu trữ | ghi/đọc vòng tròn; JSON hỏng → khôi phục + có bản sao `corrupt`; `setItem` ném lỗi → DB trong bộ nhớ **không đổi** |
| Nạp mẫu | không thay đổi `points` so với seed; `codeSeq=8`; chạy 2 lần cho cùng kết quả |

### 13.2 Component (Testing Library): `EarnForm` (preview, lỗi, chống bấm đúp), `MembershipCard` (màu theo hạng, mã hiển thị), `MoneyInput`.

### 13.3 E2E (Playwright, chạy trên bản `build` + `preview`; viewport 390×844 **và** 1280×800)

- `tc-kt-01…04.spec.ts` đúng như bảng BTC (nạp mẫu → thao tác bằng UI → kiểm số hiển thị).
- `tc-kt-05.spec.ts`: Chromium với `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-video-capture=<KT-004.y4m>` (chuyển từ `sample-qr/KT-004.png` bằng ffmpeg); nếu CI không có ffmpeg → test quét bằng **tải ảnh QR lên** (`setInputFiles`) và đánh dấu quét camera là kiểm tay.
- `offline.spec.ts`: mở app → `context.setOffline(true)` → reload → cộng điểm → reload → dữ liệu còn.
- `multitab.spec.ts`: 2 tab cùng origin; tab A (Quầy) cộng điểm → tab B (Thành viên) cập nhật không cần reload.
- `mobile.spec.ts`: không cuộn ngang, vùng chạm ≥44px cho nút chính, không lỗi console.

### 13.4 Kiểm tay trước khi nộp (điền vào `TEST_REPORT.md`)

iPhone Safari + Android Chrome (cả camera quét QR giấy & màn hình), màn 360px, xoay ngang, chế độ máy bay, nạp mẫu 3 lần liên tiếp, Lighthouse mobile (mục tiêu Performance ≥85, Accessibility ≥95, Best Practices ≥95, PWA đạt), không cảnh báo console.

---

## 14. TRIỂN KHAI VERCEL (FREE)

**`vercel.json`**

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "camera=(self), geolocation=(), microphone=()" }
    ]},
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
  ]
}
```

(Vercel phục vụ file tĩnh có sẵn trước, rồi mới áp `rewrites` ⇒ SPA fallback an toàn.)

**Các bước:** push GitHub → Vercel *Import Project* → Framework *Vite* → thêm 4 biến môi trường (mục 5) → Deploy. Preview deployment cho mỗi nhánh.

**Checklist sau deploy:** mở bằng điện thoại (HTTPS) → quét QR bằng camera được · "Thêm vào màn hình chính" được · tắt mạng vẫn chạy (chế độ thi) · `/rules`, `/judge`, `/counter` mở trực tiếp bằng URL không bị 404 · Cloud: đăng nhập admin/staff/member đúng quyền.

**Lưu ý free tier:** project Supabase free bị **tạm dừng nếu không hoạt động ~1 tuần** → mở dashboard "Restore" trước ngày demo. Chế độ thi không phụ thuộc Supabase nên không bị ảnh hưởng.

---

## 15. LỘ TRÌNH THEO PHASE (mỗi phase kết thúc ở trạng thái deploy được)

### P0 — Nền móng & Domain (không UI)
Khởi tạo Vite+TS+Tailwind+ESLint+Prettier+Vitest; cấu trúc thư mục; `src/data/seed.json`; **toàn bộ `domain/`** + unit test mục 13.1; `localService` + `storage` + `DataService` interface; CI script `check`.
**DoD:** `npm run check` xanh; tất cả test 13.1 đạt; mã nguồn `domain/` không import React.

### P1 — Phần lõi chạy được (Local) + Deploy v1
Router, AppShell, RoleSwitcher, ModeBadge; **Landing + Nạp dữ liệu mẫu**; Thành viên (đăng ký, thẻ đổi màu, mã, tiến độ, ưu đãi, ví, lịch sử); Quầy (tra cứu mã/SĐT, cộng điểm + preview + chống trùng, đổi hộ, dùng voucher, gần đây); Admin tối thiểu (danh sách TV, sổ điểm, thống kê KPI, cấu hình, ưu đãi); **Thể lệ**; **Judge panel (không có selfTest)**; responsive mobile-first; deploy Vercel.
**DoD:** R-01…R-09 đạt; TC-KT-01…04 chạy đúng bằng UI trên điện thoại; không lỗi console.

### P2 — QR, thiết bị, hiệu ứng, PWA, trải nghiệm
`QrCodeView` + `QrScanner` (camera/ảnh/tay) + `useKeyboardWedge`; DevicePanel; rung/âm; wake lock; biên lai in; hiệu ứng mục 9.6 (count-up, tích, lên hạng + pháo, rung lỗi); hoàn tác GD; thống kê đầy đủ (phân bố hạng, 7 ngày); PWA + offline + install; đa tab; Judge selfTest; hoàn thiện empty/error/skeleton/a11y.
**DoD:** TC-KT-05 quét camera thật trên điện thoại; offline e2e xanh; Lighthouse mobile đạt mục tiêu.

### P3 — Cloud (Supabase)
`supabaseClient` (import động) + `cloudService` + `errorMap`; Auth (login 2 tab, signup, `RequireRole`); Quản trị Nhân sự; Công cụ Nạp mẫu Cloud; Realtime; kiểm thử RLS (13.4/12). Ẩn hoàn toàn Cloud nếu thiếu env.
**DoD:** bộ test RLS đạt; chạy đủ TC-KT-01…04 ở Cloud; chuyển Local↔Cloud không lỗi; Local không bị ảnh hưởng.

### P4 — Hoàn thiện, hồ sơ, demo
Hồ sơ (mục 16), ảnh chụp/GIF, `TEST_REPORT.md` có số liệu thật, vòng QA thiết bị thật, sửa lỗi, dọn code, tag `v1.0.0`, deploy production, quay video demo.
**DoD:** checklist mục 17 đủ ✓.

---

## 16. HỒ SƠ NỘP BÀI & KỊCH BẢN DEMO

**Bộ hồ sơ (đặt trong repo, README trỏ tới):**

| File | Nội dung chính |
|---|---|
| `README.md` | Giới thiệu, link demo, ảnh chụp, **chạy 3 lệnh** (`npm i` · `npm run dev` · `npm run build`), tài khoản demo (admin/staff/member — **chỉ ghi trong hồ sơ nộp, không commit mật khẩu thật**), cấu hình Supabase, cấu trúc thư mục |
| `docs/ARCHITECTURE.md` | Sơ đồ mục 4, luồng dữ liệu, mô hình dữ liệu (ER), vì sao Local-first, bảo mật (RLS/RPC) |
| `docs/USER_GUIDE.md` | Hướng dẫn 3 vai bằng ảnh; **Thể lệ** (tỉ lệ, hạng, ưu đãi, mã GD) |
| `docs/DECISIONS.md` | D1–D5, giả định, đánh đổi, rủi ro đã biết |
| `docs/TEST_REPORT.md` | Ma trận yêu cầu ↔ test, kết quả unit/e2e (số thật), kết quả kiểm tay thiết bị, Lighthouse |
| `docs/DEMO_SCRIPT.md` | Kịch bản bên dưới |

**Kịch bản demo (6–7 phút, 2 thiết bị: điện thoại = Thành viên, laptop = Quầy):**

1. **0:00** Landing → *Nạp dữ liệu mẫu* (8 TV, 7 GD, 3 ưu đãi). Nói 1 câu về Local-first + offline.
2. **0:40** Điện thoại: *Đăng ký* "Lan Hương" → thẻ **KT-009** đổi màu Đồng, QR hiện.
3. **1:30** Laptop (Quầy): **quét QR KT-004** bằng camera → mở hồ sơ Dũng Phạm (3.200, Bạc).
4. **2:15** Cộng 1.000.000đ, mã `TX-NEW-002` → +100 → **điện thoại tự cập nhật** (đa tab/realtime), hiệu ứng.
5. **3:00** Nhập lại mã trùng → **báo lỗi rõ**, không cộng. Thử chữ thường → vẫn chặn.
6. **3:40** KT-003 (800) cộng 2.000.000đ → **lên Bạc**: pháo giấy + thẻ đổi màu.
7. **4:20** KT-005 đổi VCH-01 (5.800→5.300) → voucher vào ví; KT-008 (0 điểm) đổi → **từ chối**. Nhắc cảnh báo tụt hạng.
8. **5:00** Quầy: quét voucher → *Đã dùng*; Lịch sử; **Thể lệ**.
9. **5:30** Admin: thống kê (phát − dùng = lưu hành), Đối soát ✓ 8/8, *Hoàn tác* giao dịch nhập nhầm.
10. **6:15** Bật chế độ máy bay → vẫn thao tác. Mở **/judge** → *Tự kiểm tra* 5/5 ✓. (Nếu còn thời gian: đăng nhập Cloud, realtime giữa 2 thiết bị.)

---

## 17. CHECKLIST NGHIỆM THU CUỐI (tự chấm trước khi nộp)

- [ ] Nạp mẫu: 8 TV / 7 GD / 3 ưu đãi; KT-004 = 3.200 Bạc; điểm KHÔNG bị cộng lại; nạp 2 lần ra cùng kết quả
- [ ] TC-KT-01…05 đúng bằng UI (điện thoại + laptop)
- [ ] Đăng ký → mã duy nhất hiển thị trên thẻ; SĐT trùng bị chặn
- [ ] Thẻ đổi màu theo hạng; biên 999/1000/4999/5000 đúng; Thể lệ công bố đủ
- [ ] Quầy cộng theo tỉ lệ, làm tròn xuống; thành viên cập nhật ngay; chống trùng (cả khác hoa/thường)
- [ ] Đổi ≥2 mức; trừ đúng; ví ưu đãi; thiếu điểm bị từ chối; cảnh báo tụt hạng
- [ ] Lịch sử có loại · điểm · thời gian · số dư sau
- [ ] QR hiển thị (payload = mã) + quét camera thật + ảnh + máy quét USB
- [ ] Hiệu ứng cộng điểm / lên hạng; thống kê mini; Đối soát ✓
- [ ] Offline hoàn chỉnh; reload không mất dữ liệu; localStorage hỏng được khôi phục
- [ ] Mobile 360–430px không cuộn ngang; vùng chạm ≥44px; HTTPS camera ổn
- [ ] Cloud: login 3 vai, RLS đúng, realtime; thiếu env thì ẩn Cloud
- [ ] `npm run check` xanh; không lỗi/ cảnh báo console; Lighthouse đạt mục tiêu
- [ ] Hồ sơ 6 tài liệu + link demo + tài khoản demo + video

---

## 18. NGOÀI PHẠM VI & RỦI RO

**Không làm (ghi rõ trong DECISIONS.md):** NFC/Web Serial, đa ngôn ngữ, dark mode, push notification, thanh toán thật, chống gian lận nâng cao (rate-limit theo IP), phân quyền ở chế độ thi.

| Rủi ro | Giảm thiểu |
|---|---|
| Giám khảo thử khi mất mạng ngay lần mở đầu (SW chưa cài) | Landing nhắc "Mở 1 lần khi có mạng để dùng offline"; PWA precache; hướng dẫn trong README |
| Camera bị chặn / không có HTTPS | Lỗi có hướng dẫn + tải ảnh QR + nhập tay + mock có nhãn |
| iOS Safari lỗi `getUserMedia` trong PWA standalone | Mở trong tab trình duyệt cho đường dẫn quét; ghi chú trong User Guide |
| `localStorage` đầy/hỏng | `STORAGE_FULL`, backup + khôi phục, xuất/nhập JSON |
| Supabase từ chối email giả của đăng nhập SĐT | `VITE_MEMBER_EMAIL_DOMAIN` + phương án email thật |
| Supabase free bị tạm dừng | Nhắc Restore trước demo; chế độ thi độc lập |
| Hai nơi cùng logic (TS & SQL) lệch nhau | Cùng thứ tự kiểm tra + cùng mã lỗi (7.4) + test RLS/E2E trên Cloud đối chiếu TC-KT-01…04 |
| Hạng tụt khi đổi gây hiểu nhầm | Cảnh báo ở hộp xác nhận + câu giải thích trong Thể lệ |

---

## PHỤ LỤC A — Thông điệp (copy dùng nguyên)

| Mã | Thông điệp hiển thị |
|---|---|
| `INVALID_NAME` | Vui lòng nhập họ tên (2–80 ký tự). |
| `INVALID_PHONE` | Số điện thoại chưa đúng. Nhập 10 số bắt đầu bằng 0 (hoặc +84…). |
| `PHONE_EXISTS` | Số điện thoại này đã đăng ký thẻ. Bạn có thể xem thẻ hiện có. |
| `MEMBER_NOT_FOUND` | Không tìm thấy thành viên. Kiểm tra lại mã/SĐT hoặc đăng ký thành viên mới. |
| `MEMBER_LOCKED` | Thẻ đang bị khóa, chưa thể giao dịch. Liên hệ quản trị viên. |
| `INVALID_TX_CODE` | Mã giao dịch gồm 3–40 ký tự chữ, số hoặc `- _ . /`. |
| `INVALID_AMOUNT` | Số tiền không hợp lệ. Nhập số nguyên dương. |
| `AMOUNT_TOO_SMALL` | Giao dịch cần tối thiểu {vndPerPoint}đ để tích điểm. |
| `DUPLICATE_TX` | Mã giao dịch **{tx}** đã được cộng điểm cho **{member}** lúc {time}. Không cộng điểm lần nữa. |
| `REWARD_UNAVAILABLE` | Ưu đãi này hiện không còn áp dụng. |
| `INSUFFICIENT_POINTS` | Chưa đủ điểm: cần {need}, hiện có {have} (thiếu {missing}). Số dư không thay đổi. |
| `VOUCHER_NOT_FOUND` | Không tìm thấy voucher với mã này. |
| `VOUCHER_USED` | Voucher này đã được sử dụng lúc {time}. |
| `VOUCHER_EXPIRED` | Voucher đã hết hạn ngày {date}. |
| `ALREADY_VOIDED` | Giao dịch này đã được hoàn tác trước đó. |
| `NOT_VOIDABLE` | Chỉ hoàn tác được giao dịch cộng điểm. |
| `REASON_REQUIRED` | Vui lòng nhập lý do (tối thiểu 3 ký tự). |
| `FORBIDDEN` | Bạn không có quyền thực hiện thao tác này. |
| `NETWORK_ERROR` | Không có kết nối mạng. Chế độ Cloud cần mạng — bạn có thể chuyển sang Chế độ thi (offline). |
| `STORAGE_FULL` | Bộ nhớ trình duyệt đã đầy. Hãy xuất sao lưu và dọn dữ liệu. |
| `UNKNOWN` | Có lỗi xảy ra, dữ liệu của bạn không bị thay đổi. Vui lòng thử lại. |

Thông điệp thành công: *"Đã cộng {delta} điểm cho {name}. Số dư mới: {points} điểm."* · *"Đổi thành công «{reward}». Voucher đã vào ví của bạn (hạn {date})."* · *"Chúc mừng! Bạn đã lên hạng {tier}."*

## PHỤ LỤC B — Dữ liệu mẫu BTC (tóm tắt để đối chiếu nhanh)

| Mã | Tên | Đầu kỳ | Hiện tại | Hạng |
|---|---|---|---|---|
| KT-001 | An Nguyễn | 200 | 250 | Đồng |
| KT-002 | Bình Trần | 1.300 | 1.450 | Bạc |
| KT-003 | Chi Lê | 1.000 | 800 | Đồng |
| **KT-004** | **Dũng Phạm** | 3.000 | **3.200** | **Bạc** |
| KT-005 | Hà Võ | 5.000 | 5.800 | Vàng |
| KT-006 | Minh Đỗ | 12.000 | 12.500 | Vàng |
| KT-007 | Ngọc Bùi | 4.000 | 4.700 | Bạc |
| KT-008 | Phúc Hoàng | 0 | 0 | Đồng |

SĐT `0900001001…0900001008` (tương ứng KT-001…008). Ưu đãi: KT-VCH-01 *Voucher 20.000đ* 500đ · KT-VCH-02 *Voucher 50.000đ* 1.100đ · KT-VCH-03 *Quà tặng đặc biệt* 2.000đ. Giao dịch: TX-KT-001…007 (50, 150, −200, 200, 800, 500, 700 điểm).

*(Chi tiết đầy đủ nằm trong `src/data/seed.json`.)*
