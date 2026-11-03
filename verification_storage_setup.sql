-- Run in Supabase SQL Editor to store identity documents in a private bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Users upload own KYC documents" on storage.objects;
create policy "Users upload own KYC documents"
on storage.objects for insert
with check (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Owners and admins read KYC documents" on storage.objects;
create policy "Owners and admins read KYC documents"
on storage.objects for select
using (
  bucket_id = 'kyc-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
);

drop policy if exists "Users delete own KYC documents" on storage.objects;
create policy "Users delete own KYC documents"
on storage.objects for delete
using (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
