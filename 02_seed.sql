-- =====================================================================
-- 02_seed.sql — Nạp dữ liệu mẫu BTC (Du_lieu_mau_Vibe_Coding_bangA.xlsx)
-- Chạy SAU 01_schema.sql, trong Supabase → SQL Editor. Có thể chạy lại nhiều lần
-- (mỗi lần chạy = đưa dữ liệu về đúng trạng thái ban đầu của bộ mẫu).
-- Điểm hiện tại ĐÃ gồm các giao dịch mẫu → chèn thẳng vào sổ, KHÔNG cộng lại.
-- File này sinh tự động từ bộ mẫu; sửa dữ liệu => sửa trong seed.json rồi sinh lại.
-- =====================================================================

create or replace function public._load_sample_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- (dùng "where true" vì pg_safeupdate của Supabase chặn DELETE không có WHERE)
  delete from public.vouchers where true;
  delete from public.ledger   where true;
  delete from public.members  where true;
  delete from public.rewards  where true;

  update public.settings
     set program_name = 'Vibe Rewards', vnd_per_point = 10000, silver_min = 1000, gold_min = 5000,
         voucher_valid_days = 30, updated_at = now()
   where id = 1;

  insert into public.rewards (code, name, description, cost_points, kind, value_vnd, active, sort_order)
  values
    ('KT-VCH-01', 'Voucher 20.000đ', 'Giảm giá đơn hàng', 500, 'voucher', 20000, true, 1),
    ('KT-VCH-02', 'Voucher 50.000đ', 'Giảm giá đơn hàng', 1100, 'voucher', 50000, true, 2),
    ('KT-VCH-03', 'Quà tặng đặc biệt', 'Quà tặng mô phỏng', 2000, 'gift', null, true, 3);

  insert into public.members (code, full_name, phone, opening_points, points, joined_at)
  values
    ('KT-001', 'An Nguyễn', '0900001001', 200, 250, '2026-09-05'),
    ('KT-002', 'Bình Trần', '0900001002', 1300, 1450, '2026-08-17'),
    ('KT-003', 'Chi Lê', '0900001003', 1000, 800, '2026-07-22'),
    ('KT-004', 'Dũng Phạm', '0900001004', 3000, 3200, '2026-06-14'),
    ('KT-005', 'Hà Võ', '0900001005', 5000, 5800, '2026-04-09'),
    ('KT-006', 'Minh Đỗ', '0900001006', 12000, 12500, '2026-02-28'),
    ('KT-007', 'Ngọc Bùi', '0900001007', 4000, 4700, '2026-03-11'),
    ('KT-008', 'Phúc Hoàng', '0900001008', 0, 0, '2026-10-10');

  -- Sổ giao dịch mẫu (thời gian BTC không có múi giờ → hiểu là giờ Việt Nam +07:00)
  insert into public.ledger (tx_code, member_id, type, amount_vnd, delta, balance_after, note, created_at)
  select v.tx, m.id, v.typ, v.amt, v.dl, v.bal, 'Dữ liệu mẫu đã ghi nhận', v.ts::timestamptz
  from (values
    ('TX-KT-001', 'KT-001', 'earn', 500000, 50, 250, '2026-10-03T09:15:00+07:00'),
    ('TX-KT-002', 'KT-002', 'earn', 1500000, 150, 1450, '2026-10-04T11:40:00+07:00'),
    ('TX-KT-003', 'KT-003', 'redeem', 0, -200, 800, '2026-10-05T14:05:00+07:00'),
    ('TX-KT-004', 'KT-004', 'earn', 2000000, 200, 3200, '2026-10-06T18:20:00+07:00'),
    ('TX-KT-005', 'KT-005', 'earn', 8000000, 800, 5800, '2026-10-08T10:30:00+07:00'),
    ('TX-KT-006', 'KT-006', 'earn', 5000000, 500, 12500, '2026-10-09T16:10:00+07:00'),
    ('TX-KT-007', 'KT-007', 'earn', 7000000, 700, 4700, '2026-10-11T12:55:00+07:00')
  ) as v(tx, mcode, typ, amt, dl, bal, ts)
  join public.members m on m.code = v.mcode;

  -- Mã thành viên mới tiếp theo sẽ là KT-009
  perform setval('public.member_code_seq', 8, true);
end;
$$;

-- Hàm bọc cho Admin gọi từ app (nút "Nạp dữ liệu mẫu" ở chế độ Cloud)
create or replace function public.load_sample_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;
  perform public._load_sample_data();
  return jsonb_build_object(
    'ok', true,
    'members', (select count(*) from public.members),
    'ledger',  (select count(*) from public.ledger),
    'rewards', (select count(*) from public.rewards)
  );
end;
$$;

revoke execute on function public._load_sample_data() from public, anon, authenticated;
revoke execute on function public.load_sample_data()  from public, anon;
grant  execute on function public.load_sample_data()  to authenticated;

-- Nạp ngay bây giờ (SQL Editor chạy bằng quyền postgres nên gọi được hàm nội bộ)
select public._load_sample_data();

-- Kiểm tra nhanh: 8 thành viên, 7 giao dịch, 3 ưu đãi, tổng điểm lưu hành 28.700
select
  (select count(*) from public.members)                    as members,
  (select count(*) from public.ledger)                     as ledger,
  (select count(*) from public.rewards)                    as rewards,
  (select sum(points) from public.members)                 as circulating_points,
  (select count(*) from public.members m
    where m.opening_points + coalesce((select sum(delta) from public.ledger l where l.member_id = m.id), 0) <> m.points) as reconcile_errors;
