create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);

-- Enable RLS
alter table public.settings enable row level security;

-- Allow read access to everyone
create policy "Allow public read access"
  on public.settings for select
  using (true);

-- Allow write access to authenticated users (admins) with a check, 
-- ideally specific admin check but for now auth users who can access admin panel
create policy "Allow authenticated update access"
  on public.settings for update
  using (auth.role() = 'authenticated');

create policy "Allow authenticated insert access"
  on public.settings for insert
  with check (auth.role() = 'authenticated');

-- Insert default values if not exists
insert into public.settings (key, value)
values 
  ('pagination_limit', '{"value": 20}'),
  ('site_theme', '{
    "colors": {
      "primary": "12 100% 62%",
      "secondary": "220 14% 96%",
      "background": "0 0% 98%",
      "foreground": "220 20% 10%",
      "card": "0 0% 100%",
      "cardForeground": "220 20% 10%",
      "accent": "173 80% 40%",
      "border": "220 13% 91%"
    },
    "radius": "1rem",
    "fonts": {
      "heading": "Inter, sans-serif",
      "body": "Inter, sans-serif"
    }
  }')
on conflict (key) do nothing;
