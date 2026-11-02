-- ==============================================================================
-- SianCard (เซียนการ์ด) — ตั้งค่า Supabase Storage สำหรับเก็บรูปถ่ายจริงของการ์ด
-- รันโค้ดนี้ใน Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. สร้าง Bucket 'card-images' (เปิด Public ให้อ่านได้ทุกคน)
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do update set public = true;

-- 2. สร้างสิทธิ์การเข้าถึง (Storage Policies)
-- ทุกคนสามารถดูรูปภาพได้ (Public Read)
drop policy if exists "Public Access for card-images" on storage.objects;
create policy "Public Access for card-images"
on storage.objects for select
using (bucket_id = 'card-images');

-- ผู้ใช้ที่ล็อกอินสามารถอัปโหลดรูปภาพได้ (Authenticated Upload)
drop policy if exists "Authenticated users can upload card-images" on storage.objects;
create policy "Authenticated users can upload card-images"
on storage.objects for insert
with check (
  bucket_id = 'card-images' and
  auth.role() = 'authenticated'
);

-- ผู้ใช้อัปเดตรูปของตัวเองได้
drop policy if exists "Users can update own card-images" on storage.objects;
create policy "Users can update own card-images"
on storage.objects for update
using (
  bucket_id = 'card-images' and
  auth.uid() = owner
);

-- ผู้ใช้ลบรูปของตัวเองได้
drop policy if exists "Users can delete own card-images" on storage.objects;
create policy "Users can delete own card-images"
on storage.objects for delete
using (
  bucket_id = 'card-images' and
  auth.uid() = owner
);

