-- อนุญาตให้ผู้ใช้ที่ล็อกอินสามารถเพิ่มการ์ดใหม่ และชุดการ์ดใหม่ได้
-- (รันใน Supabase Dashboard -> SQL Editor)

drop policy if exists "auth users can insert cards" on cards;
create policy "auth users can insert cards" on cards for insert with check (auth.role() = 'authenticated');

drop policy if exists "auth users can insert card_sets" on card_sets;
create policy "auth users can insert card_sets" on card_sets for insert with check (auth.role() = 'authenticated');

