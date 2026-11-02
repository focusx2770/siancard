-- ตารางคำขอยืนยันตัวตนผู้ขาย (Seller Verification Requests / KYC)
create table if not exists verification_requests (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles(id) on delete cascade,
  full_name          text not null,
  id_card_photo      text not null,
  selfie_photo       text not null,
  phone_number       text,
  bank_name          text,
  bank_account       text,
  account_name       text,
  facebook_url       text,
  terms_accepted     boolean not null default false,
  terms_accepted_at  timestamptz default now(),
  status             text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- เพิ่มคอลัมน์ในกรณีที่รันตารางเวอร์ชันเดิมไปแล้ว
alter table verification_requests add column if not exists bank_name text;
alter table verification_requests add column if not exists bank_account text;
alter table verification_requests add column if not exists account_name text;
alter table verification_requests add column if not exists facebook_url text;
alter table verification_requests add column if not exists terms_accepted boolean not null default false;
alter table verification_requests add column if not exists terms_accepted_at timestamptz default now();

create index if not exists verification_requests_user_idx on verification_requests(user_id);
create index if not exists verification_requests_status_idx on verification_requests(status);

-- RLS
alter table verification_requests enable row level security;

-- เจ้าของดูคำขอของตัวเองได้
drop policy if exists "user view own verification" on verification_requests;
create policy "user view own verification" on verification_requests
for select using (auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ผู้ใช้ส่งคำขอของตัวเองได้
drop policy if exists "user insert verification" on verification_requests;
create policy "user insert verification" on verification_requests
for insert with check (auth.uid() = user_id);

-- แอดมินอัปเดตสถานะ (approved / rejected) ได้
drop policy if exists "admin update verification" on verification_requests;
create policy "admin update verification" on verification_requests
for update using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
