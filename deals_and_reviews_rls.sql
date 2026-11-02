-- ========================================================
-- SianCard: Security & RLS Policies for Deals & Reviews
-- เพื่อความปลอดภัยในการบันทึกดีลการซื้อขายและการให้รีวิว
-- ========================================================

alter table public.deals enable row level security;
alter table public.reviews enable row level security;

-- 1. Policies สำหรับ Reviews
-- ทุกคนอ่านรีวิวของผู้ขายได้แบบสาธารณะ
drop policy if exists "public read reviews" on public.reviews;
create policy "public read reviews" on public.reviews
  for select using (true);

-- เฉพาะผู้ซื้อตัวจริงใน Deal นั้นเท่านั้นที่สามารถเขียนรีวิวได้
drop policy if exists "buyer create review" on public.reviews;
create policy "buyer create review" on public.reviews
  for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.deals d
      where d.id = deal_id
        and d.buyer_id = auth.uid()
        and d.seller_id = seller_id
    )
  );

-- 2. Policies สำหรับ Deals
-- สมาชิกสามารถอ่านดีลที่ตนเองเกี่ยวข้องได้ (ไม่ว่าจะเป็นผู้ซื้อหรือผู้ขาย)
drop policy if exists "users read related deals" on public.deals;
create policy "users read related deals" on public.deals
  for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());

-- ผู้ขายสามารถสร้าง Record Deal เมื่อขายการ์ดสำเร็จ
drop policy if exists "seller create deal" on public.deals;
create policy "seller create deal" on public.deals
  for insert
  with check (seller_id = auth.uid());

