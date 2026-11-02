-- SianCard (เซียนการ์ด) — Realtime In-App Chat Schema
-- รองรับระบบแชทสดระหว่างผู้ซื้อและผู้ขายผ่าน Supabase Realtime

-- 1. ตารางห้องแชท (Conversations)
create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid references listings(id) on delete set null,
  buyer_id    uuid not null references profiles(id) on delete cascade,
  seller_id   uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint conversations_participants_check check (buyer_id != seller_id)
);

create index if not exists conversations_buyer_idx on conversations(buyer_id);
create index if not exists conversations_seller_idx on conversations(seller_id);
create index if not exists conversations_listing_idx on conversations(listing_id);

-- 2. ตารางข้อความ (Messages)
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  content         text not null,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx on messages(conversation_id, created_at asc);

-- 3. Row Level Security (RLS)
alter table conversations enable row level security;
alter table messages enable row level security;

-- นโยบาย RLS สำหรับ Conversations
drop policy if exists "Users can view their conversations" on conversations;
create policy "Users can view their conversations"
  on conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Users can create conversations" on conversations;
create policy "Users can create conversations"
  on conversations for insert
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Users can update their conversations" on conversations;
create policy "Users can update their conversations"
  on conversations for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- นโยบาย RLS สำหรับ Messages
drop policy if exists "Users can view messages in their conversations" on messages;
create policy "Users can view messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "Users can insert messages in their conversations" on messages;
create policy "Users can insert messages in their conversations"
  on messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "Users can mark messages as read" on messages;
create policy "Users can mark messages as read"
  on messages for update
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- 4. เปิด Realtime สำหรับ Messages (ถ้ายังไม่ได้เปิด)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
exception when others then
  null;
end $$;

