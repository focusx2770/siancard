-- SianCard (เซียนการ์ด) — Schema for Postgres / Supabase
-- อัปเดตให้รองรับการรันซ้ำได้ 100% (Idempotent / No Conflict)
-- รวมทั้งเชื่อมต่อข้อมูล User Profiles เข้ากับระบบ Auth อย่างสมบูรณ์

create extension if not exists "pgcrypto";

-- ───────────────────────── Enums (ข้ามหากมีอยู่แล้ว) ─────────────────────────
do $$ begin
  create type card_condition as enum ('NM', 'LP', 'MP', 'HP', 'DMG');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type listing_status as enum ('active', 'reserved', 'sold', 'closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null;
end $$;

-- ───────────────────────── Users ─────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  avatar_url    text,
  line_id       text,              -- contact channel shown only if seller allows
  contact_email text,
  show_contact  boolean not null default false,
  role          user_role not null default 'user',
  is_banned     boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ───────────────────── Card database ─────────────────────
create table if not exists games (
  id    serial primary key,
  slug  text unique not null,      -- e.g. 'pokemon', 'onepiece', 'yugioh'
  name  text not null
);

create table if not exists card_sets (
  id           serial primary key,
  game_id      int not null references games(id),
  code         text not null,      -- set code printed on the card
  name         text not null,
  release_date date,
  unique (game_id, code)
);

create table if not exists cards (
  id           uuid primary key default gen_random_uuid(),
  game_id      int not null references games(id),
  set_id       int references card_sets(id),
  card_number  text,               -- number within the set
  name         text not null,
  rarity       text,
  language     text not null default 'EN',   -- EN / TH / JP ...
  is_foil      boolean not null default false,
  image_url    text,
  extra        jsonb not null default '{}'::jsonb,  -- game-specific fields
  created_at   timestamptz not null default now()
);

create index if not exists cards_name_idx  on cards using gin (to_tsvector('simple', name));
create index if not exists cards_lookup_idx on cards (game_id, set_id, card_number);

-- ───────────────────────── Listings ─────────────────────────
create table if not exists listings (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references profiles(id) on delete cascade,
  card_id     uuid not null references cards(id),
  condition   card_condition not null,
  price_thb   numeric(10,2) not null check (price_thb > 0),
  quantity    int not null default 1 check (quantity > 0),
  description text,
  status      listing_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists listings_card_idx   on listings (card_id, status, price_thb);
create index if not exists listings_seller_idx on listings (seller_id, status);

create table if not exists listing_images (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  image_url   text not null,       -- real photo of the actual card
  sort_order  int not null default 0
);

-- ───────────────────────── Reports ─────────────────────────
create table if not exists reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_id         uuid not null references profiles(id) on delete cascade,
  reported_user_id    uuid references profiles(id) on delete set null,
  reported_listing_id uuid references listings(id) on delete set null,
  reason              text not null,
  status              report_status not null default 'open',
  created_at          timestamptz not null default now(),
  check (reported_user_id is not null or reported_listing_id is not null)
);

-- ───────────────────────── Deals & reviews ─────────────────────────
create table if not exists deals (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id),
  card_id     uuid not null references cards(id),
  seller_id   uuid not null references profiles(id),
  buyer_id    uuid not null references profiles(id),
  condition   card_condition not null,
  price_thb   numeric(10,2) not null,
  completed_at timestamptz not null default now(),
  check (seller_id <> buyer_id)
);

create index if not exists deals_card_idx on deals (card_id, condition, completed_at desc);

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null unique references deals(id) on delete cascade,
  reviewer_id uuid not null references profiles(id),
  seller_id   uuid not null references profiles(id),
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

-- Median price per card + condition from recent deals (ราคากลาง)
create or replace view card_price_stats as
select card_id,
       condition,
       count(*)                                                   as deal_count,
       percentile_cont(0.5) within group (order by price_thb)     as median_price,
       min(price_thb)                                             as min_price,
       max(price_thb)                                             as max_price
from deals
where completed_at > now() - interval '90 days'
group by card_id, condition;

-- ───────────────────────── Row Level Security (RLS) ─────────────────────────
alter table profiles       enable row level security;
alter table listings       enable row level security;
alter table listing_images enable row level security;
alter table reports        enable row level security;
alter table games          enable row level security;
alter table card_sets      enable row level security;
alter table cards          enable row level security;

-- Games, Card sets, Cards (Public Read)
drop policy if exists "public read games" on games;
create policy "public read games" on games for select using (true);

drop policy if exists "public read card_sets" on card_sets;
create policy "public read card_sets" on card_sets for select using (true);

drop policy if exists "public read cards" on cards;
create policy "public read cards" on cards for select using (true);

-- Profiles
drop policy if exists "public read profiles" on profiles;
create policy "public read profiles" on profiles for select using (true);

drop policy if exists "owner insert profile" on profiles;
create policy "owner insert profile" on profiles for insert with check (auth.uid() = id);

drop policy if exists "owner update profile" on profiles;
create policy "owner update profile" on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = 'user' and is_banned = false);

-- Listings
drop policy if exists "public read listings" on listings;
create policy "public read listings" on listings for select
  using (status <> 'closed' or seller_id = auth.uid());

drop policy if exists "seller insert listing" on listings;
create policy "seller insert listing" on listings for insert
  with check (seller_id = auth.uid()
              and not exists (select 1 from profiles p where p.id = auth.uid() and p.is_banned));

drop policy if exists "seller update listing" on listings;
create policy "seller update listing" on listings for update using (seller_id = auth.uid());

drop policy if exists "seller delete listing" on listings;
create policy "seller delete listing" on listings for delete using (seller_id = auth.uid());

-- Listing Images
drop policy if exists "public read images" on listing_images;
create policy "public read images" on listing_images for select using (true);

drop policy if exists "seller manage images" on listing_images;
create policy "seller manage images" on listing_images for all
  using (exists (select 1 from listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from listings l where l.id = listing_id and l.seller_id = auth.uid()));

-- Reports
drop policy if exists "user create report" on reports;
create policy "user create report" on reports for insert with check (reporter_id = auth.uid());

drop policy if exists "user read own report" on reports;
create policy "user read own report" on reports for select using (reporter_id = auth.uid());

-- ───────────────────────── Auto Profile Creation Trigger ─────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, line_id, contact_email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'line_id',
    new.email
  )
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, profiles.display_name),
    line_id = coalesce(excluded.line_id, profiles.line_id),
    contact_email = coalesce(excluded.contact_email, profiles.contact_email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

