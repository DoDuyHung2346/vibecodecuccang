-- =====================================================================
-- 01_schema.sql — Hệ thống thẻ thành viên 2 đầu (Thành viên & Quầy)
-- Supabase (PostgreSQL 15 + PostgREST). Chạy trong SQL Editor, SAU ĐÓ chạy 02_seed.sql.
-- File chạy lại được nhiều lần (idempotent).
--
-- Nguyên tắc:
--   * Client KHÔNG ghi trực tiếp vào members / ledger / vouchers. Mọi thay đổi điểm đi qua
--     hàm RPC (security definer) => giao dịch nguyên tử, khóa dòng, chống cộng trùng.
--   * Hạng (tier) KHÔNG lưu cứng, luôn suy ra từ điểm hiện có + ngưỡng trong bảng settings.
--   * Lỗi nghiệp vụ trả về dạng raise exception 'MA_LOI' (PostgREST => HTTP 400,
--     field "message" = mã lỗi, field "details" = JSON chi tiết nếu có).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BẢNG
-- ---------------------------------------------------------------------

-- 1.1 Cấu hình chương trình (1 dòng duy nhất)
create table if not exists public.settings (
  id                 int primary key default 1 check (id = 1),
  program_name       text        not null default 'Vibe Rewards',
  vnd_per_point      int         not null default 10000 check (vnd_per_point > 0),
  silver_min         int         not null default 1000  check (silver_min > 0),
  gold_min           int         not null default 5000,
  voucher_valid_days int         not null default 30    check (voucher_valid_days > 0),
  updated_at         timestamptz not null default now(),
  constraint settings_tier_order check (gold_min > silver_min)
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- 1.2 Hồ sơ tài khoản đăng nhập (member | staff | admin)
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text        not null default 'member' check (role in ('member', 'staff', 'admin')),
  display_name text,
  created_at   timestamptz not null default now()
);

-- 1.3 Thành viên
create sequence if not exists public.member_code_seq start 1;

create table if not exists public.members (
  id              uuid primary key default gen_random_uuid(),
  code            text        not null unique,                       -- mã thành viên, cũng là nội dung QR
  full_name       text        not null check (char_length(btrim(full_name)) between 1 and 80),
  phone           text        not null unique check (phone ~ '^0[0-9]{9}$'),
  opening_points  int         not null default 0 check (opening_points >= 0),  -- điểm đầu kỳ (chỉ để đối soát)
  points          int         not null default 0 check (points >= 0),          -- điểm hiện có
  status          text        not null default 'active' check (status in ('active', 'locked')),
  user_id         uuid unique references auth.users (id) on delete set null,   -- tài khoản đăng nhập (nếu có)
  joined_at       date        not null default current_date,
  created_at      timestamptz not null default now()
);

