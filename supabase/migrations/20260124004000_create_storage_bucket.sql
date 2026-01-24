
-- Create a new storage bucket for event images
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

-- Policy: Allow public access to view images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'event-images' );

-- Policy: Allow authenticated users to upload images
create policy "Authenticated Export"
  on storage.objects for insert
  with check ( bucket_id = 'event-images' and auth.role() = 'authenticated' );

-- Policy: Allow authenticated users to update/delete their images (or all for admin)
create policy "Authenticated Update"
  on storage.objects for update
  using ( bucket_id = 'event-images' and auth.role() = 'authenticated' );

create policy "Authenticated Delete"
  on storage.objects for delete
  using ( bucket_id = 'event-images' and auth.role() = 'authenticated' );
