-- ==============================================================================
-- SianCard (เซียนการ์ด) — ระบบรายงานคนโกง พร้อมแนบหลักฐาน (Reports & Blacklist Schema)
-- รันโค้ดนี้ใน Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. เพิ่มคอลัมน์เก็บหลักฐานและข้อมูลคนโกงในตาราง reports
alter table reports add column if not exists evidence_images text[] default '{}';
alter table reports add column if not exists scam_amount numeric(10,2);
alter table reports add column if not exists bank_name text;
alter table reports add column if not exists bank_account text;
alter table reports add column if not exists account_name text;
alter table reports add column if not exists admin_notes text;

-- 2. สร้างดัชนีเพื่อค้นหา Blacklist ได้อย่างรวดเร็ว
create index if not exists reports_reported_user_idx on reports(reported_user_id, status);
create index if not exists reports_bank_account_idx on reports(bank_account);

-- 3. อัปเดต RLS สำหรับตาราง reports
alter table reports enable row level security;

-- สิทธิ์สร้างรายงาน: ผู้ใช้ที่ล็อกอินสามารถส่งรายงานได้
drop policy if exists "user create report" on reports;
create policy "user create report" on reports
for insert with check (auth.uid() = reporter_id);

-- สิทธิ์ดูรายงาน: ผู้รายงานดูของตนเองได้ หรือดูรายงานที่แอดมินตัดสินแล้ว (เพื่อเป็น Blacklist สาธารณะ)
drop policy if exists "user read own report" on reports;
drop policy if exists "public read resolved reports or own" on reports;
create policy "public read resolved reports or own" on reports
for select using (
  auth.uid() = reporter_id or 
  status = 'resolved' or 
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- สิทธิ์แอดมิน: แก้ไขสถานะรายงาน (แบน / ยกฟ้อง)
drop policy if exists "admin update reports" on reports;
create policy "admin update reports" on reports
for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- 4. ตั้งค่าแอดมินคนแรก (สามารถระบุอีเมลของเจ้าของระบบเพื่อเป็นแอดมินได้)
-- ตัวอย่าง: update profiles set role = 'admin' where id = 'USER_UUID';

