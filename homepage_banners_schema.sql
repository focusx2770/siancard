create table if not exists public.homepage_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  image_path text not null,
  target_url text,
  button_text text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists homepage_banners_active_order_idx
  on public.homepage_banners (is_active, sort_order, created_at desc);

alter table public.homepage_banners enable row level security;

drop policy if exists "Public can read active homepage banners" on public.homepage_banners;
create policy "Public can read active homepage banners"
on public.homepage_banners for select
using (is_active);

drop policy if exists "Admins can manage homepage banners" on public.homepage_banners;
create policy "Admins can manage homepage banners"
on public.homepage_banners for all
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'banner-images',
  'banner-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Public can view banner images" on storage.objects;
create policy "Public can view banner images"
on storage.objects for select
using (bucket_id = 'banner-images');

drop policy if exists "Admins can upload banner images" on storage.objects;
create policy "Admins can upload banner images"
on storage.objects for insert
with check (
  bucket_id = 'banner-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can update banner images" on storage.objects;
create policy "Admins can update banner images"
on storage.objects for update
using (
  bucket_id = 'banner-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  bucket_id = 'banner-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can delete banner images" on storage.objects;
create policy "Admins can delete banner images"
on storage.objects for delete
using (
  bucket_id = 'banner-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
