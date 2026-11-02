-- Wishlists Table for SianCard
create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

alter table public.wishlists enable row level security;

drop policy if exists "users manage own wishlist" on public.wishlists;
create policy "users manage own wishlist" on public.wishlists
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