-- 1.4 Sổ biến động điểm (append-only). Mỗi tx_code CHỈ xuất hiện 1 lần => chống cộng trùng
create table if not exists public.ledger (
  id               uuid primary key default gen_random_uuid(),
  tx_code          text        not null unique,                      -- đã chuẩn hóa: UPPER + trim
  member_id        uuid        not null references public.members (id) on delete cascade,
  type             text        not null check (type in ('earn', 'redeem', 'adjust', 'reversal')),
  amount_vnd       bigint      not null default 0 check (amount_vnd >= 0),
  delta            int         not null,
  balance_after    int         not null check (balance_after >= 0),
  note             text,
  reward_code      text,
  reverses_tx_code text unique,                                      -- mỗi giao dịch chỉ được hoàn tác 1 lần
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists ledger_member_time_idx on public.ledger (member_id, created_at desc);
create index if not exists ledger_time_idx        on public.ledger (created_at desc);

-- 1.5 Danh mục ưu đãi
create table if not exists public.rewards (
  code        text primary key,
  name        text        not null,
  description text,
  cost_points int         not null check (cost_points > 0),
  kind        text        not null default 'voucher' check (kind in ('voucher', 'gift')),
  value_vnd   int         check (value_vnd is null or value_vnd >= 0),
  active      boolean     not null default true,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

-- 1.6 Ví ưu đãi của thành viên ("expired" được suy ra: status='active' và expires_at < now())
create table if not exists public.vouchers (
  id              uuid primary key default gen_random_uuid(),
  code            text        not null unique,
  member_id       uuid        not null references public.members (id) on delete cascade,
  reward_code     text        references public.rewards (code) on delete set null,
  reward_name     text        not null,
  cost_points     int         not null,
  status          text        not null default 'active' check (status in ('active', 'used')),
  issued_at       timestamptz not null default now(),
  expires_at      timestamptz not null,
  used_at         timestamptz,
  used_by         uuid references auth.users (id) on delete set null,
  redeem_tx_code  text        references public.ledger (tx_code) on delete set null
);
create index if not exists vouchers_member_idx on public.vouchers (member_id, issued_at desc);

-- ---------------------------------------------------------------------
-- 2. HÀM TIỆN ÍCH
-- ---------------------------------------------------------------------

create or replace function public.app_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$$;

create or replace function public.norm_code(p text)
returns text
language sql immutable
as $$ select upper(btrim(coalesce(p, ''))) $$;

-- Chuẩn hóa SĐT Việt Nam: "+84 900 001 004" / "84900001004" / "0900.001.004" => "0900001004"
create or replace function public.norm_phone(p text)
returns text
language plpgsql immutable
as $$
declare
  d text := regexp_replace(coalesce(p, ''), '[^0-9+]', '', 'g');
begin
  if d like '+84%' then
    d := '0' || substr(d, 4);
  elsif d like '84%' and char_length(d) = 11 then
    d := '0' || substr(d, 3);
  end if;
  return d;
end;
$$;

create or replace function public.tier_for(p_points int)
returns text
language sql stable
set search_path = public
as $$
  select case when p_points >= s.gold_min   then 'gold'
              when p_points >= s.silver_min then 'silver'
              else 'bronze' end
  from public.settings s where s.id = 1;
$$;

-- Tự tạo profile (role member) khi có user mới ở Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'member',
          coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bù profile cho user đã tồn tại trước khi tạo trigger
insert into public.profiles (id, role, display_name)
select u.id, 'member', split_part(coalesce(u.email, ''), '@', 1)
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3. HÀM NGHIỆP VỤ (RPC)
-- ---------------------------------------------------------------------

-- 3.1 Đăng ký thành viên. Member tự đăng ký (gắn user_id) hoặc Quầy/Admin đăng ký hộ khách (user_id = null)
create or replace function public.register_member(p_full_name text, p_phone text)
returns public.members
language plpgsql security definer
set search_path = public
as $$
declare
  v_role  text := public.app_role();
  v_name  text := btrim(coalesce(p_full_name, ''));
  v_phone text := public.norm_phone(p_phone);
  v_m     public.members;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then raise exception 'INVALID_NAME'; end if;
  if v_phone !~ '^0[0-9]{9}$' then raise exception 'INVALID_PHONE'; end if;
  if exists (select 1 from public.members where phone = v_phone) then raise exception 'PHONE_EXISTS'; end if;
  if v_role not in ('staff', 'admin')
     and exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'ALREADY_REGISTERED';
  end if;

  insert into public.members (code, full_name, phone, user_id)
  values ('KT-' || lpad(nextval('public.member_code_seq')::text, 3, '0'),
          v_name, v_phone,
          case when v_role in ('staff', 'admin') then null else auth.uid() end)
  returning * into v_m;
  return v_m;
exception
  when unique_violation then raise exception 'PHONE_EXISTS';
end;
$$;

-- 3.2 Cộng điểm tại Quầy (staff | admin). Mỗi tx_code chỉ được cộng 1 lần
create or replace function public.earn_points(p_member_code text, p_amount_vnd bigint, p_tx_code text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_set    public.settings;
  v_m      public.members;
  v_code   text := public.norm_code(p_member_code);
  v_tx     text := public.norm_code(p_tx_code);
  v_delta  int;
  v_before int;
  v_after  int;
  v_dup    record;
begin
  if public.app_role() not in ('staff', 'admin') then raise exception 'FORBIDDEN'; end if;
  if v_tx !~ '^[A-Z0-9][A-Z0-9._/-]{2,39}$' then raise exception 'INVALID_TX_CODE'; end if;
  if p_amount_vnd is null or p_amount_vnd <= 0 or p_amount_vnd > 1000000000 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select * into v_set from public.settings where id = 1;
  v_delta := (p_amount_vnd / v_set.vnd_per_point)::int;          -- làm tròn XUỐNG
  if v_delta < 1 then raise exception 'AMOUNT_TOO_SMALL'; end if;

  select * into v_m from public.members where code = v_code for update;   -- khóa dòng thành viên
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  if v_m.status <> 'active' then raise exception 'MEMBER_LOCKED'; end if;

  select l.tx_code, l.created_at, m.code as member_code
    into v_dup
    from public.ledger l join public.members m on m.id = l.member_id
   where l.tx_code = v_tx;
  if found then
    raise exception 'DUPLICATE_TX'
      using detail = json_build_object('tx_code', v_dup.tx_code,
                                       'member_code', v_dup.member_code,
                                       'at', v_dup.created_at)::text;
  end if;

  v_before := v_m.points;
  v_after  := v_before + v_delta;

  insert into public.ledger (tx_code, member_id, type, amount_vnd, delta, balance_after, created_by)
  values (v_tx, v_m.id, 'earn', p_amount_vnd, v_delta, v_after, auth.uid());

  update public.members set points = v_after where id = v_m.id;

  return jsonb_build_object(
    'ok', true, 'tx_code', v_tx, 'member_code', v_m.code, 'full_name', v_m.full_name,
    'amount_vnd', p_amount_vnd, 'delta', v_delta,
    'points_before', v_before, 'points_after', v_after,
    'tier_before', public.tier_for(v_before), 'tier_after', public.tier_for(v_after),
    'created_at', now());
exception
  when unique_violation then raise exception 'DUPLICATE_TX';     -- 2 request song song cùng mã
end;
$$;

-- 3.3 Đổi điểm lấy ưu đãi. Member chỉ đổi cho chính mình; staff/admin đổi hộ
create or replace function public.redeem_reward(p_member_code text, p_reward_code text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_role   text := public.app_role();
  v_set    public.settings;
  v_m      public.members;
  v_r      public.rewards;
  v_v      public.vouchers;
  v_code   text := public.norm_code(p_member_code);
  v_tx     text;
  v_before int;
  v_after  int;
begin
  if v_role not in ('member', 'staff', 'admin') then raise exception 'FORBIDDEN'; end if;

  select * into v_m from public.members where code = v_code for update;
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  if v_role = 'member' and v_m.user_id is distinct from auth.uid() then raise exception 'FORBIDDEN'; end if;
  if v_m.status <> 'active' then raise exception 'MEMBER_LOCKED'; end if;

  select * into v_r from public.rewards where code = public.norm_code(p_reward_code);
  if not found or not v_r.active then raise exception 'REWARD_UNAVAILABLE'; end if;

  if v_m.points < v_r.cost_points then
    raise exception 'INSUFFICIENT_POINTS'
      using detail = json_build_object('need', v_r.cost_points, 'have', v_m.points,
                                       'missing', v_r.cost_points - v_m.points)::text;
  end if;

  select * into v_set from public.settings where id = 1;
  v_before := v_m.points;
  v_after  := v_before - v_r.cost_points;
  v_tx     := 'RD-' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD') || '-'
              || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into public.ledger (tx_code, member_id, type, amount_vnd, delta, balance_after, note, reward_code, created_by)
  values (v_tx, v_m.id, 'redeem', 0, -v_r.cost_points, v_after, 'Đổi ' || v_r.name, v_r.code, auth.uid());

  update public.members set points = v_after where id = v_m.id;

  insert into public.vouchers (code, member_id, reward_code, reward_name, cost_points, expires_at, redeem_tx_code)
  values ('VC-' || upper(substr(md5(gen_random_uuid()::text), 1, 8)),
          v_m.id, v_r.code, v_r.name, v_r.cost_points,
          now() + make_interval(days => v_set.voucher_valid_days), v_tx)
  returning * into v_v;

  return jsonb_build_object(
    'ok', true, 'tx_code', v_tx, 'member_code', v_m.code, 'full_name', v_m.full_name,
    'reward_code', v_r.code, 'reward_name', v_r.name, 'cost_points', v_r.cost_points,
    'points_before', v_before, 'points_after', v_after,
    'tier_before', public.tier_for(v_before), 'tier_after', public.tier_for(v_after),
    'voucher_code', v_v.code, 'voucher_expires_at', v_v.expires_at);
end;
$$;

-- 3.4 Quầy xác nhận khách dùng voucher
create or replace function public.use_voucher(p_voucher_code text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_v public.vouchers;
  v_m public.members;
begin
  if public.app_role() not in ('staff', 'admin') then raise exception 'FORBIDDEN'; end if;

  select * into v_v from public.vouchers where code = public.norm_code(p_voucher_code) for update;
  if not found then raise exception 'VOUCHER_NOT_FOUND'; end if;
  if v_v.status = 'used' then raise exception 'VOUCHER_USED'; end if;
  if v_v.expires_at < now() then raise exception 'VOUCHER_EXPIRED'; end if;

  update public.vouchers set status = 'used', used_at = now(), used_by = auth.uid() where id = v_v.id;
  select * into v_m from public.members where id = v_v.member_id;

  return jsonb_build_object('ok', true, 'voucher_code', v_v.code, 'reward_name', v_v.reward_name,
                            'member_code', v_m.code, 'full_name', v_m.full_name, 'used_at', now());
end;
$$;

-- 3.5 Admin điều chỉnh điểm thủ công (có lý do)
create or replace function public.adjust_points(p_member_code text, p_delta int, p_reason text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_m     public.members;
  v_after int;
  v_tx    text;
begin
  if public.app_role() <> 'admin' then raise exception 'FORBIDDEN'; end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 1000000 then raise exception 'INVALID_AMOUNT'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'REASON_REQUIRED'; end if;

  select * into v_m from public.members where code = public.norm_code(p_member_code) for update;
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;

  v_after := v_m.points + p_delta;
  if v_after < 0 then raise exception 'INSUFFICIENT_POINTS'; end if;

  v_tx := 'ADJ-' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD') || '-'
          || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  insert into public.ledger (tx_code, member_id, type, amount_vnd, delta, balance_after, note, created_by)
  values (v_tx, v_m.id, 'adjust', 0, p_delta, v_after, btrim(p_reason), auth.uid());
  update public.members set points = v_after where id = v_m.id;

  return jsonb_build_object('ok', true, 'tx_code', v_tx, 'member_code', v_m.code,
                            'delta', p_delta, 'points_before', v_m.points, 'points_after', v_after,
                            'tier_before', public.tier_for(v_m.points), 'tier_after', public.tier_for(v_after));
end;
$$;

-- 3.6 Hoàn tác một giao dịch CỘNG ĐIỂM nhập nhầm (tạo bút toán đảo, không xóa dòng gốc).
--     Admin: mọi giao dịch. Staff: chỉ giao dịch do chính mình tạo trong 30 phút gần nhất.
create or replace function public.void_earn(p_tx_code text, p_reason text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_role  text := public.app_role();
  v_o     public.ledger;
  v_m     public.members;
  v_after int;
  v_tx    text;
begin
  if v_role not in ('staff', 'admin') then raise exception 'FORBIDDEN'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'REASON_REQUIRED'; end if;

  select * into v_o from public.ledger where tx_code = public.norm_code(p_tx_code) for update;
  if not found then raise exception 'TX_NOT_FOUND'; end if;
  if v_o.type <> 'earn' then raise exception 'NOT_VOIDABLE'; end if;
  if exists (select 1 from public.ledger where reverses_tx_code = v_o.tx_code) then
    raise exception 'ALREADY_VOIDED';
  end if;
  if v_role = 'staff'
     and (v_o.created_by is distinct from auth.uid() or v_o.created_at < now() - interval '30 minutes') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_m from public.members where id = v_o.member_id for update;
  if v_m.points < v_o.delta then raise exception 'INSUFFICIENT_POINTS'; end if;   -- điểm đã được dùng

  v_after := v_m.points - v_o.delta;
  v_tx := 'VD-' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD') || '-'
          || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  insert into public.ledger (tx_code, member_id, type, amount_vnd, delta, balance_after, note, reverses_tx_code, created_by)
  values (v_tx, v_m.id, 'reversal', 0, -v_o.delta, v_after, 'Hoàn tác ' || v_o.tx_code || ': ' || btrim(p_reason),
          v_o.tx_code, auth.uid());
  update public.members set points = v_after where id = v_m.id;

  return jsonb_build_object('ok', true, 'tx_code', v_tx, 'reverses', v_o.tx_code, 'member_code', v_m.code,
                            'delta', -v_o.delta, 'points_before', v_m.points, 'points_after', v_after,
                            'tier_before', public.tier_for(v_m.points), 'tier_after', public.tier_for(v_after));
end;
$$;

-- 3.7 Admin sửa thông tin thành viên (không sửa điểm)
create or replace function public.admin_update_member(p_member_code text, p_full_name text, p_phone text, p_status text)
returns public.members
language plpgsql security definer
set search_path = public
as $$
declare
  v_m     public.members;
  v_name  text := btrim(coalesce(p_full_name, ''));
  v_phone text := public.norm_phone(p_phone);
begin
  if public.app_role() <> 'admin' then raise exception 'FORBIDDEN'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then raise exception 'INVALID_NAME'; end if;
  if v_phone !~ '^0[0-9]{9}$' then raise exception 'INVALID_PHONE'; end if;
  if p_status not in ('active', 'locked') then raise exception 'INVALID_STATUS'; end if;

  select * into v_m from public.members where code = public.norm_code(p_member_code) for update;
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  if exists (select 1 from public.members where phone = v_phone and id <> v_m.id) then
    raise exception 'PHONE_EXISTS';
  end if;

  update public.members set full_name = v_name, phone = v_phone, status = p_status
   where id = v_m.id returning * into v_m;
  return v_m;
end;
$$;

-- 3.8 Admin cấp quyền cho tài khoản (staff mới tự đăng ký bằng email, rồi Admin nâng quyền theo email)
create or replace function public.admin_set_role(p_email text, p_role text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if public.app_role() <> 'admin' then raise exception 'FORBIDDEN'; end if;
  if p_role not in ('member', 'staff', 'admin') then raise exception 'INVALID_ROLE'; end if;

  select id into v_uid from auth.users where lower(email) = lower(btrim(coalesce(p_email, '')));
  if v_uid is null then raise exception 'USER_NOT_FOUND'; end if;
  if v_uid = auth.uid() and p_role <> 'admin' then raise exception 'CANNOT_DEMOTE_SELF'; end if;

  update public.profiles set role = p_role where id = v_uid;
  return jsonb_build_object('ok', true, 'user_id', v_uid, 'role', p_role);
end;
$$;

create or replace function public.admin_list_accounts()
returns table (id uuid, email text, role text, display_name text, created_at timestamptz)
language plpgsql security definer
set search_path = public
as $$
begin
  if public.app_role() <> 'admin' then raise exception 'FORBIDDEN'; end if;
  return query
    select p.id, u.email::text, p.role, p.display_name, p.created_at
      from public.profiles p join auth.users u on u.id = p.id
     where p.role in ('staff', 'admin')
     order by p.created_at;
end;
$$;

-- 3.9 Thống kê mini cho Admin / Quầy.
--     issued      = điểm đầu kỳ + mọi điểm cộng (earn, adjust dương) − điểm bị hoàn tác
--     spent       = điểm đã đổi + điều chỉnh âm
--     circulating = tổng điểm đang nằm trong tài khoản  (luôn có: circulating = issued − spent)
create or replace function public.get_stats()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
begin
  if public.app_role() not in ('staff', 'admin') then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'members',     (select count(*) from public.members),
    'issued',      (select coalesce(sum(opening_points), 0) from public.members)
                 + (select coalesce(sum(delta), 0) from public.ledger where type in ('earn', 'adjust') and delta > 0)
                 - (select coalesce(sum(-delta), 0) from public.ledger where type = 'reversal'),
    'spent',       (select coalesce(sum(-delta), 0) from public.ledger where type in ('redeem', 'adjust') and delta < 0),
    'circulating', (select coalesce(sum(points), 0) from public.members),
    'tiers',       coalesce((select jsonb_object_agg(t, c)
                               from (select public.tier_for(points) as t, count(*) as c
                                       from public.members group by 1) x), '{}'::jsonb),
    'vouchers_active', (select count(*) from public.vouchers where status = 'active' and expires_at >= now()),
    'vouchers_used',   (select count(*) from public.vouchers where status = 'used'),
    'transactions',    (select count(*) from public.ledger),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', z.dt, 'points', z.p) order by z.dt)
                         from (select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as dt,
                                      coalesce(sum(delta) filter (where delta > 0), 0)    as p
                                 from public.ledger group by 1 order by 1 desc limit 7) z), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 4. RLS + QUYỀN
-- ---------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.profiles enable row level security;
alter table public.members  enable row level security;
alter table public.ledger   enable row level security;
alter table public.rewards  enable row level security;
alter table public.vouchers enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.settings, public.rewards to anon;
grant select on public.settings, public.rewards, public.profiles, public.members, public.ledger, public.vouchers to authenticated;
grant update on public.settings to authenticated;                       -- Admin (chặn bởi policy)
grant insert, update, delete on public.rewards to authenticated;        -- Admin (chặn bởi policy)

-- settings & rewards: công khai để trang Thể lệ đọc được ngay cả khi chưa đăng nhập
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select to anon, authenticated using (true);
drop policy if exists settings_admin_update on public.settings;
create policy settings_admin_update on public.settings for update to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

drop policy if exists rewards_read on public.rewards;
create policy rewards_read on public.rewards for select to anon, authenticated using (true);
drop policy if exists rewards_admin_write on public.rewards;
create policy rewards_admin_write on public.rewards for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.app_role() = 'admin');

drop policy if exists members_staff_read on public.members;
create policy members_staff_read on public.members for select to authenticated
  using (public.app_role() in ('staff', 'admin'));
drop policy if exists members_self_read on public.members;
create policy members_self_read on public.members for select to authenticated
  using (user_id = auth.uid());

drop policy if exists ledger_staff_read on public.ledger;
create policy ledger_staff_read on public.ledger for select to authenticated
  using (public.app_role() in ('staff', 'admin'));
drop policy if exists ledger_self_read on public.ledger;
create policy ledger_self_read on public.ledger for select to authenticated
  using (member_id in (select m.id from public.members m where m.user_id = auth.uid()));

drop policy if exists vouchers_staff_read on public.vouchers;
create policy vouchers_staff_read on public.vouchers for select to authenticated
  using (public.app_role() in ('staff', 'admin'));
drop policy if exists vouchers_self_read on public.vouchers;
create policy vouchers_self_read on public.vouchers for select to authenticated
  using (member_id in (select m.id from public.members m where m.user_id = auth.uid()));

-- Quyền thực thi hàm: thu hồi toàn bộ rồi cấp lại đúng chỗ
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.app_role(), public.norm_code(text), public.norm_phone(text), public.tier_for(int)
  to anon, authenticated;

grant execute on function
  public.register_member(text, text),
  public.earn_points(text, bigint, text),
  public.redeem_reward(text, text),
  public.use_voucher(text),
  public.adjust_points(text, int, text),
  public.void_earn(text, text),
  public.admin_update_member(text, text, text, text),
  public.admin_set_role(text, text),
  public.admin_list_accounts(),
  public.get_stats()
  to authenticated;

-- ---------------------------------------------------------------------
-- 5. REALTIME (thẻ thành viên cập nhật ngay khi Quầy cộng điểm)
-- ---------------------------------------------------------------------
do $$ begin alter publication supabase_realtime add table public.members;  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.ledger;   exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.vouchers; exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 6. SAU KHI CHẠY
--    a) Chạy 02_seed.sql để nạp dữ liệu mẫu.
--    b) Authentication → Providers → Email: BẬT; TẮT "Confirm email".
--    c) Tạo tài khoản Admin: Authentication → Users → Add user (email + mật khẩu), rồi chạy:
--         update public.profiles set role = 'admin'
--          where id = (select id from auth.users where email = 'ban@example.com');
--    d) Tạo thêm nhân viên: họ tự "Đăng ký tài khoản" trong app → Admin vào mục Nhân sự cấp quyền 'staff'.
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
