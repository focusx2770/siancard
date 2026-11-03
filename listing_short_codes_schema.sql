alter table public.listings add column if not exists listing_code text;

create or replace function public.generate_listing_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  candidate text;
  i integer;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate || pg_catalog.substr(
        alphabet,
        pg_catalog.floor(pg_catalog.random() * pg_catalog.length(alphabet))::integer + 1,
        1
      );
    end loop;
    if not exists (select 1 from public.listings where listing_code = candidate) then
      return candidate;
    end if;
  end loop;
end;
$$;

update public.listings
set listing_code = public.generate_listing_code()
where listing_code is null;

alter table public.listings
  alter column listing_code set default public.generate_listing_code(),
  alter column listing_code set not null;

create unique index if not exists listings_listing_code_uidx
  on public.listings (listing_code);
