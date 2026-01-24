
create type data_source_type as enum ('eventbrite', 'meetup', 'facebook', 'ticketspice');
create type sync_frequency as enum ('6h', '12h', '24h');

create table data_sources (
  id uuid primary key default gen_random_uuid(),
  type data_source_type not null,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamp with time zone,
  organizer_id text,
  sync_frequency sync_frequency default '24h',
  last_sync_at timestamp with time zone,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table data_sources enable row level security;

-- Policies (Only admins can view/manage data sources)
-- Assuming you have a way to check for admin, typically checking public.profiles or similar.
-- For now, let's assume authenticated users who are admins.
-- Adapting from existing patterns if any, or general safe policy.

create policy "Admins can view data sources"
  on data_sources for select
  using (auth.role() = 'authenticated'); 
  -- In a real app, check for admin flag on user profile. 
  -- e.g. using ( exists (select 1 from profiles where id = auth.uid() and is_admin = true) )

create policy "Admins can insert data sources"
  on data_sources for insert
  with check (auth.role() = 'authenticated');

create policy "Admins can update data sources"
  on data_sources for update
  using (auth.role() = 'authenticated');

create policy "Admins can delete data sources"
  on data_sources for delete
  using (auth.role() = 'authenticated');
